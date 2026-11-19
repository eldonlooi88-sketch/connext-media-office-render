const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');
const XAI_API_KEY = process.env.XAI_API_KEY || '';
const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK || '';

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { bots: [], projects: [], events: [], stages: [] }; }
}

const defaultBots = [
  { id: 'eldon', name: 'Eldon', role: '老板', dept: '管理层', color: '#c9a24a', seat: 'boss', status: 'idle', task: '' },
  { id: 'grok', name: 'Grok', role: 'COO · 调度', dept: '管理层', color: '#1f6feb', seat: 'coo', status: 'working', task: '调度团队' },
  { id: 'artdir', name: '美术总监', role: '美术总监', dept: '美术部', color: '#d6336c', seat: 'artdir', status: 'idle', task: '' },
  { id: 'research-1', name: '调查员 A', role: '商品调查员', dept: '商品调查部', color: '#2fb380', seat: 'desk:0', status: 'idle', task: '' },
  { id: 'research-2', name: '调查员 B', role: '商品调查员', dept: '商品调查部', color: '#20a39e', seat: 'desk:1', status: 'idle', task: '' },
  { id: 'research-3', name: '调查员 C', role: '商品调查员', dept: '商品调查部', color: '#4caf50', seat: 'desk:2', status: 'idle', task: '' },
  { id: 'research-4', name: '调查员 D', role: '商品调查员', dept: '商品调查部', color: '#7cb342', seat: 'desk:3', status: 'idle', task: '' },
  { id: 'research-5', name: '调查员 E', role: '商品调查员', dept: '商品调查部', color: '#00a884', seat: 'desk:4', status: 'idle', task: '' },
  { id: 'research-6', name: '调查员 F', role: '商品调查员', dept: '商品调查部', color: '#3fa36b', seat: 'desk:5', status: 'idle', task: '' },
  { id: 'script-1', name: '脚本员 1', role: '剧本脚本', dept: '脚本部', color: '#f08c00', seat: 'desk:6', status: 'idle', task: '' },
  { id: 'script-2', name: '脚本员 2', role: '剧本脚本', dept: '脚本部', color: '#e8590c', seat: 'desk:7', status: 'idle', task: '' },
  { id: 'designer', name: '设计师', role: '设计师', dept: '设计部', color: '#ae3ec9', seat: 'desk:8', status: 'idle', task: '' },
  { id: 'videogen', name: '影片生成师', role: 'AI 影片生成', dept: '影片部', color: '#e03131', seat: 'desk:9', status: 'idle', task: '' },
  { id: 'editor', name: '影片剪辑师', role: '影片剪辑', dept: '影片部', color: '#f76707', seat: 'desk:10', status: 'idle', task: '' },
  { id: 'copy', name: '写文案专员', role: '文案', dept: '文案部', color: '#1098ad', seat: 'desk:11', status: 'idle', task: '' },
  { id: 'judge', name: '法官 Claude', role: '法官 · 写判决书', dept: '法庭', color: '#212529', seat: 'judge', status: 'idle', task: '' },
  { id: 'prosecutor', name: '检察官 Claude', role: '找出失败的最强理由', dept: '法庭', color: '#c92a2a', seat: 'prosecutor', status: 'idle', task: '' },
  { id: 'defense', name: '辩护律师 Claude', role: '找出成功的最强理由', dept: '法庭', color: '#2b8a3e', seat: 'defense', status: 'idle', task: '' }
];

const SYSTEM_PROMPT = `你是 Connext Media 的 COO Grok，负责调度整个 AI 带货影片团队。老板是 Eldon。用中文简洁、专业地回答。

【重要：当前真实能力，必须遵守，禁止编造】
1. 目前「不能」真正生成影片。系统还没有接上影片生成 API。
2. 目前「没有」接钉钉。没有钉钉机器人、没有发群功能。
3. 当老板要求生成影片、发钉钉、上传成片时，必须明确说明：
   - 影片生成：还没接入，目前只能在演示模式里模拟流程，或先写脚本/分镜/文案。
   - 钉钉：还没配置 Webhook，无法真正发消息到钉钉群。
4. 绝对不要说「已经生成」「已经发到钉钉」「正在渲染中」等虚假完成状态。
5. 可以帮忙：安排工作、写脚本大纲、文案、分镜建议、流程说明、审核建议。
6. 团队流程（概念）：商品调查 → 脚本 → 设计 → 美术审核 → 法庭 → 影片生成 → 剪辑 → 文案 → 终审 → 老板。其中影片生成与钉钉通知尚未上线。`;

async function sendDingTalk(text) {
  if (!DINGTALK_WEBHOOK) return { ok: false, error: '未配置 DINGTALK_WEBHOOK' };
  try {
    const r = await fetch(DINGTALK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content: text }
      })
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.errcode === 0, result: j };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

app.get('/api/state', (req, res) => {
  const data = loadData();
  res.json({
    bots: (data.bots && data.bots.length) ? data.bots : defaultBots,
    projects: data.projects || [],
    events: data.events || [],
    stages: data.stages || [],
    btc: { usd: 95000, change24h: 1.2, history: [] },
    chat: !!XAI_API_KEY,
    dingtalk: !!DINGTALK_WEBHOOK
  });
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = () => res.write('event: state\ndata: ' + JSON.stringify({ bots: defaultBots }) + '\n\n');
  send();
  const t = setInterval(send, 10000);
  req.on('close', () => clearInterval(t));
});

app.post('/api/chat', async (req, res) => {
  if (!XAI_API_KEY) {
    return res.status(400).json({ reply: '服务器未配置 XAI_API_KEY，请到 Render 环境变量里添加。' });
  }
  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ reply: '请输入消息。' });
  }

  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + XAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10)
        ],
        temperature: 0.5,
        max_tokens: 800
      })
    });
    const j = await r.json();
    if (!r.ok) {
      const errMsg = (j.error && (j.error.message || j.error)) || ('API 错误 ' + r.status);
      return res.json({ reply: '调用失败：' + errMsg });
    }
    const reply = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '暂时无法回复';
    res.json({ reply });
  } catch (e) {
    res.json({ reply: '网络错误：' + (e.message || String(e)) });
  }
});

// 钉钉测试 / 通知接口
app.post('/api/dingtalk', async (req, res) => {
  const text = (req.body && req.body.text) || 'Connext Media 办公室测试消息';
  const result = await sendDingTalk('[Connext Media] ' + text);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server on', PORT, 'key:', !!XAI_API_KEY, 'dingtalk:', !!DINGTALK_WEBHOOK));

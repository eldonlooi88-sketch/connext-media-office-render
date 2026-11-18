const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');
const XAI_API_KEY = process.env.XAI_API_KEY || '';

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { bots: [], projects: [], events: [], stages: [] }; }
}
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

app.get('/api/state', (req, res) => {
  const data = loadData();
  // Fallback roster if empty
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
  res.json({
    bots: (data.bots && data.bots.length) ? data.bots : defaultBots,
    projects: data.projects || [],
    events: data.events || [],
    stages: data.stages || [],
    btc: { usd: 95000, change24h: 1.2, history: [] },
    chat: !!XAI_API_KEY
  });
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = () => res.write(`event: state\ndata: ${JSON.stringify(loadData())}\n\n`);
  send();
  const t = setInterval(send, 5000);
  req.on('close', () => clearInterval(t));
});

app.post('/api/chat', async (req, res) => {
  if (!XAI_API_KEY) return res.status(400).json({ error: 'XAI_API_KEY not set' });
  const { bot, messages } = req.body;
  if (!bot || !messages) return res.status(400).json({ error: 'Missing bot or messages' });

  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: `你是 Connext Media AI 办公室的成员，正在和老板 Eldon 对话。保持简洁、专业、有帮助。` },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    const j = await r.json();
    const reply = j.choices?.[0]?.message?.content || '暂时无法回复';
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

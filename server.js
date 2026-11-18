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
  res.json({
    bots: data.bots || [],
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

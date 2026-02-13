/**
 * XPatla Bot - Admin Panel
 * Basit web panel: canli loglar + istatistikler
 */

const express = require('express');
const path = require('path');
const logger = require('./logger');
const userDao = require('../db/dao/userDao');
const historyDao = require('../db/dao/historyDao');
const statsDao = require('../db/dao/statsDao');

const PANEL_PORT = parseInt(process.env.PANEL_PORT || '3737', 10);
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'xpatla2025';

function start() {
    const app = express();

    // Basic auth middleware
    app.use((req, res, next) => {
        // SSE ve static icin auth header veya query param
        const authHeader = req.headers.authorization;
        const queryPass = req.query.pass;

        if (queryPass === PANEL_PASSWORD) return next();

        if (authHeader) {
            const encoded = authHeader.split(' ')[1] || '';
            const decoded = Buffer.from(encoded, 'base64').toString();
            const [, pass] = decoded.split(':');
            if (pass === PANEL_PASSWORD) return next();
        }

        res.setHeader('WWW-Authenticate', 'Basic realm="XPatla Panel"');
        res.status(401).send('Unauthorized');
    });

    // API: istatistikler
    app.get('/api/stats', (_req, res) => {
        try {
            const users = userDao.getAllUsers();
            const activeUsers = users.filter(u => !u.is_banned);
            const usersWithKey = users.filter(u => u.xpatla_api_key);

            let totalTweets = 0;
            let totalFavorites = 0;
            for (const u of activeUsers) {
                const count = historyDao.getCount(u.telegram_id);
                const favs = historyDao.getFavorites(u.telegram_id);
                totalTweets += count;
                totalFavorites += favs.length;
            }

            const userList = activeUsers.map(u => {
                const stats = statsDao.getStats(u.telegram_id);
                return {
                    name: u.username || u.first_name || String(u.telegram_id),
                    role: u.role,
                    hasKey: !!u.xpatla_api_key,
                    tweets: stats.session_tweets || 0,
                    threads: stats.session_threads || 0,
                    xp: stats.total_xp || 0
                };
            });

            res.json({
                totalUsers: activeUsers.length,
                usersWithKey: usersWithKey.length,
                totalTweets,
                totalFavorites,
                users: userList
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // API: log buffer (ilk yuklemede)
    app.get('/api/logs', (_req, res) => {
        res.json(logger.getBuffer());
    });

    // SSE: canli log stream
    app.get('/api/logs/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        logger.addClient(res);
    });

    // Ana sayfa
    app.get('/', (_req, res) => {
        res.send(getHtml());
    });

    app.listen(PANEL_PORT, () => {
        console.log(`Panel aktif: http://localhost:${PANEL_PORT}`);
    });
}

function getHtml() {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>XPatla Bot Panel</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0d1117; color:#c9d1d9; font-family:'Consolas','Monaco',monospace; font-size:14px; }
.header { background:#161b22; padding:16px 24px; border-bottom:1px solid #30363d; display:flex; justify-content:space-between; align-items:center; }
.header h1 { font-size:18px; color:#58a6ff; }
.header .status { color:#3fb950; font-size:12px; }
.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; padding:16px 24px; }
.stat-card { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; text-align:center; }
.stat-card .value { font-size:28px; font-weight:bold; color:#58a6ff; }
.stat-card .label { font-size:11px; color:#8b949e; margin-top:4px; text-transform:uppercase; }
.users-section { padding:0 24px 12px; }
.users-section h3 { color:#8b949e; font-size:12px; margin-bottom:8px; text-transform:uppercase; }
.user-row { display:flex; gap:16px; padding:6px 12px; background:#161b22; border-radius:4px; margin-bottom:4px; font-size:12px; }
.user-row .name { color:#58a6ff; min-width:120px; }
.user-row .badge { color:#3fb950; }
.user-row .no-key { color:#f85149; }
.log-container { padding:0 24px 24px; }
.log-container h3 { color:#8b949e; font-size:12px; margin-bottom:8px; text-transform:uppercase; display:flex; justify-content:space-between; }
.log-container h3 button { background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:2px 8px; cursor:pointer; font-size:11px; }
#logs { background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:12px; height:50vh; overflow-y:auto; }
.log-line { padding:2px 0; white-space:pre-wrap; word-break:break-all; }
.log-line .time { color:#484f58; }
.log-line.error { color:#f85149; }
.log-line.info .msg-in { color:#d2a8ff; }
.log-line.info .msg-out { color:#3fb950; }
.log-line.info .msg-sys { color:#8b949e; }
</style>
</head>
<body>
<div class="header">
  <h1>XPatla Bot Panel</h1>
  <div class="status" id="status">Baglaniyor...</div>
</div>
<div class="stats" id="stats"></div>
<div class="users-section"><h3>Kullanicilar</h3><div id="users"></div></div>
<div class="log-container">
  <h3>Canli Loglar <button onclick="clearLogs()">Temizle</button></h3>
  <div id="logs"></div>
</div>
<script>
const logsEl = document.getElementById('logs');
const statsEl = document.getElementById('stats');
const usersEl = document.getElementById('users');
const statusEl = document.getElementById('status');
let autoScroll = true;

logsEl.addEventListener('scroll', () => {
  autoScroll = logsEl.scrollTop + logsEl.clientHeight >= logsEl.scrollHeight - 30;
});

function addLogLine(entry) {
  const div = document.createElement('div');
  div.className = 'log-line ' + entry.level;
  const t = new Date(entry.time).toLocaleTimeString('tr-TR');
  let msgClass = 'msg-sys';
  if (entry.message.includes('>>> [GELEN]')) msgClass = 'msg-in';
  else if (entry.message.includes('<<< [')) msgClass = 'msg-out';
  div.innerHTML = '<span class="time">' + t + '</span> <span class="' + msgClass + '">' + escHtml(entry.message) + '</span>';
  logsEl.appendChild(div);
  if (autoScroll) logsEl.scrollTop = logsEl.scrollHeight;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function clearLogs() { logsEl.innerHTML = ''; }

function renderStats(data) {
  statsEl.innerHTML = [
    {v: data.totalUsers, l: 'Kullanici'},
    {v: data.usersWithKey, l: 'API Key Var'},
    {v: data.totalTweets, l: 'Toplam Tweet'},
    {v: data.totalFavorites, l: 'Favori'}
  ].map(s => '<div class="stat-card"><div class="value">'+s.v+'</div><div class="label">'+s.l+'</div></div>').join('');

  usersEl.innerHTML = data.users.map(u =>
    '<div class="user-row"><span class="name">' + (u.role==='admin'?'👑 ':'') + escHtml(u.name) + '</span>' +
    '<span class="' + (u.hasKey?'badge':'no-key') + '">' + (u.hasKey?'🔑 Key var':'⚠️ Key yok') + '</span>' +
    '<span>Tweet: '+u.tweets+'</span><span>Thread: '+u.threads+'</span><span>XP: '+u.xp+'</span></div>'
  ).join('');
}

// Ilk yukleme
fetch('/api/logs').then(r=>r.json()).then(logs => {
  logs.forEach(addLogLine);
});
fetch('/api/stats').then(r=>r.json()).then(renderStats);
setInterval(() => fetch('/api/stats').then(r=>r.json()).then(renderStats), 15000);

// SSE canli stream
const es = new EventSource('/api/logs/stream');
es.onmessage = (e) => {
  const entry = JSON.parse(e.data);
  addLogLine(entry);
};
es.onopen = () => { statusEl.textContent = 'Canli'; statusEl.style.color = '#3fb950'; };
es.onerror = () => { statusEl.textContent = 'Baglanti kesildi'; statusEl.style.color = '#f85149'; };
</script>
</body>
</html>`;
}

module.exports = { start };

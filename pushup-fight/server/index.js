'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const PuHub = require('./pushup-hub');

const PAGE = path.join(__dirname, '..', 'index.html');
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/' || url === '/index.html' || url === '/client/pushup.html') {
    fs.readFile(PAGE, (err, buf) => {
      if (err) { res.writeHead(500); return res.end('index.html missing'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    });
  } else if (url === '/healthz') {
    res.writeHead(200); res.end('ok');
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

const wss = new WebSocketServer({ server });
wss.on('connection', ws => {
  const p = { ws };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', data => {
    let m;
    try { m = JSON.parse(data.toString()); } catch (e) { return; }
    PuHub.handle(p, m);
  });
  ws.on('close', () => PuHub.disconnect(p));
  ws.on('error', () => {});
});
// keep connections alive through Render's proxy and drop dead ones
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; try { ws.ping(); } catch (e) {}
  });
}, 25000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Pushup Fight on port ' + PORT));

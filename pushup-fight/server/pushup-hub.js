'use strict';
/* server/pushup-hub.js  -  relay for client/pushup.html.  Hook it up in server/index.js:
     const PuHub = require('./pushup-hub');
     in ws.on('message') after JSON.parse succeeded:   if (PuHub.handle(p, m)) return;
     in ws.on('close'):                                 PuHub.disconnect(p);
   `p` is the per-connection object index.js already creates ({ ws, ... }); the hub only adds p.puId / p.puRoom. */
const rooms = new Map();                 // code -> { code, host, members:Set, info, open, q }
const queues = { duel: [], sumo: [] };
let nid = 1;
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const makeCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; if (!rooms.has(c)) return c; } };
const cleanInfo = i => { i = i || {}; return { mode: i.mode === 'sumo' ? 'sumo' : 'duel', name: String(i.name || 'Host').replace(/[<>&"']/g, '').slice(0, 12), n: Math.min(8, +i.n || 1), max: Math.max(2, Math.min(8, +i.max || 2)) }; };
function unq(p) { for (const k in queues) { const i = queues[k].indexOf(p); if (i >= 0) queues[k].splice(i, 1); } }
function leave(p) {
  const r = p.puRoom; if (!r) return; p.puRoom = null; r.members.delete(p);
  if (p === r.host) { r.members.forEach(m => { m.puRoom = null; send(m.ws, { t: 'pu_closed', code: r.code }); }); rooms.delete(r.code); }
  else r.members.forEach(m => send(m.ws, { t: 'pu_left', id: p.puId }));
}
function makeRoom(host, info, isQueue) { const r = { code: makeCode(), host, members: new Set([host]), info: cleanInfo(info), open: !isQueue, q: !!isQueue }; rooms.set(r.code, r); host.puRoom = r; return r; }
function handle(p, m) {
  if (!m || typeof m.t !== 'string' || m.t.slice(0, 3) !== 'pu_') return false;
  if (!p.puId) p.puId = 'p' + (nid++);
  const id = p.puId;
  switch (m.t) {
    case 'pu_queue': {
      unq(p); leave(p); const mode = m.mode === 'sumo' ? 'sumo' : 'duel', q = queues[mode];
      const o = q.find(x => x !== p && x.ws.readyState === 1);
      if (o) {
        q.splice(q.indexOf(o), 1); const r = makeRoom(o, { mode, name: 'queue' }, true); r.members.add(p); p.puRoom = r;
        send(o.ws, { t: 'pu_matched', code: r.code, host: o.puId, you: o.puId });
        send(p.ws, { t: 'pu_matched', code: r.code, host: o.puId, you: id });
      } else { q.push(p); send(p.ws, { t: 'pu_searching', you: id }); }
      break;
    }
    case 'pu_unqueue': unq(p); break;
    case 'pu_create': { unq(p); leave(p); const r = makeRoom(p, m.info, false); send(p.ws, { t: 'pu_created', code: r.code, you: id }); break; }
    case 'pu_list': send(p.ws, { t: 'pu_rooms', rooms: [...rooms.values()].filter(r => r.open && !r.q).map(r => ({ code: r.code, info: r.info, n: r.members.size })) }); break;
    case 'pu_info': { const r = p.puRoom; if (r && r.host === p && !r.q) { r.info = cleanInfo(m.info); r.open = m.open !== false; } break; }
    case 'pu_join': {
      unq(p); leave(p); const r = rooms.get(String(m.code || '').toUpperCase().slice(0, 4));
      if (!r || !r.open || r.members.size >= r.info.max) { send(p.ws, { t: 'pu_err', msg: 'Room not found or full' }); break; }
      r.members.add(p); p.puRoom = r; send(p.ws, { t: 'pu_joined', code: r.code, host: r.host.puId, you: id }); break;
    }
    case 'pu_leave': unq(p); leave(p); break;
    case 'pu_rm': {
      const r = p.puRoom; if (!r || !m.msg) break; if (JSON.stringify(m.msg).length > 6000) break;
      r.members.forEach(x => { if (x !== p && (!m.to || x.puId === m.to)) send(x.ws, { t: 'pu_rm', from: id, msg: m.msg }); });
      break;
    }
  }
  return true;
}
function disconnect(p) { unq(p); leave(p); }
module.exports = { handle, disconnect };

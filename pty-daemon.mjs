#!/usr/bin/env node
// pty-daemon.mjs — persistent PTY host (tmux-like detach/attach semantics).
// - Owns the 5 agent PTYs in THIS process, independent from hud-web.mjs.
// - Browser refresh = WS reconnect = re-attach + scrollback replay. Nothing lost.
// - Restarting hud-web.mjs does NOT kill PTYs (AI CLI keeps running).
// - Each session also appends to ~/.gemini/antigravity-cli/pty-logs/<id>.log
// Protocol over unix socket /tmp/deerflow-pty.sock:
//   attach:  {"action":"attach","session_id":"ai-coder","cols":80,"rows":24}\n then raw bytes both ways.
//            Client->daemon messages starting with {"type":"resize" are treated as resize, not typed.
//   rpc:     {"action":"start_all"|"send"|"broadcast"|"capture"|"list", ...}\n -> one JSON line reply, close.
// Keep AGENTS in sync with hud-web.mjs.
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pty from 'node-pty';
import { DatabaseSync } from 'node:sqlite';

const SOCKET = '/tmp/deerflow-pty.sock';
const LOG_DIR = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'pty-logs');
const SHELL = process.env.SHELL || '/bin/zsh';
const WORKSPACE_DIR = process.env.DEERFLOW_CWD || process.cwd();
const HISTORY_LIMIT = 256 * 1024;
const REPLAY_CHARS = 64 * 1024;

const AGENTS = [
  { id: 'agy-leader', title: '0: SUPERAGENT', role: 'Lead Orchestrator: รับงาน แตก goal แล้วสั่งงานห้องอื่น ห้ามลงมือเขียนโค้ดเอง' },
  { id: 'ai-research', title: '1: DEEP RESEARCH', role: 'Researcher: ค้นโค้ด+เว็บ สรุปสเปกส่งให้ 2: SANDBOX CODER' },
  { id: 'ai-coder', title: '2: SANDBOX CODER', role: 'Implementer: เขียนโค้ดตามสเปก รายงานผลกลับ 0: SUPERAGENT' },
  { id: 'ai-qa', title: '3: ARTIFACT CREATOR', role: 'QA/Docs: ทำ docs+test ส่งให้ 4: MEMORY VERIFIER ตรวจ' },
  { id: 'ai-reviewer', title: '4: MEMORY VERIFIER', role: 'Auditor: ตรวจ policy/คุณภาพ สั่ง rework กลับ 2: SANDBOX CODER' }
];

const sessions = new Map(); // id -> { pty, history, clients:Set, log, dead }

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}

function logPath(id) {
  return path.join(LOG_DIR, id + '.log');
}

function trimLogFile(id) {
  try {
    const p = logPath(id);
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.size > 512 * 1024) {
      const tail = fs.readFileSync(p, 'utf8').slice(-256 * 1024);
      fs.writeFileSync(p, tail, 'utf8');
    }
  } catch {}
}

function getOrCreate(id, cols = 80, rows = 24) {
  const existing = sessions.get(id);
  if (existing && !existing.dead) {
    try { existing.pty.resize(cols, rows); } catch {}
    return existing;
  }
  const meta = AGENTS.find((a) => a.id === id) || { title: id, role: '' };
  trimLogFile(id);
  const log = fs.createWriteStream(logPath(id), { flags: 'a' });
  const proc = pty.spawn(SHELL, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: WORKSPACE_DIR,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PATH: NOVIN_BIN + ':' + (process.env.PATH || ''),
      EDITOR: 'true',
      VISUAL: 'true',
      GIT_EDITOR: 'true',
      SUDO_EDITOR: 'true',
      AGENT_ID: id,
      AGENT_TITLE: meta.title,
      AGENT_ROLE: meta.role
    }
  });
  const sess = { id, pty: proc, history: '', clients: new Set(), log, dead: false, lastActive: Date.now(), lastLine: '', bornAt: Date.now(), _tail: '', pasteReady: false };
  proc.write('\r\n' + commentLines('[DEERFLOW] You are ' + meta.title + ' (' + id + '). Mission: ' + meta.role + '\n[DEERFLOW] Squad: 0:SUPERAGENT(agy-leader) 1:RESEARCH(ai-research) 2:CODER(ai-coder) 3:QA(ai-qa) 4:REVIEWER(ai-reviewer).\n[BOOTCAMP] Read first: cat SQUAD.md\n[TALK] node squad.mjs send <target-id> <text> | node squad.mjs task <target-id> <text> | node squad.mjs ack <task-id> <result>\n[LISTEN] node squad.mjs listen = realtime, stays on. inbox: node squad.mjs inbox | goal: node squad.mjs goal\n[LESSON] Talk protocol: cat SQUAD-TALK.md')); 
  proc.onData((data) => {
    sess.history += data;
    if (sess.history.length > HISTORY_LIMIT) sess.history = sess.history.slice(-HISTORY_LIMIT);
    sess.lastActive = Date.now();
    sess._tail = (sess._tail + String(data)).slice(-16);
    {
      const hi = sess._tail.lastIndexOf('?2004h');
      const li = sess._tail.lastIndexOf('?2004l');
      if (hi >= 0 || li >= 0) sess.pasteReady = hi > li;
    }
    try {
      const lines = String(data).replace(/\x1b\][^\x07]*\x07/g, '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').split(/\r?\n/);
      for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (t) { sess.lastLine = t.slice(-140); break; }
      }
    } catch {}
    try { sess.log.write(data); } catch {}
    for (const sock of [...sess.clients]) {
      try { sock.write(data); } catch { sess.clients.delete(sock); }
    }
  });
  proc.onExit(() => {
    sess.dead = true;
    try { sess.log.end(); } catch {}
    for (const sock of [...sess.clients]) { try { sock.end(); } catch {} }
    sessions.delete(id);
  });
  sessions.set(id, sess);
  return sess;
}

function handleAttach(sock, req, rest) {
  const id = req.session_id || 'agy-leader';
  const sess = getOrCreate(id, req.cols || 80, req.rows || 24);
  sess.clients.add(sock);
  try {
    if (sess.history) sock.write(sess.history.slice(-REPLAY_CHARS));
  } catch {}
  if (rest && rest.length) handleStreamData(sess, rest);
  const onData = (chunk) => handleStreamData(sess, chunk);
  const onClose = () => { sess.clients.delete(sock); };
  sock.on('data', onData);
  sock.on('close', onClose);
  sock.on('error', onClose);
}

function handleStreamData(sess, chunk) {
  // Resize control messages can arrive coalesced in one chunk ("{}{}") — extract every
  // complete one, apply it, and only type the remainder into the PTY. Rest passes raw.
  const str = chunk.toString('utf8');
  const re = /\{"type":"resize"[^}]*\}/g;
  let m = null;
  let found = false;
  let cleaned = str;
  while ((m = re.exec(str)) !== null) {
    found = true;
    try {
      const msg = JSON.parse(m[0]);
      sess.pty.resize(msg.cols || 80, msg.rows || 24);
    } catch {}
    cleaned = cleaned.split(m[0]).join('');
  }
  if (found && !cleaned) return;
  try { sess.pty.write(found ? cleaned : chunk); } catch {}
}

function reply(sock, obj) {
  try { sock.write(JSON.stringify(obj) + '\n'); } catch {}
  try { sock.end(); } catch {}
}

// ---- DeerFlow-lite squad bus: persistent inbox + goal + skills ----
const INBOX_DIR = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'squad-inbox');
const GOAL_FILE = path.join(WORKSPACE_DIR, 'GOAL.md');
try { fs.mkdirSync(INBOX_DIR, { recursive: true }); } catch {}

// ---- SQLite message bus (survives restarts; powers push + inbox + history) ----
const DB_PATH = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'squad.db');
const db = new DatabaseSync(DB_PATH);
db.exec('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, kind TEXT, sender TEXT, target TEXT, body TEXT, context TEXT, created_at INTEGER, status TEXT, result TEXT, ack_at INTEGER)');
db.exec('CREATE INDEX IF NOT EXISTS idx_msg_target ON messages(target, status, created_at)');
db.exec('CREATE TABLE IF NOT EXISTS knowledge (topic TEXT PRIMARY KEY, summary TEXT, details TEXT, author TEXT, updated_at INTEGER)');
try {
  const hasOld = db.prepare("SELECT name FROM sqlite_master WHERE name='claims'").get();
  const cols = hasOld ? db.prepare('PRAGMA table_info(claims)').all().map((c) => c.name) : [];
  if (hasOld && !cols.includes('mode')) {
    db.exec('CREATE TABLE claims_new(path TEXT, agent_id TEXT, note TEXT, created_at INTEGER, file_mtime INTEGER, mode TEXT, PRIMARY KEY(path, agent_id))');
    db.exec("INSERT OR IGNORE INTO claims_new(path,agent_id,note,created_at,file_mtime,mode) SELECT path,agent_id,note,created_at,file_mtime,'exclusive' FROM claims");
    db.exec('DROP TABLE claims');
    db.exec('ALTER TABLE claims_new RENAME TO claims');
  } else if (!hasOld) {
    db.exec('CREATE TABLE claims(path TEXT, agent_id TEXT, note TEXT, created_at INTEGER, file_mtime INTEGER, mode TEXT, PRIMARY KEY(path, agent_id))');
  }
} catch {}
// One-time import of legacy JSON inboxes
try {
  const put = db.prepare('INSERT OR IGNORE INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const f of fs.readdirSync(INBOX_DIR)) {
    if (!f.endsWith('.json') || f.endsWith('.migrated.json')) continue;
    const target = f.slice(0, -5);
    let arr = [];
    try { arr = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, f), 'utf8')); } catch {}
    if (Array.isArray(arr)) {
      for (const t of arr) {
        if (t && t.status === 'pending') {
          put.run(t.id || ('t' + Date.now().toString(36)), 'task', t.from || '', target, t.task || '', t.context || '', t.created_at || Date.now(), 'pending', '', 0);
        }
      }
    }
    try { fs.renameSync(path.join(INBOX_DIR, f), path.join(INBOX_DIR, f + '.migrated')); } catch {}
  }
} catch {}
const subscribers = new Map(); // agentId -> Set(sockets) for realtime push

// ---- vim ban: shim binaries shadow real editors so vim can never open ----
const NOVIN_BIN = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'novin', 'bin');
try {
  fs.mkdirSync(NOVIN_BIN, { recursive: true });
  const shim = '#!/bin/sh\necho "[DEERFLOW] vim is disabled in squad rooms. Read files with: cat / head / tail / grep" >&2\nexit 0\n';
  for (const name of ['vim', 'vi', 'nvim', 'view', 'vimdiff', 'ex', 'vimtutor']) {
    const p = path.join(NOVIN_BIN, name);
    try {
      if (!fs.existsSync(p)) fs.writeFileSync(p, shim, { mode: 0o755 });
      else fs.chmodSync(p, 0o755);
    } catch {}
  }
} catch {}

function inboxPath(id) { return path.join(INBOX_DIR, id + '.json'); }
function readInbox(id) {
  try {
    const arr = JSON.parse(fs.readFileSync(inboxPath(id), 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeInbox(id, arr) {
  try { fs.writeFileSync(inboxPath(id), JSON.stringify(arr, null, 2)); } catch {}
}
function pendingInbox(id) { return readInbox(id).filter((t) => t.status === 'pending'); }
function isAgent(id) { return AGENTS.some((a) => a.id === id); }
// Daemon-injected blocks are ONE `: '...'` no-op command (multi-line quoted string),
// so an idle shell runs a single harmless no-op while an AI reading the screen sees everything.
function commentLines(s) {
  const body = String(s).replace(/\r\n/g, '\n').replace(/'/g, "'\\''");
  return ": '" + body + "'\r\n";
}

function pushTo(target, payload) {
  const set = subscribers.get(target);
  if (!set) return;
  const line = JSON.stringify(payload) + '\n';
  for (const sock of [...set]) {
    try { sock.write(line); } catch { set.delete(sock); }
  }
}

// Paste-aware PTY note (BEL nudge + no-op block). Waits for paste support, else plain.
function injectNote(to, tag, body, context = '') {
  try { if (!sessions.get(to)) getOrCreate(to); } catch {}
  const writeMsg = () => {
    try {
      const sess = sessions.get(to);
      if (!sess || sess.dead) return;
      const inner = commentLines(tag + '\n' + body + (context ? '\nContext: ' + context : ''));
      sess.pty.write('\x07');
      if (sess.pasteReady) sess.pty.write('\x1b[200~' + inner + '\x1b[201~\r');
      else sess.pty.write('\r\n' + inner);
    } catch {}
  };
  let waited = 0;
  const tick = () => {
    const s = sessions.get(to);
    if (!s || s.dead) return;
    if (s.pasteReady || waited >= 8000) { writeMsg(); return; }
    waited += 300;
    setTimeout(tick, 300);
  };
  tick();
}

// Central send: persist to SQLite + push to live subscribers + inject into PTY with BEL nudge.
function deliver(kind, from, to, body, context = '') {
  const id = kind[0] + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const now = Date.now();
  try { db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, kind, from, to, body, context, now, kind === 'task' ? 'pending' : 'done', '', 0); } catch {}
  pushTo(to, { event: 'msg', id, kind, from, to, body, context, created_at: now });
  const tag = kind === 'task' ? '[DEERFLOW-TASK id=' + id + ' from=' + from + ']'
    : kind === 'result' ? '[DEERFLOW-RESULT id=' + id + ' from=' + from + ']'
    : kind === 'system' ? '[DEERFLOW-GOAL from=' + from + ']'
    : '[DIRECT from=' + from + ']';
  injectNote(to, tag, body, context);
  return id;
}

// ---- collaborative file claims: exclusive default, shared for co-edit, watch-notify ----
const claimWatchers = new Map(); // rel path -> true (fs.watchFile active)
const claimNotifyAt = new Map(); // rel path -> last notify timestamp
function dropClaimWatch(rel) {
  if (!claimWatchers.has(rel)) return;
  claimWatchers.delete(rel);
  try { fs.unwatchFile(path.join(WORKSPACE_DIR, rel)); } catch {}
}
function ensureClaimWatch(rel) {
  if (claimWatchers.has(rel)) return;
  claimWatchers.set(rel, true);
  try {
    fs.watchFile(path.join(WORKSPACE_DIR, rel), { interval: 1500 }, () => queueClaimNotify(rel));
  } catch {}
}
function queueClaimNotify(rel) {
  setTimeout(() => notifyClaimChange(rel), 800);
}
function notifyClaimChange(rel) {
  const now = Date.now();
  if (now - (claimNotifyAt.get(rel) || 0) < 10000) return;
  claimNotifyAt.set(rel, now);
  let rows = [];
  try { rows = db.prepare('SELECT agent_id FROM claims WHERE path=?').all(rel); } catch {}
  if (!rows.length) { dropClaimWatch(rel); return; }
  for (const r of rows) {
    if (isAgent(r.agent_id)) injectNote(r.agent_id, '[WATCH ' + rel + ']', 'changed on disk — re-read before editing');
  }
}

function handleSubscribe(sock, req) {
  const id = req.session_id || 'agy-leader';
  let set = subscribers.get(id);
  if (!set) { set = new Set(); subscribers.set(id, set); }
  set.add(sock);
  try {
    const rows = db.prepare('SELECT id, kind, sender AS "from", target AS "to", body, context, created_at FROM messages WHERE target=? ORDER BY created_at DESC LIMIT 20').all(id).reverse();
    for (const r of rows) sock.write(JSON.stringify({ event: 'msg', ...r }) + '\n');
  } catch {}
  const beat = setInterval(() => { try { sock.write('{"event":"ping"}\n'); } catch {} }, 25000);
  const done = () => { clearInterval(beat); const s = subscribers.get(id); if (s) s.delete(sock); };
  sock.on('close', done);
  sock.on('error', done);
}

function handleRpc(sock, req) {
  const action = req.action;
  if (action === 'start_all') {
    for (const a of AGENTS) getOrCreate(a.id);
    return reply(sock, { status: 'ok' });
  }
  if (action === 'send_raw') {
    const sess = getOrCreate(req.target || 'agy-leader');
    try { sess.pty.write(req.text || ''); } catch {}
    return reply(sock, { status: 'ok' });
  }
  if (action === 'broadcast') {
    for (const a of AGENTS) {
      try { getOrCreate(a.id).pty.write(req.text || ''); } catch {}
    }
    return reply(sock, { status: 'ok' });
  }
  if (action === 'kill') {
    const target = req.target || 'agy-leader';
    const sess = sessions.get(target);
    if (sess) {
      sessions.delete(target);
      for (const c of [...sess.clients]) { try { c.end(); } catch {} }
      sess.clients.clear();
      try { sess.pty.kill(); } catch {}
      try { sess.log.end(); } catch {}
    }
    return reply(sock, { status: 'ok' });
  }
  if (action === 'capture') {
    const sess = sessions.get(req.target || 'agy-leader');
    return reply(sock, { status: 'ok', output: sess ? sess.history.slice(-8000) : '' });
  }
  if (action === 'list') {
    return reply(sock, {
      status: 'ok',
      agents: AGENTS.map((a) => ({
        id: a.id,
        title: a.title,
        alive: sessions.has(a.id) && !sessions.get(a.id).dead,
        clients: sessions.has(a.id) ? sessions.get(a.id).clients.size : 0,
        last_active: sessions.has(a.id) ? sessions.get(a.id).lastActive : 0,
        last_line: sessions.has(a.id) ? sessions.get(a.id).lastLine : ''
      }))
    });
  }
  if (action === 'send') {
    const id = deliver('chat', req.from || 'web-ui', req.target || 'agy-leader', req.text || '');
    return reply(sock, { status: 'ok', id });
  }
  if (action === 'delegate') {
    const id = deliver('task', req.from || 'agy-leader', req.to || 'ai-coder', req.task || '', req.context || '');
    return reply(sock, { status: 'ok', id });
  }
  if (action === 'inbox') {
    let tasks = [];
    try {
      tasks = db.prepare("SELECT id, sender AS \"from\", target AS \"to\", body AS task, context, created_at, status, result, ack_at FROM messages WHERE target=? AND kind='task' AND status='pending' ORDER BY created_at").all(req.target || 'agy-leader');
    } catch {}
    return reply(sock, { status: 'ok', tasks });
  }
  if (action === 'ack') {
    const target = req.target || 'agy-leader';
    let row = null;
    try { row = db.prepare("SELECT * FROM messages WHERE id=? AND target=? AND kind='task'").get(req.id, target); } catch {}
    if (!row) return reply(sock, { status: 'error', error: 'task not found' });
    try { db.prepare('UPDATE messages SET status=?, result=?, ack_at=? WHERE id=?').run('done', req.result || '', Date.now(), req.id); } catch {}
    if (req.result && isAgent(row.sender)) {
      deliver('result', target, row.sender, req.result, 're: ' + req.id);
    }
    return reply(sock, { status: 'ok' });
  }
  if (action === 'set_goal') {
    try { fs.writeFileSync(GOAL_FILE, '# DEERFLOW GOAL\n\n' + (req.text || '') + '\n\n_Set by ' + (req.from || 'agy-leader') + ' at ' + new Date().toISOString() + '_\n'); } catch {}
    for (const a of AGENTS) deliver('system', req.from || 'agy-leader', a.id, String(req.text || '').slice(0, 500));
    return reply(sock, { status: 'ok' });
  }
  if (action === 'get_goal') {
    let goal = '';
    try { goal = fs.readFileSync(GOAL_FILE, 'utf8'); } catch {}
    return reply(sock, { status: 'ok', goal });
  }
  if (action === 'skills') {
    const names = [];
    for (const d of [path.join(WORKSPACE_DIR, '.agents', 'skills'), path.join(WORKSPACE_DIR, 'skills')]) {
      try {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          if (e.isDirectory() && !names.includes(e.name)) names.push(e.name);
        }
      } catch {}
    }
    return reply(sock, { status: 'ok', skills: names });
  }
  if (action === 'claim') {
    let p = String(req.path || '').replace(/^\.\//, '');
    if (!p || p.includes('..') || path.isAbsolute(p)) return reply(sock, { status: 'error', error: 'bad path' });
    const mode = req.mode === 'shared' ? 'shared' : 'exclusive';
    const agent = req.agent || '';
    let rows = [];
    try { rows = db.prepare('SELECT * FROM claims WHERE path=? ORDER BY created_at').all(p); } catch {}
    const owner = rows[0];
    if (owner && owner.agent_id !== agent && owner.mode !== 'shared') {
      return reply(sock, { status: 'error', error: 'claimed by ' + owner.agent_id, claim: owner });
    }
    let mt = 0;
    try { mt = Math.round(fs.statSync(path.join(WORKSPACE_DIR, p)).mtimeMs || 0); } catch {}
    let effMode = owner ? owner.mode : mode;
    if (owner && owner.agent_id === agent && req.mode) effMode = req.mode === 'shared' ? 'shared' : 'exclusive';
    try { db.prepare('INSERT OR REPLACE INTO claims VALUES (?, ?, ?, ?, ?, ?)').run(p, agent, req.note || '', Date.now(), mt, effMode); } catch {}
    if (owner && owner.agent_id === agent && req.mode) {
      try { db.prepare('UPDATE claims SET mode=? WHERE path=?').run(effMode, p); } catch {}
    }
    ensureClaimWatch(p);
    return reply(sock, { status: 'ok', mode: effMode });
  }
  if (action === 'release') {
    const p = String(req.path || '');
    try { db.prepare('DELETE FROM claims WHERE path=? AND agent_id=?').run(p, req.agent || ''); } catch {}
    try {
      const left = db.prepare('SELECT COUNT(*) c FROM claims WHERE path=?').get(p).c;
      if (!left) dropClaimWatch(p);
    } catch {}
    return reply(sock, { status: 'ok' });
  }
  if (action === 'knock') {
    const p = String(req.path || '');
    let owner = null;
    try { owner = db.prepare('SELECT * FROM claims WHERE path=? ORDER BY created_at').all(p)[0] || null; } catch {}
    if (!owner) return reply(sock, { status: 'ok', holder: null });
    if (owner.agent_id !== req.from && isAgent(owner.agent_id)) {
      deliver('chat', req.from || 'web-ui', owner.agent_id, '[KNOCK ' + p + '] ' + (req.text || 'ขอร่วมแก้ไฟล์นี้ด้วย'), '');
    }
    return reply(sock, { status: 'ok', holder: owner.agent_id });
  }
  if (action === 'claims') {
    let rows = [];
    try { rows = db.prepare('SELECT * FROM claims ORDER BY path, created_at').all(); } catch {}
    const byPath = {};
    for (const r of rows) {
      if (!byPath[r.path]) byPath[r.path] = { path: r.path, owner: r.agent_id, mode: r.mode || 'exclusive', mates: [], notes: {}, created_at: r.created_at, file_mtime: r.file_mtime };
      else byPath[r.path].mates.push(r.agent_id);
      byPath[r.path].notes[r.agent_id] = r.note || '';
    }
    const out = Object.values(byPath).map((g) => {
      let mt = 0;
      try { mt = Math.round(fs.statSync(path.join(WORKSPACE_DIR, g.path)).mtimeMs || 0); } catch {}
      g.dirty = mt !== g.file_mtime;
      return g;
    });
    return reply(sock, { status: 'ok', claims: out });
  }
  if (action === 'history') {
    let rows = [];
    try {
      const lim = Math.min(200, Number(req.limit) || 50);
      if (req.target) {
        rows = db.prepare('SELECT id, kind, sender AS "from", target AS "to", body, context, created_at, status FROM messages WHERE target=? OR sender=? ORDER BY created_at DESC LIMIT ?').all(req.target, req.target, lim);
      } else {
        rows = db.prepare('SELECT id, kind, sender AS "from", target AS "to", body, context, created_at, status FROM messages ORDER BY created_at DESC LIMIT ?').all(lim);
      }
    } catch {}
    return reply(sock, { status: 'ok', messages: rows });
  }
  if (action === 'stats') {
    const s = { total: 0, chat: 0, task: 0, result: 0, system: 0, pending: 0, db_bytes: 0 };
    try {
      s.total = db.prepare('SELECT COUNT(*) c FROM messages').get().c;
      for (const r of db.prepare("SELECT kind, COUNT(*) c FROM messages GROUP BY kind").all()) s[r.kind] = r.c;
      s.pending = db.prepare("SELECT COUNT(*) c FROM messages WHERE kind='task' AND status='pending'").get().c;
      s.db_bytes = fs.statSync(DB_PATH).size;
    } catch {}
    return reply(sock, { status: 'ok', stats: s });
  }
  if (action === 'remember') {
    const topic = String(req.topic || '').trim();
    if (!topic) return reply(sock, { status: 'error', error: 'topic required' });
    const now = Date.now();
    try { db.prepare('INSERT OR REPLACE INTO knowledge VALUES (?, ?, ?, ?, ?)').run(topic, req.summary || '', req.details || '', req.author || '', now); } catch {}
    for (const a of AGENTS) {
      if (a.id === req.author) continue;
      injectNote(a.id, '[KNOWLEDGE:' + topic + ']', 'updated by ' + (req.author || '?') + ' — recall with: node squad.mjs recall ' + topic);
    }
    return reply(sock, { status: 'ok', topic });
  }
  if (action === 'recall') {
    let row = null;
    try { row = db.prepare('SELECT * FROM knowledge WHERE topic=?').get(String(req.topic || '')); } catch {}
    if (!row) return reply(sock, { status: 'error', error: 'no such topic' });
    return reply(sock, { status: 'ok', knowledge: row });
  }
  if (action === 'knowledge-list') {
    let rows = [];
    try { rows = db.prepare('SELECT topic, summary, author, updated_at FROM knowledge ORDER BY updated_at DESC').all(); } catch {}
    return reply(sock, { status: 'ok', knowledge: rows });
  }
  if (action === 'forget') {
    try { db.prepare('DELETE FROM knowledge WHERE topic=?').run(String(req.topic || '')); } catch {}
    return reply(sock, { status: 'ok' });
  }
  return reply(sock, { status: 'error', error: 'unknown action' });
}

const server = net.createServer((sock) => {
  let buf = Buffer.alloc(0);
  let headerParsed = false;
  sock.on('data', (chunk) => {
    if (headerParsed) return; // attach mode: listener added by handleAttach
    buf = Buffer.concat([buf, chunk]);
    const idx = buf.indexOf(0x0a); // \n
    if (idx === -1) return;
    const line = buf.slice(0, idx).toString('utf8');
    const rest = buf.slice(idx + 1);
    let req;
    try { req = JSON.parse(line); } catch { try { sock.end(); } catch {} return; }
    if (req.action === 'attach') {
      headerParsed = true;
      buf = Buffer.alloc(0);
      handleAttach(sock, req, rest);
    } else if (req.action === 'subscribe') {
      headerParsed = true;
      buf = Buffer.alloc(0);
      handleSubscribe(sock, req);
    } else {
      handleRpc(sock, req);
    }
  });
  sock.on('error', () => {});
});

const PIDFILE = '/tmp/deerflow-pty.pid';

// Singleton guard: never run two daemons (duplicate daemons split sessions apart).
try {
  const oldPid = Number(fs.readFileSync(PIDFILE, 'utf8'));
  if (oldPid) {
    try { process.kill(oldPid, 0); console.error('another pty-daemon running as pid ' + oldPid + ', exiting'); process.exit(1); }
    catch { /* stale pidfile, continue */ }
  }
} catch {}
try { fs.writeFileSync(PIDFILE, String(process.pid)); } catch {}
process.on('exit', () => { try { fs.unlinkSync(PIDFILE); } catch {} });

try {
  if (fs.existsSync(SOCKET)) fs.unlinkSync(SOCKET);
} catch {}
server.listen(SOCKET, () => {
  console.log('deerflow pty-daemon listening on ' + SOCKET);
});
server.on('error', (err) => {
  console.error('pty-daemon error: ' + err.message);
  process.exit(1);
});

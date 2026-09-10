#!/usr/bin/env node
// DeerFlow 2.0 — Dual Workbench: Monaco Web IDE (left) + PTY rooms (right)
// PTYs live in pty-daemon.mjs (persistent, tmux-like). This server is a stateless proxy.
// Requires: npm i ws node-pty
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, openSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, relative, resolve, extname } from 'node:path';
import { homedir } from 'node:os';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.HUD_PORT) || 5999;
const snapshotPath = '/Users/khamseankhampang/.gemini/antigravity-cli/status-snapshot.json';
const WORKSPACE_DIR = process.cwd();
const SHELL = process.env.SHELL || '/bin/zsh';

const AGENTS = [
  { id: 'agy-leader', title: '0: SUPERAGENT', role: 'Lead Orchestrator: รับงาน แตก goal แล้วสั่งงานห้องอื่น ห้ามลงมือเขียนโค้ดเอง', color: '#00f0ff' },
  { id: 'ai-research', title: '1: DEEP RESEARCH', role: 'Researcher: ค้นโค้ด+เว็บ สรุปสเปกส่งให้ 2: SANDBOX CODER', color: '#ffea00' },
  { id: 'ai-coder', title: '2: SANDBOX CODER', role: 'Implementer: เขียนโค้ดตามสเปก รายงานผลกลับ 0: SUPERAGENT', color: '#b026ff' },
  { id: 'ai-qa', title: '3: ARTIFACT CREATOR', role: 'QA/Docs: ทำ docs+test ส่งให้ 4: MEMORY VERIFIER ตรวจ', color: '#00ff88' },
  { id: 'ai-reviewer', title: '4: MEMORY VERIFIER', role: 'Auditor: ตรวจ policy/คุณภาพ สั่ง rework กลับ 2: SANDBOX CODER', color: '#ff007f' }
];

// ---- Persistent PTY daemon client (tmux-like: sessions survive refresh + web restarts) ----
const DAEMON_SOCKET = '/tmp/deerflow-pty.sock';

function daemonPath() {
  try {
    return fileURLToPath(new URL('./pty-daemon.mjs', import.meta.url));
  } catch {
    return join(process.cwd(), 'pty-daemon.mjs');
  }
}

// Spawn the daemon detached if not running; resolves true when socket answers.
// Handles stale socket files (exists but nobody listening) by removing + respawning.
function probeDaemon() {
  return new Promise((resolve) => {
    const c = net.createConnection(DAEMON_SOCKET);
    c.on('connect', () => { try { c.end(); } catch {} resolve(true); });
    c.on('error', () => resolve(false));
  });
}

function ensureDaemon() {
  return new Promise((resolve) => {
    const spawnFresh = () => {
      // If pidfile points at a live daemon, its socket is coming — don't unlink/spawn.
      let daemonAlive = false;
      try {
        const oldPid = Number(readFileSync('/tmp/deerflow-pty.pid', 'utf8'));
        if (oldPid) { process.kill(oldPid, 0); daemonAlive = true; }
      } catch {}
      if (daemonAlive) {
        let tries = 0;
        const timer = setInterval(async () => {
          let ok = false;
          try { ok = existsSync(DAEMON_SOCKET) && await probeDaemon(); } catch {}
          if (ok || ++tries > 30) { clearInterval(timer); resolve(ok); }
        }, 200);
        return;
      }
      try { unlinkSync(DAEMON_SOCKET); } catch {}
      try { unlinkSync('/tmp/deerflow-pty.pid'); } catch {}
      try {
        const logPath = join(homedir(), '.gemini', 'antigravity-cli', 'pty-daemon.log');
        const out = openSync(logPath, 'a');
        const proc = spawn(process.execPath, [daemonPath()], { detached: true, stdio: ['ignore', out, out] });
        proc.unref();
      } catch {}
      let tries = 0;
      const timer = setInterval(async () => {
        let ok = false;
        try { ok = existsSync(DAEMON_SOCKET) && await probeDaemon(); } catch {}
        if (ok || ++tries > 30) {
          clearInterval(timer);
          resolve(ok);
        }
      }, 200);
    };
    (async () => {
      try {
        if (existsSync(DAEMON_SOCKET) && await probeDaemon()) return resolve(true);
      } catch {}
      spawnFresh();
    })();
  });
}

// One-shot RPC: {action,...}\n -> one JSON line reply.
function daemonRpc(obj, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, val) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { client.destroy(); } catch {}
      fn(val);
    };
    const client = net.createConnection(DAEMON_SOCKET);
    let buf = '';
    const timer = setTimeout(() => finish(reject, new Error('pty-daemon timeout')), timeoutMs);
    client.on('connect', () => client.write(JSON.stringify(obj) + '\n'));
    client.on('data', (chunk) => {
      buf += chunk.toString();
      const idx = buf.indexOf('\n');
      if (idx !== -1) {
        try { finish(resolve, JSON.parse(buf.slice(0, idx))); }
        catch (e) { finish(reject, e); }
      }
    });
    client.on('error', (err) => finish(reject, err));
  });
}

// ---- fs helpers ----
function readState() {
  try {
    if (existsSync(snapshotPath)) return JSON.parse(readFileSync(snapshotPath, 'utf8'));
  } catch {}
  return {
    agent_state: 'ready',
    updated_at: new Date().toISOString(),
    cwd: WORKSPACE_DIR,
    context_window: { used_percentage: 0 },
    model: { display_name: 'Antigravity / DeerFlow 2.0' },
    quota: {}
  };
}

function getSafePath(relPath) {
  const safePath = resolve(WORKSPACE_DIR, relPath || '');
  if (!safePath.startsWith(WORKSPACE_DIR)) throw new Error('Access denied: Path outside workspace');
  return safePath;
}

function getFileTree(dir = WORKSPACE_DIR, baseDir = WORKSPACE_DIR, depth = 0) {
  if (depth > 4) return [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'brain')
      .map(e => {
        const fullPath = join(dir, e.name);
        const relPath = relative(baseDir, fullPath);
        if (e.isDirectory()) {
          return { name: e.name, path: relPath, type: 'directory', children: getFileTree(fullPath, baseDir, depth + 1) };
        }
        return { name: e.name, path: relPath, type: 'file', ext: extname(e.name).replace('.', '').toLowerCase() };
      });
  } catch { return []; }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DEERFLOW 2.0 // CYBER WEB IDE + PTY ROOMS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Orbitron:wght@600;800;900&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js"></script>
<style>
  :root { --bg-base:#06090f; --bg-panel:rgba(13,18,28,0.98); --bg-card:rgba(18,24,38,0.85); --border-glow:rgba(0,240,255,0.35); --border-subtle:rgba(255,255,255,0.08); --neon-cyan:#00f0ff; --neon-pink:#ff007f; --neon-green:#00ff88; --neon-yellow:#ffea00; --neon-purple:#b026ff; --text-main:#f0f6fc; --text-dim:#7f8fa4; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { width:100vw; height:100vh; overflow:hidden; background:var(--bg-base); color:var(--text-main); font-family:'Rajdhani',sans-serif; }
  body { display:flex; flex-direction:column; }
  header { height:48px; background:var(--bg-panel); border-bottom:1px solid var(--border-glow); padding:0 16px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
  .brand { display:flex; align-items:center; gap:10px; }
  .brand-title { font-family:'Orbitron',monospace; font-weight:900; font-size:13.5px; letter-spacing:1.5px; }
  .brand-badge { font-size:9px; font-family:'Orbitron'; font-weight:700; color:var(--neon-yellow); background:rgba(255,234,0,0.1); border:1px solid rgba(255,234,0,0.3); padding:1px 6px; border-radius:3px; }
  .header-actions { display:flex; gap:6px; align-items:center; }
  .btn { background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.35); color:var(--neon-cyan); font-family:'Orbitron',sans-serif; font-size:9.5px; font-weight:700; padding:5px 10px; border-radius:4px; cursor:pointer; }
  .btn:hover { background:rgba(0,240,255,0.22); }
  .broadcast-bar { display:flex; gap:6px; align-items:center; background:rgba(0,0,0,0.45); border:1px solid rgba(0,240,255,0.25); border-radius:4px; padding:3px 8px; }
  .broadcast-input { background:transparent; border:none; color:#fff; font-family:'Fira Code',monospace; font-size:11px; width:200px; outline:none; }
  .workspace { display:flex; flex:1; height:calc(100vh - 48px); width:100vw; overflow:hidden; }
  .splitter { flex:none; width:7px; background:rgba(0,240,255,0.10); border-left:1px solid var(--border-subtle); border-right:1px solid var(--border-subtle); cursor:col-resize; }
  .splitter:hover, .splitter.drag { background:rgba(0,240,255,0.40); }
  .workspace.focus-right .splitter { display:none; }
  .vsplitter { flex:none; width:7px; background:rgba(0,240,255,0.10); cursor:col-resize; }
  .vsplitter:hover, .vsplitter.vdrag { background:rgba(0,240,255,0.40); }
  .hsplitter { flex:none; height:7px; background:rgba(0,240,255,0.10); border-top:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle); cursor:row-resize; }
  .hsplitter:hover, .hsplitter.vdrag { background:rgba(0,240,255,0.40); }
  .workspace.vertical { flex-direction:column; }
  .workspace.vertical .left-workstation { border-right:none; border-bottom:1px solid var(--border-glow); }
  .workspace.vertical .right-workstation { min-height:0; }
  .workspace.vertical .splitter { width:100%; height:7px; cursor:row-resize; border-left:none; border-right:none; border-top:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle); }
  .left-workstation { width:50%; height:100%; display:flex; border-right:1px solid var(--border-glow); background:#0d1117; }
  .left-workstation.hide-explorer .file-tree-pane { display:none; }
  .workspace.focus-right .left-workstation { display:none; }
  .workspace.focus-right .right-workstation { width:100%; }
  .btn.off { opacity:0.45; }
  .file-tree-pane { width:200px; min-width:170px; height:100%; background:rgba(10,14,22,0.95); border-right:1px solid var(--border-subtle); display:flex; flex-direction:column; overflow:hidden; }
  .pane-header { height:32px; padding:0 10px; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; font-family:'Orbitron',monospace; font-size:9.5px; font-weight:700; color:var(--text-dim); }
  .tree-search-bar { padding:4px 6px; border-bottom:1px solid var(--border-subtle); }
  .tree-search-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#fff; font-size:10px; padding:3px 6px; border-radius:3px; outline:none; font-family:'Fira Code',monospace; }
  .tree-content { flex:1; overflow-y:auto; padding:4px 2px; font-family:'Fira Code',monospace; font-size:11px; }
  .tree-item { padding:3px 6px; cursor:pointer; border-radius:3px; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tree-item:hover { background:rgba(0,240,255,0.12); color:#fff; }
  .tree-item.active { background:rgba(0,240,255,0.22); color:var(--neon-cyan); }
  .editor-process-pane { flex:1; height:100%; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
  .editor-tabs-bar { min-height:32px; background:#090d14; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; overflow-x:auto; padding:0 4px; gap:3px; }
  .editor-tab { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:var(--text-dim); font-family:'Fira Code',monospace; font-size:10.5px; padding:3px 8px; border-radius:3px 3px 0 0; cursor:pointer; display:flex; gap:6px; white-space:nowrap; }
  .editor-tab.active { background:#1e1e1e; color:var(--neon-cyan); border-color:var(--neon-cyan); }
  #editorContainer { flex:1; width:100%; min-height:200px; background:#1e1e1e; }
  .process-console { height:140px; background:#070a0f; border-top:1px solid var(--border-glow); display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; }
  .console-bar { height:28px; padding:0 8px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); }
  .console-title { font-family:'Orbitron'; font-size:9px; font-weight:700; color:var(--neon-cyan); }
  .cmd-btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:#cbd5e1; font-family:'Orbitron'; font-size:8px; padding:2px 6px; border-radius:3px; cursor:pointer; }
  .console-logs { flex:1; padding:6px 8px; overflow-y:auto; font-family:'Fira Code',monospace; font-size:10.5px; color:#a6accd; background:#04060a; white-space:pre-wrap; }
  .right-workstation { width:50%; height:100%; display:flex; flex-direction:column; background:#0a0e17; overflow:hidden; }
  .rooms-top-bar { min-height:38px; background:rgba(8,11,18,0.98); border-bottom:1px solid var(--border-subtle); padding:4px 8px; display:flex; gap:6px; align-items:center; }
  .rooms-tabs { display:flex; gap:4px; overflow-x:auto; flex:1; }
  .room-tab { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); color:var(--text-dim); font-family:'Orbitron',monospace; font-size:9px; font-weight:700; padding:4px 8px; border-radius:4px; cursor:pointer; white-space:nowrap; }
  .room-tab.active { background:rgba(0,240,255,0.18); color:var(--neon-cyan); border-color:var(--neon-cyan); }
  .rooms-container { flex:1; display:flex; min-height:0; overflow:hidden; }
  .room-pane { display:none; flex:1; flex-direction:column; min-width:0; background:#000; }
  .room-pane.active { display:flex; }
  .rooms-container.grid-mode { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr 1fr; gap:6px; padding:6px; overflow-y:auto; }
  .rooms-container.grid-mode .room-pane { display:flex; border:1px solid rgba(0,240,255,0.2); border-radius:6px; overflow:auto; min-height:180px; min-width:260px; resize:both; }
  .room-pane-bar { height:30px; display:flex; justify-content:space-between; align-items:center; padding:0 8px; background:rgba(12,16,26,0.95); border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
  .room-pane-title { font-family:'Orbitron',monospace; font-size:10px; font-weight:700; }
  .room-xterm-host { flex:1; min-height:0; background:#000; padding:4px 6px; overflow:hidden; }
  .room-xterm-host .xterm { height:100%; }
  .room-input-bar { height:34px; display:flex; gap:6px; padding:0 8px; align-items:center; background:rgba(10,14,22,0.98); border-top:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
  .room-input-field { flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px 8px; color:#fff; font-family:'Fira Code',monospace; font-size:11px; outline:none; }
  .hud-strip { background:rgba(8,12,20,0.98); border-bottom:1px solid var(--border-subtle); padding:6px 10px; flex-shrink:0; max-height:220px; overflow-y:auto; }
  .info-split { display:flex; flex-shrink:0; max-height:240px; border-bottom:1px solid var(--border-subtle); }
  .info-split .hud-strip { border-bottom:none; }
  .info-left { flex:1.3; min-width:0; max-height:240px; }
  .info-right { flex:1; min-width:0; display:flex; flex-direction:column; border-left:1px solid var(--border-subtle); max-height:240px; }
  .info-right .dispatch-bar { flex-shrink:0; }
  .info-right .hud-strip { flex:1; min-height:0; }
  @media (max-width: 1100px) { .info-split { flex-direction:column; max-height:none; } .info-right { border-left:none; border-top:1px solid var(--border-subtle); max-height:none; } }
  .dispatch-bar { display:flex; gap:6px; align-items:center; background:rgba(8,12,20,0.98); border-bottom:1px solid var(--border-subtle); padding:4px 10px; flex-shrink:0; font-family:'Orbitron',monospace; font-size:9px; }
  .dispatch-select { background:#000; border:1px solid rgba(0,240,255,0.35); color:var(--neon-cyan); font-family:'Orbitron',monospace; font-size:9px; padding:3px 6px; border-radius:3px; outline:none; }
  .dispatch-input { flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px 8px; color:#fff; font-family:'Fira Code',monospace; font-size:11px; outline:none; }
  .mission-bar { display:flex; gap:8px; align-items:center; padding:4px 12px; background:rgba(8,12,20,0.98); border-bottom:1px solid rgba(255,234,0,0.25); font-family:'Orbitron',monospace; font-size:9px; flex-shrink:0; }
  .inbox-drawer { background:rgba(8,12,20,0.98); border-bottom:1px solid var(--border-subtle); padding:6px 10px; max-height:220px; overflow-y:auto; flex-shrink:0; }
  .task-card { background:rgba(18,24,38,0.85); border:1px solid rgba(255,234,0,0.3); border-radius:6px; padding:6px 8px; margin-bottom:6px; font-size:11px; }
  .hud-tabs { display:flex; gap:6px; align-items:center; margin-bottom:6px; font-family:'Orbitron',monospace; font-size:9px; }
  .hud-tab { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-dim); padding:2px 8px; border-radius:3px; cursor:pointer; font-weight:700; }
  .hud-tab.active { background:var(--neon-cyan); color:#000; }
  .hud-agent { font-family:'Orbitron',monospace; font-size:10px; font-weight:700; margin-left:auto; }
  .hud-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:11px; }
  .hud-row { display:flex; justify-content:space-between; gap:8px; padding:1px 0; }
  .hud-label { color:var(--text-dim); font-weight:600; font-size:10px; }
  .hud-value { font-family:'Fira Code',monospace; font-size:10.5px; text-align:right; }
  .bar { height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; margin:2px 0; }
  .bar-fill { height:100%; border-radius:2px; }
  .status-badge { display:inline-block; padding:1px 8px; border-radius:8px; font-family:'Orbitron'; font-size:9px; font-weight:700; }
  .sl-bar { display:flex; gap:6px; align-items:center; overflow-x:auto; padding:5px 12px; background:rgba(6,9,15,0.98); border-bottom:1px solid var(--border-glow); font-family:'Fira Code',monospace; font-size:11px; white-space:nowrap; flex-shrink:0; }
  .sl-pill { border:1px solid rgba(255,255,255,0.12); background:linear-gradient(180deg, rgba(22,30,52,0.95), rgba(9,14,28,0.95)); padding:2px 12px; border-radius:12px; font-weight:600; letter-spacing:0.3px; box-shadow:0 0 12px -4px currentColor; }
  .sl-pill.dim { opacity:0.5; box-shadow:none; }
  .sl-tag { font-size:8px; opacity:0.65; letter-spacing:1.5px; margin-right:5px; font-family:'Orbitron'; }
  .sl-sep { color:#1e293b; }
  #toast { position:fixed; bottom:16px; right:16px; background:rgba(10,14,24,0.96); border:1px solid var(--neon-cyan); color:#fff; padding:6px 14px; border-radius:4px; font-family:'Orbitron'; font-size:10px; display:none; z-index:999; }
  #skillDrawer { position:fixed; top:48px; right:0; bottom:0; width:min(430px,92vw); background:rgba(8,12,20,0.98); border-left:1px solid var(--border-glow); z-index:50; flex-direction:column; }
  .skill-drawer-head { display:flex; gap:8px; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border-subtle); font-family:'Orbitron'; font-size:11px; color:var(--neon-cyan); }
  .skill-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:8px; }
  .skill-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:6px; padding:8px 10px; }
  .skill-cat { font-size:9px; color:var(--neon-yellow); font-family:'Orbitron'; margin-top:4px; }
  .skill-name { font-family:'Orbitron'; font-size:11px; color:var(--neon-cyan); margin:2px 0; }
  .skill-desc { font-size:11px; color:#cbd5e1; line-height:1.5; }
</style>
</head>
<body>
<header>
  <div class="brand"><div class="brand-title">DEERFLOW 2.0 // WEB IDE + PTY</div><span class="brand-badge">PURE NODE</span></div>
  <div class="broadcast-bar"><span>📢</span><input type="text" id="broadcastInput" class="broadcast-input" placeholder="Broadcast to all 5 PTYs..." onkeydown="if(event.key==='Enter') broadcastCmd()"><button class="btn" onclick="broadcastCmd()">SEND</button></div>
  <div class="header-actions"><button class="btn" id="explorerBtn" onclick="toggleExplorer()">EXPLORER</button><button class="btn" id="codeBtn" onclick="toggleCodePane()">CODE</button><button class="btn" id="viewModeBtn" onclick="toggleViewMode()">GRID</button><button class="btn" onclick="startAllSquad()">LAUNCH ALL 5</button><a class="btn" href="/monitor" target="_blank" style="text-decoration:none;">MONITOR</a><a class="btn" href="/manual" target="_blank" style="text-decoration:none;">MANUAL</a><button class="btn" onclick="toggleSkillDrawer()">SKILLS</button><button class="btn" id="orientBtn" onclick="toggleOrient()" title="สลับแนวซ้ายขวา/บนล่าง">⇔ SPLIT</button><button class="btn" id="audioBtn" onclick="toggleAudio()" title="เสียงแจ้งเตือน">🔊 SOUND</button></div>
</header>
<div class="sl-bar" id="slBar"><span style="color:#64748B;">● connecting to agy statusline...</span></div>
<div class="mission-bar"><span style="color:var(--neon-yellow);font-weight:700;">GOAL</span><span id="goalText" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0;">— loading —</span><input type="text" id="goalInput" class="dispatch-input" style="max-width:280px;flex:none;width:280px;" placeholder="Set squad goal..." onkeydown="if(event.key==='Enter') setGoal()"><button class="btn" onclick="setGoal()">SET</button></div>
<div class="workspace">
  <div class="left-workstation">
    <div class="file-tree-pane">
      <div class="pane-header"><span>EXPLORER</span><span style="cursor:pointer;" onclick="loadFileTree()">REFRESH</span></div>
      <div class="tree-search-bar"><input type="text" id="treeSearch" class="tree-search-input" placeholder="Filter..." oninput="filterFileTree(this.value)"></div>
      <div class="tree-content" id="treeContainer"></div>
    </div>
    <div class="editor-process-pane">
      <div class="editor-tabs-bar" id="editorTabsContainer"></div>
      <div id="editorContainer"></div>
      <div class="process-console">
        <div class="console-bar"><span class="console-title">PROCESS RUNNER</span><span><button class="cmd-btn" onclick="runShellCmd('npm test')">TEST</button> <button class="cmd-btn" onclick="runShellCmd('git status')">GIT</button> <button class="cmd-btn" onclick="clearConsole()">CLEAR</button></span></div>
        <div class="console-logs" id="consoleLogs">> ready. Open a file from Explorer.\n</div>
      </div>
    </div>
  </div>
  <div class="splitter" id="splitter" title="ลากปรับขนาด"></div>
  <div class="right-workstation">
    <div class="rooms-top-bar"><div class="rooms-tabs" id="roomsTabsContainer"></div><button class="btn" id="inboxBtn" onclick="toggleInbox()">INBOX (0)</button><button class="btn" onclick="clearActiveRoom()">CLEAR</button></div>
    <div class="inbox-drawer" id="inboxDrawer" style="display:none;"></div>
    <div class="info-split">
    <div class="info-left hud-strip"><div class="hud-tabs"><span style="color:var(--text-dim);font-weight:700;">HUD // ANTIGRAVITY</span><span id="hudTabs" style="display:flex;gap:6px;"></span><span class="hud-agent" id="hudAgent">0: SUPERAGENT</span></div><div class="hud-grid" id="hudGrid"><div style="color:#7f8fa4;">Loading telemetry from hud.mjs snapshot...</div></div></div>
    <div class="vsplitter" id="hudVsplit" title="ลากปรับ HUD / INTER-CHAT"></div>
    <div class="info-right">
    <div class="dispatch-bar"><span style="color:var(--neon-cyan);font-weight:700;">INTER-CHAT</span><select id="dispatchTarget" class="dispatch-select"><option value="agy-leader">0: SUPERAGENT</option><option value="ai-research">1: DEEP RESEARCH</option><option value="ai-coder">2: SANDBOX CODER</option><option value="ai-qa">3: ARTIFACT CREATOR</option><option value="ai-reviewer">4: MEMORY VERIFIER</option></select><input type="text" id="dispatchText" class="dispatch-input" placeholder="พิมพ์คำสั่งส่งเข้าห้องนั้น แล้ว Enter..." onkeydown="if(event.key==='Enter') dispatchFromBar()"><button class="btn" onclick="dispatchFromBar()">TELL</button><button class="btn" onclick="delegateTask()" title="structured task with inbox fallback">TASK</button><button class="btn" onclick="loadSquadDir()" title="refresh who-is-who">WHO</button></div>
    <div class="hud-strip" id="squadDir" style="max-height:none;"><div style="color:#7f8fa4;font-size:10px;">Squad directory loading...</div></div>
    </div>
    </div>
    <div class="hsplitter" id="infoHsplit" title="ลากปรับสูงแผงข้อมูล / terminal"></div>
    <div class="rooms-container" id="roomsContainer"></div>
  </div>
</div>
<div id="toast"></div>
<div id="skillDrawer" style="display:none;">
  <div class="skill-drawer-head"><span>SKILLS COMBO</span><span id="skillCount"></span><span style="flex:1;"></span><button class="btn" onclick="toggleSkillDrawer()">CLOSE</button></div>
  <div style="padding:8px 8px 0;"><input type="text" id="skillSearch" class="room-input-field" style="width:100%;" placeholder="ค้นหาสกิล..." oninput="renderSkillList(this.value)"></div>
  <div id="skillList" class="skill-list"></div>
</div>
<script>
var editorInstance = null;
var currentOpenFile = null;
var openTabs = [];
var fullTreeData = [];
var activeRoomId = 'agy-leader';
var isGridMode = false;
var roomInstances = {};
var agentMeta = {
  'agy-leader': { title: '0: SUPERAGENT', role: 'Lead Orchestrator', color: '#00f0ff' },
  'ai-research': { title: '1: DEEP RESEARCH', role: 'Researcher', color: '#ffea00' },
  'ai-coder': { title: '2: SANDBOX CODER', role: 'Implementer', color: '#b026ff' },
  'ai-qa': { title: '3: ARTIFACT CREATOR', role: 'QA/Docs', color: '#00ff88' },
  'ai-reviewer': { title: '4: MEMORY VERIFIER', role: 'Auditor', color: '#ff007f' }
};
var roomIds = ['agy-leader', 'ai-research', 'ai-coder', 'ai-qa', 'ai-reviewer'];
var audioOn = true;
var audioCtx = null;
var lastToolConfirm = false;
try { if (localStorage.getItem('df-audio') === 'off') audioOn = false; } catch(e) {}
function ac() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch(e) { return null; }
}
function tone(f, t, dur, type, vol) {
  var c = ac();
  if (!c || !audioOn) return;
  try {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    var now = c.currentTime + (t || 0);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(c.destination);
    o.start(now); o.stop(now + dur + 0.05);
  } catch(e) {}
}
function sfx(kind) {
  if (!audioOn) return;
  if (kind === 'send') { tone(880, 0, 0.12, 'square', 0.06); }
  else if (kind === 'task') { tone(660, 0, 0.12, 'sine', 0.12); tone(990, 0.1, 0.15, 'sine', 0.12); }
  else if (kind === 'done') { tone(523, 0, 0.15, 'sine', 0.14); tone(659, 0.12, 0.15, 'sine', 0.14); tone(784, 0.24, 0.25, 'sine', 0.14); tone(1047, 0.36, 0.3, 'sine', 0.12); }
  else if (kind === 'alert') { tone(220, 0, 0.3, 'sawtooth', 0.1); tone(220, 0.35, 0.3, 'sawtooth', 0.1); }
  else if (kind === 'goal') { tone(392, 0, 0.15, 'triangle', 0.12); tone(523, 0.12, 0.2, 'triangle', 0.12); }
}
function toggleAudio() {
  audioOn = !audioOn;
  try { localStorage.setItem('df-audio', audioOn ? 'on' : 'off'); } catch(e) {}
  initAudioBtn();
  if (audioOn) sfx('send');
}
function initAudioBtn() {
  var b = document.getElementById('audioBtn');
  if (b) { b.innerText = audioOn ? '🔊 SOUND' : '🔇 MUTED'; b.className = audioOn ? 'btn' : 'btn off'; }
}
document.addEventListener('pointerdown', function() { ac(); }, { once: true });
function showToast(msg) {
  var t = document.getElementById('toast');
  t.innerText = msg; t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 2000);
}
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function initMonaco() {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
  require(['vs/editor/editor.main'], function() {
    editorInstance = monaco.editor.create(document.getElementById('editorContainer'), {
      value: '// DeerFlow Web IDE\\n// Select a file from Explorer.\\n',
      language: 'javascript', theme: 'vs-dark', automaticLayout: true, fontSize: 13, fontFamily: 'Fira Code, monospace', minimap: { enabled: true }
    });
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() { saveActiveFile(); });
  });
}
function loadFileTree() {
  fetch('/api/fs/tree').then(function(r) { return r.json(); }).then(function(d) { fullTreeData = d.tree || []; renderFileTree(fullTreeData); });
}
function renderFileTree(tree, filter) {
  filter = filter || '';
  var out = '';
  function walk(nodes, depth) {
    depth = depth || 0;
    nodes.forEach(function(n) {
      if (filter && n.name.toLowerCase().indexOf(filter.toLowerCase()) === -1) { if (n.children) walk(n.children, depth + 1); return; }
      var indent = depth * 12 + 6;
      if (n.type === 'directory') {
        out += '<div class="tree-item" style="padding-left:' + indent + 'px;color:#94a3b8;font-weight:600;">📁 ' + escapeHtml(n.name) + '</div>';
        if (n.children) walk(n.children, depth + 1);
      } else {
        var cls = currentOpenFile === n.path ? ' active' : '';
        out += '<div class="tree-item' + cls + '" style="padding-left:' + indent + 'px;" data-p="' + escapeHtml(n.path) + '" onclick="openFile(this.dataset.p)">📄 ' + escapeHtml(n.name) + '</div>';
      }
    });
  }
  walk(tree);
  document.getElementById('treeContainer').innerHTML = out || 'No files';
}
function filterFileTree(v) { renderFileTree(fullTreeData, (v || '').trim()); }
function openFile(path) {
  fetch('/api/fs/read?path=' + encodeURIComponent(path)).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.success) return showToast('Read failed');
    currentOpenFile = path;
    if (openTabs.indexOf(path) === -1) openTabs.push(path);
    renderEditorTabs();
    var ext = path.split('.').pop().toLowerCase();
    var m = { js: 'javascript', mjs: 'javascript', ts: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown', sh: 'shell' };
    if (editorInstance) { monaco.editor.setModelLanguage(editorInstance.getModel(), m[ext] || 'plaintext'); editorInstance.setValue(d.content); }
    renderFileTree(fullTreeData);
  });
}
function saveActiveFile() {
  if (!currentOpenFile || !editorInstance) return;
  fetch('/api/fs/write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: currentOpenFile, content: editorInstance.getValue() }) })
    .then(function(r) { return r.json(); }).then(function(d) { showToast(d.success ? 'Saved' : 'Save failed'); });
}
function renderEditorTabs() {
  var out = '';
  openTabs.forEach(function(t) {
    var cls = t === currentOpenFile ? ' active' : '';
    out += '<div class="editor-tab' + cls + '" data-p="' + escapeHtml(t) + '" onclick="openFile(this.dataset.p)">' + escapeHtml(t.split('/').pop()) + ' <span data-c="' + escapeHtml(t) + '" onclick="event.stopPropagation();closeTab(this.dataset.c)">x</span></div>';
  });
  document.getElementById('editorTabsContainer').innerHTML = out;
}
function closeTab(p) {
  openTabs = openTabs.filter(function(t) { return t !== p; });
  if (currentOpenFile === p) { if (openTabs.length) openFile(openTabs[openTabs.length - 1]); else { currentOpenFile = null; if (editorInstance) editorInstance.setValue(''); } }
  renderEditorTabs();
}
function runShellCmd(cmd) {
  var logs = document.getElementById('consoleLogs');
  logs.innerText += '\\n> ' + cmd + '\\n';
  fetch('/api/exec/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd }) })
    .then(function(r) { return r.json(); }).then(function(d) { logs.innerText += (d.stdout || d.stderr || '[no output]') + '\\n[exit ' + d.code + ']\\n'; logs.scrollTop = logs.scrollHeight; });
}
function clearConsole() { document.getElementById('consoleLogs').innerText = ''; }
function renderRoomTabs() {
  var out = '';
  roomIds.forEach(function(id) {
    var cls = id === activeRoomId ? ' active' : '';
    var dot = '#64748b', n = 0;
    (lastSquad || []).forEach(function(a) { if (a.id === id && a.alive) { dot = '#00ff88'; n = a.clients || 0; } });
    out += '<div class="room-tab' + cls + '" data-r="' + id + '" onclick="switchRoom(this.dataset.r)"><span style="color:' + dot + ';">●</span>' + escapeHtml(agentMeta[id].title) + (n ? ' (' + n + ')' : '') + '</div>';
  });
  document.getElementById('roomsTabsContainer').innerHTML = out;
}
function createRoomPane(id) {
  if (roomInstances[id]) return roomInstances[id];
  var container = document.getElementById('roomsContainer');
  var pane = document.createElement('div');
  pane.className = 'room-pane' + (id === activeRoomId ? ' active' : '');
  pane.id = 'pane-' + id;
  pane.innerHTML = '<div class="room-pane-bar"><div class="room-pane-title" style="color:' + agentMeta[id].color + '"><span class="ws-dot" style="color:#00ff88;">●</span>' + escapeHtml(agentMeta[id].title) + '</div><span><button class="cmd-btn" data-k="agy\\n" data-r="' + id + '" onclick="sendRawKey(this.dataset.r,this.dataset.k)">START AGY</button> <button class="cmd-btn" data-r="' + id + '" onclick="sendRawKey(this.dataset.r,String.fromCharCode(3))">CTRL+C</button> <button class="cmd-btn" data-r="' + id + '" onclick="sendRawKey(this.dataset.r,String.fromCharCode(12))">CLEAR</button> <button class="cmd-btn" data-r="' + id + '" onclick="restartRoom(this.dataset.r)">↻ RESTART</button></span></div><div class="room-xterm-host" id="xterm-' + id + '"></div><div class="room-input-bar"><input type="text" id="cmd-' + id + '" class="room-input-field" placeholder="Type for ' + id + '..."><button class="btn" data-r="' + id + '" onclick="sendCustomCmd(this.dataset.r)">SEND</button></div>';
  container.appendChild(pane);
  var term = new Terminal({ cursorBlink: true, fontFamily: '"Fira Code", monospace', fontSize: 13, theme: { background: '#000000', foreground: '#e2e8f0', cursor: '#00f0ff' } });
  var fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(pane.querySelector('#xterm-' + id));
  var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var sock = null;
  function setDot(ok) { try { var d = pane.querySelector('.ws-dot'); if (d) d.style.color = ok ? '#00ff88' : '#ff0055'; } catch(e) {} }
  function connectWs() {
    try { if (sock) sock.close(); } catch(e) {}
    sock = new WebSocket(proto + '//' + window.location.host + '/ws/terminal?session=' + encodeURIComponent(id));
    sock.binaryType = 'arraybuffer';
    if (roomInstances[id]) roomInstances[id].sock = sock;
    sock.onopen = function() { setDot(true); safeFit(); };
    sock.onmessage = function(ev) {
      if (typeof ev.data === 'string') term.write(ev.data);
      else term.write(new TextDecoder('utf-8').decode(ev.data));
    };
    sock.onclose = function() { setDot(false); setTimeout(connectWs, 1500); };
    sock.onerror = function() { try { sock.close(); } catch(e) {} };
  }
  term.onData(function(d) { if (sock && sock.readyState === 1) sock.send(d); });
  term.onBell(function() { try { pane.style.boxShadow = '0 0 0 2px #ffea00'; setTimeout(function() { pane.style.boxShadow = ''; }, 700); } catch(e) {} });
  var lastCols = 0, lastRows = 0;
  function safeFit() { try { fit.fit(); if (sock && sock.readyState === 1 && (term.cols !== lastCols || term.rows !== lastRows)) { lastCols = term.cols; lastRows = term.rows; sock.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows })); } } catch(e) {} }
  new ResizeObserver(function() { requestAnimationFrame(safeFit); }).observe(pane.querySelector('#xterm-' + id));
  var input = pane.querySelector('#cmd-' + id);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendCustomCmd(id); });
  roomInstances[id] = { term: term, fit: fit, sock: sock, pane: pane, safeFit: safeFit };
  connectWs();
  return roomInstances[id];
}
function switchRoom(id) {
  activeRoomId = id;
  renderRoomTabs();
  loadInbox();
  Object.keys(roomInstances).forEach(function(k) { roomInstances[k].pane.className = 'room-pane' + (k === activeRoomId ? ' active' : ''); });
  if (lastHud) renderHud(lastHud);
  var inst = roomInstances[id];
  if (inst) setTimeout(function() { inst.safeFit(); inst.term.focus(); }, 40);
}
var splitPct = 50, orient = 'row', layoutTimer = null;
function refitAll() {
  if (editorInstance) { try { editorInstance.layout(); } catch(e) {} }
  Object.values(roomInstances).forEach(function(i) { try { i.safeFit(); } catch(e) {} });
}
function applyLayout() {
  var ws = document.querySelector('.workspace');
  var left = document.querySelector('.left-workstation');
  var right = document.querySelector('.right-workstation');
  ws.classList.toggle('vertical', orient === 'col');
  if (orient === 'col') {
    left.style.width = '100%'; left.style.height = splitPct + '%';
    right.style.width = '100%'; right.style.height = ''; right.style.flex = '1';
  } else {
    left.style.width = splitPct + '%'; left.style.height = '';
    right.style.width = (100 - splitPct) + '%'; right.style.height = '100%'; right.style.flex = '';
  }
  document.getElementById('orientBtn').innerText = orient === 'row' ? '⇔ SPLIT' : '⇕ SPLIT';
  try { localStorage.setItem('df-split', splitPct); localStorage.setItem('df-orient', orient); } catch(e) {}
  setTimeout(refitAll, 60);
}
function applyLayoutSoon() {
  var left = document.querySelector('.left-workstation');
  var right = document.querySelector('.right-workstation');
  if (orient === 'col') { left.style.height = splitPct + '%'; }
  else { left.style.width = splitPct + '%'; right.style.width = (100 - splitPct) + '%'; }
  if (layoutTimer) clearTimeout(layoutTimer);
  layoutTimer = setTimeout(applyLayout, 250);
}
function toggleOrient() {
  orient = orient === 'row' ? 'col' : 'row';
  applyLayout();
}
function loadLayout() {
  try {
    var p = parseFloat(localStorage.getItem('df-split'));
    if (p >= 15 && p <= 85) splitPct = p;
    if (localStorage.getItem('df-orient') === 'col') orient = 'col';
  } catch(e) {}
}
function initSplitter() {
  var sp = document.getElementById('splitter');
  var dragging = false;
  sp.addEventListener('mousedown', function(e) { dragging = true; sp.classList.add('drag'); e.preventDefault(); });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var r = document.querySelector('.workspace').getBoundingClientRect();
    if (orient === 'col') splitPct = Math.min(85, Math.max(15, (e.clientY - r.top) / r.height * 100));
    else splitPct = Math.min(85, Math.max(15, (e.clientX - r.left) / r.width * 100));
    applyLayoutSoon();
  });
  window.addEventListener('mouseup', function() { if (dragging) { dragging = false; sp.classList.remove('drag'); applyLayout(); } });
}
var hudSplitPct = 0, infoHPct = 0;
function applyInfoLayout() {
  var left = document.querySelector('.info-left');
  var split = document.querySelector('.info-split');
  var rooms = document.getElementById('roomsContainer');
  if (hudSplitPct > 0 && left) { left.style.flex = 'none'; left.style.width = hudSplitPct + '%'; }
  if (infoHPct > 0 && split && rooms) {
    split.style.flex = 'none'; split.style.height = infoHPct + '%'; split.style.maxHeight = 'none';
    rooms.style.flex = '1'; rooms.style.minHeight = '0';
  }
  try { localStorage.setItem('df-hud-split', hudSplitPct); localStorage.setItem('df-info-h', infoHPct); } catch(e) {}
  setTimeout(refitAll, 60);
}
function makeDraggable(id, onDrag) {
  var el = document.getElementById(id);
  if (!el) return;
  var dragging = false;
  el.addEventListener('mousedown', function(e) { dragging = true; el.classList.add('vdrag'); e.preventDefault(); });
  window.addEventListener('mousemove', function(e) { if (dragging) onDrag(e); });
  window.addEventListener('mouseup', function() { if (dragging) { dragging = false; el.classList.remove('vdrag'); applyInfoLayout(); } });
}
function initInfoSplitters() {
  makeDraggable('hudVsplit', function(e) {
    var r = document.querySelector('.info-split').getBoundingClientRect();
    hudSplitPct = Math.min(80, Math.max(20, (e.clientX - r.left) / r.width * 100));
    var left = document.querySelector('.info-left');
    left.style.flex = 'none'; left.style.width = hudSplitPct + '%';
  });
  makeDraggable('infoHsplit', function(e) {
    var rw = document.querySelector('.right-workstation').getBoundingClientRect();
    infoHPct = Math.min(70, Math.max(10, (e.clientY - rw.top) / rw.height * 100));
    var split = document.querySelector('.info-split');
    split.style.flex = 'none'; split.style.height = infoHPct + '%'; split.style.maxHeight = 'none';
  });
  try {
    var a = parseFloat(localStorage.getItem('df-hud-split'));
    if (a >= 20 && a <= 80) hudSplitPct = a;
    var b = parseFloat(localStorage.getItem('df-info-h'));
    if (b >= 10 && b <= 70) infoHPct = b;
  } catch(e) {}
  applyInfoLayout();
}
function toggleViewMode() {
  isGridMode = !isGridMode;
  document.getElementById('roomsContainer').className = 'rooms-container' + (isGridMode ? ' grid-mode' : '');
  document.getElementById('viewModeBtn').innerText = isGridMode ? 'FOCUS' : 'GRID';
  setTimeout(function() { Object.values(roomInstances).forEach(function(i) { i.safeFit(); }); }, 60);
}
function toggleExplorer() {
  var left = document.querySelector('.left-workstation');
  left.classList.toggle('hide-explorer');
  var hidden = left.classList.contains('hide-explorer');
  var btn = document.getElementById('explorerBtn');
  btn.className = hidden ? 'btn off' : 'btn';
  btn.innerText = hidden ? 'SHOW EXPLORER' : 'EXPLORER';
  setTimeout(function() { if (editorInstance) editorInstance.layout(); }, 60);
}
function toggleCodePane() {
  var ws = document.querySelector('.workspace');
  ws.classList.toggle('focus-right');
  var hidden = ws.classList.contains('focus-right');
  var btn = document.getElementById('codeBtn');
  btn.className = hidden ? 'btn off' : 'btn';
  btn.innerText = hidden ? 'SHOW CODE' : 'CODE';
  setTimeout(function() {
    if (editorInstance) editorInstance.layout();
    Object.values(roomInstances).forEach(function(i) { try { i.safeFit(); } catch(e) {} });
  }, 60);
}
function sendCustomCmd(id) {
  var input = document.getElementById('cmd-' + id);
  var txt = input.value;
  if (!txt) return;
  var inst = roomInstances[id];
  if (inst && inst.sock.readyState === 1) { inst.sock.send(txt + '\\n'); input.value = ''; inst.term.focus(); }
}
function sendRawKey(id, key) {
  var inst = roomInstances[id];
  if (inst && inst.sock.readyState === 1) { inst.sock.send(key); inst.term.focus(); }
}
function broadcastCmd() {
  var input = document.getElementById('broadcastInput');
  var txt = input.value.trim();
  if (!txt) return;
  fetch('/api/squad/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt + '\\n' }) });
  input.value = '';
  showToast('Broadcasted to 5 PTYs');
}
function dispatchToAgent(target, text) {
  fetch('/api/squad/send-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: target, text: text }) })
    .then(function() { showToast('Sent to ' + target); sfx('send'); });
}
function dispatchFromBar() {
  var sel = document.getElementById('dispatchTarget');
  var input = document.getElementById('dispatchText');
  var txt = input.value;
  if (!txt) return;
  if (txt.slice(-1) !== '\\n') txt += '\\n';
  dispatchToAgent(sel.value, txt);
  input.value = '';
}
function delegateTask() {
  var sel = document.getElementById('dispatchTarget');
  var input = document.getElementById('dispatchText');
  var txt = input.value.trim();
  if (!txt) return;
  fetch('/api/squad/delegate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: activeRoomId, to: sel.value, task: txt }) })
    .then(function(r) { return r.json(); }).then(function(d) {
      showToast(d.status === 'ok' ? 'Task delegated: ' + d.id : 'Delegate failed');
      if (d.status === 'ok') sfx('task');
      input.value = '';
    });
}
var skillCatalog = [];
function toggleSkillDrawer() {
  var d = document.getElementById('skillDrawer');
  var open = d.style.display === 'none';
  d.style.display = open ? 'flex' : 'none';
  if (open && !skillCatalog.length) {
    fetch('/api/squad/skill-catalog').then(function(r) { return r.json(); }).then(function(x) {
      skillCatalog = x.skills || [];
      document.getElementById('skillCount').innerText = '(' + skillCatalog.length + ')';
      renderSkillList('');
    });
  }
}
function renderSkillList(f) {
  f = (f || '').toLowerCase();
  var out = '', lastCat = '';
  skillCatalog.forEach(function(s) {
    if (f && (s.name + ' ' + s.trigger + ' ' + s.action + ' ' + s.category).toLowerCase().indexOf(f) === -1) return;
    if (s.category !== lastCat) { lastCat = s.category; out += '<div class="skill-cat">' + escapeHtml(lastCat) + '</div>'; }
    out += '<div class="skill-card"><div class="skill-name">' + escapeHtml(s.name) + '</div><div class="skill-desc">' + escapeHtml(s.trigger) + '</div><div class="skill-desc" style="color:#7f8fa4;">' + escapeHtml(s.action) + '</div><button class="btn" style="margin-top:6px;" data-s="' + escapeHtml(s.name) + '" onclick="useSkill(this.dataset.s)">USE IN ACTIVE ROOM</button></div>';
  });
  document.getElementById('skillList').innerHTML = out || 'No match';
}
function useSkill(name) {
  var s = null;
  skillCatalog.forEach(function(x) { if (x.name === name) s = x; });
  if (!s) return;
  var txt = '[SKILL:' + s.name + ']\\nTrigger: ' + s.trigger + '\\nAction: ' + s.action + '\\nโปรดใช้สกิลนี้กับงานปัจจุบันของห้องนี้';
  fetch('/api/squad/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'web-ui', target: activeRoomId, text: txt }) }).then(function() { showToast('Skill ' + name + ' sent to ' + activeRoomId); });
}
function toggleInbox() {
  var dr = document.getElementById('inboxDrawer');
  dr.style.display = dr.style.display === 'none' ? 'block' : 'none';
  if (dr.style.display === 'block') loadInbox();
}
function loadInbox() {
  fetch('/api/squad/inbox?target=' + encodeURIComponent(activeRoomId)).then(function(r) { return r.json(); }).then(function(d) {
    var tasks = d.tasks || [];
    document.getElementById('inboxBtn').innerText = 'INBOX (' + tasks.length + ')';
    if ((activeRoomId in inboxCounts) && tasks.length > inboxCounts[activeRoomId]) {
      showToast('📥 งานใหม่เข้า ' + activeRoomId + ' (' + tasks.length + ')');
      document.getElementById('inboxDrawer').style.display = 'block';
      sfx('task');
    }
    inboxCounts[activeRoomId] = tasks.length;
    var cur = tasks.map(function(t) { return t.id; });
    var prev = inboxIds[activeRoomId] || null;
    inboxIds[activeRoomId] = cur;
    if (prev) {
      var gone = prev.filter(function(id) { return cur.indexOf(id) === -1; });
      if (gone.length) sfx('done');
    }
    var out = '';
    tasks.forEach(function(t) {
      out += '<div class="task-card"><div><b>' + escapeHtml(t.id) + '</b> from <b>' + escapeHtml(t.from) + '</b> <span style="color:#7f8fa4;">' + new Date(t.created_at).toLocaleTimeString() + '</span><div>' + escapeHtml(t.task) + '</div>' + (t.context ? '<div style="color:#7f8fa4;">ctx: ' + escapeHtml(t.context) + '</div>' : '') + '</div><div style="display:flex;gap:4px;margin-top:4px;"><input type="text" id="res-' + t.id + '" class="room-input-field" placeholder="result back to ' + escapeHtml(t.from) + '..."><button class="btn" data-t="' + t.id + '" onclick="ackTask(this.dataset.t)">ACK+DONE</button></div></div>';
    });
    document.getElementById('inboxDrawer').innerHTML = out || '<div style="color:#7f8fa4;font-size:10px;">No pending tasks for ' + escapeHtml(activeRoomId) + '</div>';
  });
}
function ackTask(id) {
  var input = document.getElementById('res-' + id);
  var result = input ? input.value : '';
  fetch('/api/squad/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: activeRoomId, id: id, result: result }) })
    .then(function() { showToast('Acked ' + id); loadInbox(); });
}
function loadGoal() {
  fetch('/api/squad/goal').then(function(r) { return r.json(); }).then(function(d) {
    var g = '';
    try { g = String(d.goal || '').split('\\n').filter(function(l) { return l && l[0] !== '#' && l[0] !== '_'; }).join(' ').slice(0, 160); } catch (e) {}
    document.getElementById('goalText').innerText = g || '— no goal set —';
  });
}
function setGoal() {
  var input = document.getElementById('goalInput');
  var txt = input.value.trim();
  if (!txt) return;
  fetch('/api/squad/goal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt, from: activeRoomId }) })
    .then(function() { input.value = ''; loadGoal(); showToast('Goal updated'); sfx('goal'); });
}
function loadSquadDir() {
  fetch('/api/squad/agents').then(function(r) { return r.json(); }).then(function(d) {
    lastSquad = d.agents || [];
    var anyAlive = lastSquad.some(function(a) { return a.alive; });
    if (!anyAlive) {
      document.getElementById('squadDir').innerHTML = '<div class="hud-row"><span class="hud-label">SQUAD</span><span class="hud-value" style="color:#FFD000;">○ offline — กด LAUNCH ALL 5 เพื่อปลุกทีม</span></div>';
      renderRoomTabs();
      if (lastHud) renderStatusline(lastHud);
      return;
    }
    var out = '';
    lastSquad.forEach(function(a) {
      var dot = a.alive ? '#00ff88' : '#64748b';
      var extra = a.alive ? ' • ' + (a.clients || 0) + ' viewers • ' + agoFmt(a.last_active) : ' • down';
      out += '<div class="hud-row" title="' + escapeHtml(a.role || '') + '"><span class="hud-label"><span style="color:' + dot + ';">●</span> ' + escapeHtml(a.title) + '</span><span class="hud-value">' + escapeHtml(extra) + '</span></div>';
      if (a.alive && a.last_line) out += '<div class="hud-row"><span class="hud-label">└ last</span><span class="hud-value" style="color:' + (a.color || '#7f8fa4') + ';">' + escapeHtml(a.last_line) + '</span></div>';
    });
    document.getElementById('squadDir').innerHTML = out || 'No agents';
    renderRoomTabs();
    if (lastHud) renderStatusline(lastHud);
  });
}
function startAllSquad() {
  fetch('/api/squad/start-all', { method: 'POST' }).then(function(r) { return r.json(); }).then(function() { showToast('All 5 PTYs launched'); });
}
function clearActiveRoom() { sendRawKey(activeRoomId, String.fromCharCode(12)); }
function restartRoom(id) {
  id = id || activeRoomId;
  var inst = roomInstances[id];
  if (inst) { try { inst.term.clear(); } catch(e) {} }
  fetch('/api/squad/kill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: id }) })
    .then(function() { showToast('↻ Restarted ' + id + ' (fresh shell)'); });
}
var hudTab = 'dashboard';
var lastHud = null;
var lastSquad = [];
var inboxCounts = {};
var inboxIds = {};
function agoFmt(ts) {
  if (!ts) return '—';
  var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  var m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  return Math.floor(m / 60) + 'h ago';
}
function setHudTab(t) { hudTab = t; if (lastHud) renderHud(lastHud); else renderHudTabs(); }
function renderHudTabs() {
  var tabs = [['dashboard', 'ALL-IN-ONE'], ['tokens', 'TOKENS'], ['quota', 'QUOTA']];
  var out = '';
  tabs.forEach(function(t) {
    var cls = hudTab === t[0] ? 'hud-tab active' : 'hud-tab';
    out += '<span class="' + cls + '" data-h="' + t[0] + '" onclick="setHudTab(this.dataset.h)">' + t[1] + '</span>';
  });
  document.getElementById('hudTabs').innerHTML = out;
}
function hudBar(p) {
  p = Math.max(0, Math.min(100, Number(p) || 0));
  var col = p >= 85 ? '#ff0054' : p >= 60 ? '#ffea00' : '#00f0ff';
  return '<div class="bar"><div class="bar-fill" style="width:' + Math.round(p) + '%;background:' + col + '"></div></div>';
}
function hudRow(label, valueHtml) {
  return '<div class="hud-row"><span class="hud-label">' + label + '</span><span class="hud-value">' + valueHtml + '</span></div>';
}
function renderHud(d) {
  lastHud = d;
  renderHudTabs();
  var agent = agentMeta[activeRoomId] || agentMeta['agy-leader'];
  var agentEl = document.getElementById('hudAgent');
  agentEl.innerText = agent.title + ' - LIVE AI SESSION';
  agentEl.style.color = agent.color;
  var grid = document.getElementById('hudGrid');
  var st = String(d.agent_state || 'ready').toUpperCase();
  var stColor = st === 'READY' || st === 'IDLE' ? '#00ff88' : st === 'WORKING' ? '#00f0ff' : st === 'THINKING' ? '#ffea00' : '#b026ff';
  var model = d.model ? (d.model.display_name || d.model.id || 'Antigravity') : 'Antigravity';
  var proj = '?';
  try { proj = (d.workspace && d.workspace.project_dir) || d.cwd || '?'; proj = String(proj).split('/').pop() || proj; } catch (e) {}
  var git = '';
  try { if (d.vcs && d.vcs.branch) git = d.vcs.branch + (d.vcs.dirty ? ' *' : ' ✓'); } catch (e) {}
  var ctx = d.context_window || {};
  var ctxP = Number(ctx.used_percentage) || 0;
  var hasTurn = !!(ctx.current_usage && (ctx.current_usage.input_tokens || ctx.current_usage.output_tokens));
  var inTok = '0', outTok = '0', cacheTok = '0', totalTok = '0';
  try {
    var cu = ctx.current_usage || {};
    inTok = Number(cu.input_tokens || 0).toLocaleString();
    outTok = Number(cu.output_tokens || 0).toLocaleString();
    cacheTok = Number(cu.cache_read_input_tokens || 0).toLocaleString();
    totalTok = (Number(ctx.total_input_tokens || 0) + Number(ctx.total_output_tokens || 0)).toLocaleString();
  } catch (e) {}
  var out = '';
  if (hudTab === 'dashboard') {
    out += hudRow('STATUS', '<span class="status-badge" style="background:rgba(0,255,136,0.15);color:' + stColor + ';border:1px solid ' + stColor + ';">' + escapeHtml(st) + '</span>');
    out += hudRow('MODEL', escapeHtml(String(model)));
    out += hudRow('PROJECT', escapeHtml(String(proj)));
    if (git) out += hudRow('GIT', escapeHtml(String(git)));
    out += '<div>' + hudRow('MEMORY ' + ctxP.toFixed(1) + '%', '') + hudBar(ctxP) + '</div>';
    if (hasTurn) out += hudRow('TOKENS', 'in ' + inTok + ' / out ' + outTok + ' / cache ' + cacheTok);
    else if (totalTok !== '0') out += hudRow('TOKENS Σ', totalTok);
    var keys = Object.keys(d.quota || {}).slice(0, 3);
    keys.forEach(function(k) {
      var q = d.quota[k] || {};
      var rem = Math.round(Number(q.remaining_fraction || 0) * 100);
      out += hudRow(escapeHtml(k), rem + '%');
    });
    if (d.task_count || d.artifact_count) out += hudRow('WORK', Number(d.task_count || 0) + ' tasks / ' + Number(d.artifact_count || 0) + ' artifacts');
    if (d.tool_confirmation_pending) out += hudRow('ALERT', '<span style="color:#ff0054;font-weight:700;">CONFIRMATION PENDING</span>');
  } else if (hudTab === 'tokens') {
    out += hudRow('USAGE', ctxP.toFixed(2) + '% / 1M');
    out += '<div>' + hudBar(ctxP) + '</div>';
    if (hasTurn) {
      out += hudRow('TURN IN', inTok);
      out += hudRow('TURN OUT', outTok);
      out += hudRow('CACHED READ', cacheTok);
    }
    out += hudRow('TOTAL SESSION', totalTok);
    try { out += hudRow('WINDOW', Number(ctx.context_window_size || 0).toLocaleString()); } catch (e) {}
  } else {
    var qkeys = Object.keys(d.quota || {});
    if (!qkeys.length) out += hudRow('QUOTA', '— idle (รัน agy เพื่อดูโควตา)');
    qkeys.forEach(function(k) {
      var q = d.quota[k] || {};
      var rem = Math.round(Number(q.remaining_fraction || 0) * 100);
      var reset = '';
      if (q.reset_in_seconds) {
        var mins = Math.ceil(Number(q.reset_in_seconds) / 60);
        reset = mins >= 60 ? ' (' + Math.floor(mins / 60) + 'h' + (mins % 60) + 'm)' : ' (' + mins + 'm)';
      }
      out += '<div>' + hudRow(escapeHtml(k) + ' ' + rem + '%' + reset, '') + hudBar(rem) + '</div>';
    });
  }
  grid.innerHTML = out;
}
function fetchHud() {
  fetch('/api/state').then(function(r) { return r.json(); }).then(function(d) {
    renderHud(d); renderStatusline(d);
    if (d.tool_confirmation_pending && !lastToolConfirm) sfx('alert');
    lastToolConfirm = !!d.tool_confirmation_pending;
  }).catch(function() {});
}
function slPill(color, text) {
  return '<span class="sl-pill" style="color:' + color + ';border-color:' + color + '55;">' + text + '</span>';
}
function renderStatusline(d) {
  var P = [];
  var sq = null;
  (lastSquad || []).forEach(function(a) { if (a.id === activeRoomId) sq = a; });
  var am = agentMeta[activeRoomId] || { title: activeRoomId, color: '#00f0ff' };
  if (sq && sq.alive) {
    P.push(slPill(am.color, escapeHtml(am.title) + ' ●live' + (sq.clients ? ' +' + sq.clients : '') + (sq.last_line ? ' — ' + escapeHtml(sq.last_line) : '')));
  } else {
    P.push(slPill('#64748B', escapeHtml(am.title) + ' ○idle'));
  }
  P.push(slPill(d.product ? '#7AA2F7' : '#475569', '<span class="sl-tag">APP</span>' + escapeHtml(d.product || '—')));
  P.push(slPill(d.version ? '#7AA2F7' : '#475569', '<span class="sl-tag">VER</span>v' + escapeHtml(d.version || '—')));
  P.push(slPill(d.plan_tier ? '#FFD000' : '#475569', '★ ' + escapeHtml(d.plan_tier || '—')));
  P.push(slPill(d.email ? '#7AA2F7' : '#475569', escapeHtml(d.email || 'no login')));
  var vimThai = { NORMAL: 'ปกติ', INSERT: 'พิมพ์', VISUAL: 'เลือก' };
  if (d.vim && d.vim.mode) {
    var vc = d.vim.mode === 'INSERT' ? '#00FF88' : d.vim.mode === 'VISUAL' ? '#BD00FF' : '#FFD000';
    P.push(slPill(vc, 'VIM ' + escapeHtml(vimThai[d.vim.mode] || d.vim.mode)));
  } else {
    P.push(slPill('#475569', 'VIM —'));
  }
  var states = {
    working: ['กำลังทำงาน', '#00F0FF'], thinking: ['กำลังคิดวิเคราะห์', '#FFD000'],
    tool_use: ['เรียกใช้เครื่องมือ', '#BD00FF'], idle: ['พร้อมทำงาน', '#00FF88'],
    initializing: ['เริ่มระบบ', '#64748B'], paused: ['หยุดชั่วคราว', '#FF0055']
  };
  var sk = String(d.agent_state || 'idle');
  var sm = states[sk] || [sk.toUpperCase(), '#7AA2F7'];
  P.push(slPill(sm[1], '● ' + escapeHtml(sm[0])));
  var dir = '?';
  try { dir = String((d.workspace && d.workspace.project_dir) || d.cwd || '~').split('/').pop() || '~'; } catch (e) {}
  P.push(slPill('#7AA2F7', '📁 ' + escapeHtml(dir)));
  if (d.vcs && d.vcs.branch) {
    P.push(slPill('#BD00FF', escapeHtml(d.vcs.type ? d.vcs.type + ':' : '') + escapeHtml(d.vcs.branch) + (d.vcs.dirty ? ' *' : '')));
  } else {
    P.push(slPill('#475569', 'GIT —'));
  }
  var ctx = d.context_window || {};
  var pct = Number(ctx.used_percentage);
  if (isFinite(pct)) {
    var b = Math.max(0, Math.min(100, pct));
    var filled = Math.round(b / 100 * 8), bar = '', i;
    var tone = b >= 85 ? '#FF0055' : b >= 65 ? '#FFD000' : '#00FF88';
    for (i = 0; i < filled; i++) bar += '▰';
    for (i = filled; i < 8; i++) bar += '▱';
    var ex = d.exceeds_200k_tokens ? ' [&gt;200k คิดลึก]' : '';
    P.push(slPill(tone, 'บริบท ' + b.toFixed(1) + '% ' + bar + ex));
  }
  var model = d.model ? String(d.model.display_name || '').replace(/^gemini\s+/i, '') : '';
  if (model) {
    P.push(slPill('#00F0FF', '<span class="sl-tag">MODEL</span>' + escapeHtml(model) + (d.model && d.model.effort ? ' [' + escapeHtml(d.model.effort) + ']' : '')));
  } else {
    P.push(slPill('#475569', '<span class="sl-tag">MODEL</span>—'));
  }
  var qkeys = d.quota ? Object.keys(d.quota) : [];
  qkeys.forEach(function(k) {
    var qf = Number((d.quota[k] || {}).remaining_fraction);
    if (!isFinite(qf)) return;
    var qp = Math.round(qf * 100);
    var qc = qp <= 20 ? '#FF0055' : qp <= 40 ? '#FFD000' : '#00F0FF';
    var rs = '';
    try {
      var rsec = Number((d.quota[k] || {}).reset_in_seconds);
      if (rsec > 0) {
        var rh = Math.floor(rsec / 3600), rm = Math.floor((rsec % 3600) / 60);
        rs = rh ? ' ' + rh + 'h' + rm + 'm' : ' ' + rm + 'm';
      }
    } catch (e2) {}
    P.push(slPill(qc, escapeHtml(k) + ' ' + qp + '%' + rs));
  });
  if (!qkeys.length) P.push(slPill('#475569', 'QUOTA —'));
  var tIn = Number(ctx.total_input_tokens) || 0, tOut = Number(ctx.total_output_tokens) || 0;
  if (tIn + tOut > 0) P.push(slPill('#7AA2F7', 'Σ in ' + tIn.toLocaleString() + ' / out ' + tOut.toLocaleString()));
  try {
    var syncT = new Date(d.updated_at).toLocaleTimeString('th-TH', { hour12: false });
    if (syncT) P.push(slPill('#475569', 'sync ' + syncT));
  } catch (e) {}
  if (d.execution_mode) {
    var em = { autonomous: 'อัตโนมัติ', planning: 'วางแผนงาน', code_review: 'ตรวจทานโค้ด', safe_eval: 'ทดสอบความปลอดภัย' };
    P.push(slPill('#00FF88', '🎯 ' + escapeHtml(em[d.execution_mode] || d.execution_mode)));
  } else {
    P.push(slPill('#475569', '🎯 mode —'));
  }
  if (d.sandbox && d.sandbox.enabled) {
    P.push(slPill('#00FF88', '🛡 sandbox:' + (d.sandbox.allow_network ? 'net' : 'off')));
  } else {
    P.push(slPill('#475569', '🛡 sandbox: off'));
  }
  var artN = Number(d.artifact_count) || 0;
  P.push(slPill(artN ? '#00F0FF' : '#475569', '▤ ' + artN));
  var taskN = Number(d.task_count) || 0;
  P.push(slPill(taskN ? '#FFD000' : '#475569', '✓ ' + taskN));
  var subs = Array.isArray(d.subagents) ? d.subagents.length : (Number(d.subagents_count) || 0);
  P.push(slPill(subs ? '#BD00FF' : '#475569', '🤖 ' + subs));
  var pendN = Number(d.pending_input_count) || 0;
  P.push(slPill(pendN ? '#FF0055' : '#475569', '⏳ ' + pendN));
  var tw = Number(d.terminal_width);
  P.push(slPill(isFinite(tw) && tw ? '#7AA2F7' : '#475569', '⌁ ' + ((isFinite(tw) && tw) ? tw + 'cols' : '—')));
  var sessId = d.session_id || d.conversation_id || '';
  P.push(slPill(sessId ? '#7AA2F7' : '#475569', 'sess ' + (sessId ? escapeHtml(String(sessId).slice(0, 8)) : '—')));
  if (d.tool_confirmation_pending) P.push('<span class="sl-pill" style="background:#FF0055;color:#000;font-weight:700;">⚠ รอการอนุมัติคำสั่ง</span>');
  document.getElementById('slBar').innerHTML = P.join('<span class="sl-sep">•</span>') || '<span style="color:#64748B;">● ออฟไลน์</span>';
}
window.onload = function() {
  initMonaco(); loadFileTree(); renderRoomTabs();
  roomIds.forEach(function(id) { createRoomPane(id); });
  startAllSquad(); fetchHud(); setInterval(fetchHud, 1500); loadSquadDir(); setInterval(loadSquadDir, 5000);
  loadInbox(); setInterval(loadInbox, 5000); loadGoal(); setInterval(loadGoal, 10000);
  loadLayout(); initSplitter(); applyLayout(); initInfoSplitters(); initAudioBtn();
};
</script>
</body>
</html>`;

const monitorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SQUAD MONITOR // SQLite + Live Feed</title>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&family=Orbitron:wght@600;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#06090f; color:#f0f6fc; font-family:'Fira Code',monospace; font-size:12px; padding:12px; }
  a { color:#00f0ff; }
  header { display:flex; gap:10px; align-items:center; margin-bottom:12px; font-family:'Orbitron'; }
  header h1 { font-size:15px; letter-spacing:2px; }
  .btn { background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.35); color:#00f0ff; font-family:'Orbitron'; font-size:10px; font-weight:700; padding:4px 10px; border-radius:4px; cursor:pointer; }
  .btn.off { opacity:0.45; }
  .cards { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
  .card { background:rgba(18,24,38,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 14px; min-width:130px; }
  .card .k { font-size:10px; color:#7f8fa4; }
  .card .v { font-size:20px; font-weight:700; color:#00f0ff; }
  .cols { display:flex; gap:12px; }
  .panel { flex:1; min-width:0; background:rgba(10,14,22,0.95); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px; }
  .panel h2 { font-family:'Orbitron'; font-size:11px; color:#7f8fa4; margin-bottom:6px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  td, th { padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.05); text-align:left; vertical-align:top; }
  .feed { max-height:46vh; overflow-y:auto; }
  .msg { border-left:3px solid #7f8fa4; padding:4px 8px; margin-bottom:6px; background:rgba(255,255,255,0.02); }
  .msg.fresh { border-color:#ffea00; box-shadow:0 0 12px -4px #ffea00; }
  .meta { font-size:10px; color:#7f8fa4; }
  select { background:#000; border:1px solid rgba(0,240,255,0.35); color:#00f0ff; font-family:'Fira Code'; font-size:11px; padding:2px 6px; border-radius:3px; }
  .goalbox { margin:12px 0; padding:8px 12px; border:1px solid rgba(255,234,0,0.3); border-radius:6px; background:rgba(255,234,0,0.04); }
</style>
</head>
<body>
<header><h1>🦌 SQUAD MONITOR</h1><a href="/">← back to workbench</a><span style="flex:1;"></span><button class="btn" id="pauseBtn" onclick="togglePause()">PAUSE</button></header>
<div class="cards" id="statCards"></div>
<div class="goalbox"><b style="color:#ffea00;">GOAL:</b> <span id="monGoal">—</span></div>
<div class="cols">
  <div class="panel"><h2>SQUAD (from daemon)</h2><table id="monSquad"></table></div>
  <div class="panel" style="flex:0.8;"><h2>EDITING NOW (claims)</h2><table id="monClaims"></table></div>
  <div class="panel" style="flex:1;"><h2>KNOWLEDGE BASE</h2><table id="monKnowledge"></table></div>
  <div class="panel" style="flex:1.6;"><h2>MESSAGE FEED (SQLite)
    <select id="fTarget" onchange="monTarget=this.value;loadFeed();"><option value="">all rooms</option><option value="agy-leader">agy-leader</option><option value="ai-research">ai-research</option><option value="ai-coder">ai-coder</option><option value="ai-qa">ai-qa</option><option value="ai-reviewer">ai-reviewer</option></select>
    <select id="fKind" onchange="monKind=this.value;loadFeed();"><option value="">all kinds</option><option value="chat">chat</option><option value="task">task</option><option value="result">result</option><option value="system">system</option></select></h2>
    <div class="feed" id="monFeed"></div></div>
</div>
<script>
var monTarget = '';
var monKind = '';
var monPaused = false;
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function togglePause() { monPaused = !monPaused; document.getElementById('pauseBtn').innerText = monPaused ? 'RESUME' : 'PAUSE'; document.getElementById('pauseBtn').className = monPaused ? 'btn off' : 'btn'; }
function ago(ts) { if (!ts) return '—'; var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); if (s < 5) return 'just now'; if (s < 60) return s + 's'; var m = Math.floor(s / 60); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h'; }
function tstr(ts) { try { return new Date(ts).toLocaleTimeString('th-TH', { hour12: false }); } catch (e) { return ''; } }
function kindColor(k) { return k === 'task' ? '#ffea00' : k === 'result' ? '#00ff88' : k === 'system' ? '#b026ff' : '#00f0ff'; }
function loadStats() {
  fetch('/api/squad/stats').then(function(r) { return r.json(); }).then(function(d) {
    var s = d.stats || {};
    document.getElementById('statCards').innerHTML =
      '<div class="card"><div class="k">MESSAGES</div><div class="v">' + (s.total || 0) + '</div></div>' +
      '<div class="card"><div class="k">PENDING TASKS</div><div class="v" style="color:' + ((s.pending || 0) ? '#ffea00' : '#00ff88') + ';">' + (s.pending || 0) + '</div></div>' +
      '<div class="card"><div class="k">CHAT / TASK / RESULT</div><div class="v" style="font-size:15px;">' + (s.chat || 0) + ' / ' + (s.task || 0) + ' / ' + (s.result || 0) + '</div></div>' +
      '<div class="card"><div class="k">DB SIZE</div><div class="v" style="font-size:15px;">' + Math.round((s.db_bytes || 0) / 1024) + ' KB</div></div>';
  }).catch(function() {});
}
function loadSquad() {
  fetch('/api/squad/agents').then(function(r) { return r.json(); }).then(function(d) {
    var out = '<tr><th>room</th><th>state</th><th>viewers</th><th>active</th><th>last line</th></tr>';
    (d.agents || []).forEach(function(a) {
      var dot = a.alive ? '#00ff88' : '#64748b';
      out += '<tr><td style="color:' + (a.color || '#fff') + ';">' + esc(a.title) + '</td><td style="color:' + dot + ';">' + (a.alive ? '● live' : '○ down') + '</td><td>' + (a.clients || 0) + '</td><td>' + ago(a.last_active) + '</td><td>' + esc(a.last_line || '') + '</td></tr>';
    });
    document.getElementById('monSquad').innerHTML = out;
  }).catch(function() {});
}
function loadFeed() {
  var url = '/api/squad/history?limit=60' + (monTarget ? '&target=' + encodeURIComponent(monTarget) : '');
  fetch(url).then(function(r) { return r.json(); }).then(function(d) {
    var out = '';
    (d.messages || []).forEach(function(m) {
      if (monKind && m.kind !== monKind) return;
      var fresh = (Date.now() - m.created_at) < 20000 ? ' fresh' : '';
      out += '<div class="msg' + fresh + '" style="border-color:' + kindColor(m.kind) + ';"><div class="meta">' + tstr(m.created_at) + ' · ' + esc(m.kind) + ' · ' + esc(m.from) + ' → ' + esc(m.to) + ' · ' + esc(m.id) + ' · ' + esc(m.status || '') + '</div><div>' + esc(m.body) + '</div>' + (m.context ? '<div class="meta">ctx: ' + esc(m.context) + '</div>' : '') + '</div>';
    });
    document.getElementById('monFeed').innerHTML = out || '<div class="meta">no messages yet</div>';
  }).catch(function() {});
}
function loadGoal() {
  fetch('/api/squad/goal').then(function(r) { return r.json(); }).then(function(d) {
    var g = '';
    try { g = String(d.goal || '').split('\\n').filter(function(l) { return l && l[0] !== '#' && l[0] !== '_'; }).join(' ').slice(0, 200); } catch (e) {}
    document.getElementById('monGoal').innerText = g || '— no goal set —';
  }).catch(function() {});
}
function loadKnowledge() {
  fetch('/api/squad/knowledge').then(function(r) { return r.json(); }).then(function(d) {
    var out = '';
    (d.knowledge || []).forEach(function(k) {
      var dt = '';
      try { dt = new Date(k.updated_at).toLocaleDateString('th-TH') + ' ' + new Date(k.updated_at).toLocaleTimeString('th-TH', { hour12: false }); } catch (e) {}
      out += '<tr><td style="color:#b026ff;">' + esc(k.topic) + '</td><td>' + esc((k.summary || '').slice(0, 90)) + '</td><td>' + esc(k.author || '') + '</td><td>' + dt + '</td></tr>';
    });
    document.getElementById('monKnowledge').innerHTML = out || '<tr><td class="meta">empty — remember something first</td></tr>';
  }).catch(function() {});
}
function loadClaims() {
  fetch('/api/squad/claims').then(function(r) { return r.json(); }).then(function(d) {
    var out = '';
    (d.claims || []).forEach(function(c) {
      var dot = c.dirty ? '#ffea00' : '#00ff88';
      var who = c.owner + ((c.mates && c.mates.length) ? '+' + c.mates.join('+') : '');
      out += '<tr><td style="color:' + dot + ';">' + (c.dirty ? '●' : '○') + '</td><td>' + esc(c.path) + '</td><td>' + esc(who) + ' [' + esc(c.mode || 'exclusive') + ']</td></tr>';
    });
    document.getElementById('monClaims').innerHTML = out || '<tr><td class="meta">no active claims</td></tr>';
  }).catch(function() {});
}
function tick() { if (monPaused) return; loadStats(); loadSquad(); loadFeed(); loadGoal(); loadClaims(); loadKnowledge(); }
tick();
setInterval(tick, 2000);
</script>
</body>
</html>`;

// ---- skill combo catalog (parsed once from antigravity_skills.html) ----
function loadSkillCatalog() {
  try {
    const p = fileURLToPath(new URL('./antigravity_skills.html', import.meta.url));
    const raw = readFileSync(p, 'utf8');
    const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanP = (s) => strip(s).replace(/^[^:]*:\s*/, '');
    const items = [];
    let cat = 'General';
    const re = /<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>(?:[\s\S]*?<\/i>)?\s*([^<]+?)\s*<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
    let m = null;
    while ((m = re.exec(raw)) !== null) {
      if (m[1] !== undefined) { cat = strip(m[1]); continue; }
      const name = (m[2] || '').trim();
      if (!name) continue;
      items.push({ category: cat, name, trigger: cleanP(m[3]), action: cleanP(m[4]) });
    }
    return items;
  } catch { return []; }
}
const skillCatalog = loadSkillCatalog();
console.log(`skill catalog: ${skillCatalog.length} skills loaded`);

function sendJson(res, obj, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => resolve(body));
  });
}

const server = createServer(async (req, res) => {
  const urlObj = new URL(req.url, 'http://localhost');

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  if (urlObj.pathname === '/monitor' || urlObj.pathname === '/monitor.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(monitorHtml);
    return;
  }
  if (urlObj.pathname === '/manual' || urlObj.pathname === '/manual.html') {
    try {
      const manualPath = fileURLToPath(new URL('./manual.html', import.meta.url));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(manualPath, 'utf8'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('manual.html not found next to hud-web.mjs');
    }
    return;
  }
  if (urlObj.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (urlObj.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(readState()));
    return;
  }
  if (urlObj.pathname === '/api/fs/tree') {
    return sendJson(res, { success: true, tree: getFileTree() });
  }
  if (urlObj.pathname === '/api/fs/read') {
    try {
      const safe = getSafePath(urlObj.searchParams.get('path'));
      return sendJson(res, { success: true, content: readFileSync(safe, 'utf8'), path: urlObj.searchParams.get('path') });
    } catch (err) { return sendJson(res, { success: false, error: err.message }, 400); }
  }
  if (urlObj.pathname === '/api/fs/write' && req.method === 'POST') {
    try {
      const { path: relPath, content } = JSON.parse(await readBody(req));
      writeFileSync(getSafePath(relPath), content, 'utf8');
      return sendJson(res, { success: true, path: relPath });
    } catch (err) { return sendJson(res, { success: false, error: err.message }, 400); }
  }
  if (urlObj.pathname === '/api/exec/run' && req.method === 'POST') {
    try {
      const { command, cwd } = JSON.parse(await readBody(req));
      const proc = spawn(command, { shell: true, cwd: cwd ? getSafePath(cwd) : WORKSPACE_DIR });
      let stdout = '', stderr = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => sendJson(res, { code: code || 0, stdout, stderr }));
    } catch (err) { return sendJson(res, { code: 1, error: err.message }, 500); }
    return;
  }
  if (urlObj.pathname === '/api/squad/start-all' && req.method === 'POST') {
    try {
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'start_all' }));
    } catch (err) { return sendJson(res, { status: 'error', error: err.message }, 500); }
  }
  // Who-is-who directory: ให้ frontend/คนดูรู้ว่าแต่ละ tab คือใคร ทำอะไร (liveness มาจาก daemon)
  if (urlObj.pathname === '/api/squad/agents') {
    try {
      await ensureDaemon();
      const live = await daemonRpc({ action: 'list' });
      const byId = {};
      (live.agents || []).forEach((a) => { byId[a.id] = a; });
      return sendJson(res, {
        status: 'ok',
        agents: AGENTS.map((a) => ({
          id: a.id, title: a.title, role: a.role, color: a.color,
          alive: !!(byId[a.id] && byId[a.id].alive),
          clients: byId[a.id] ? byId[a.id].clients : 0,
          last_active: byId[a.id] ? byId[a.id].last_active : 0,
          last_line: byId[a.id] ? byId[a.id].last_line : ''
        }))
      });
    } catch {
      return sendJson(res, {
        status: 'ok',
        agents: AGENTS.map((a) => ({ id: a.id, title: a.title, role: a.role, color: a.color, alive: false, clients: 0 }))
      });
    }
  }
  if (urlObj.pathname === '/api/squad/history') {
    try {
      const target = urlObj.searchParams.get('target') || '';
      const limit = Number(urlObj.searchParams.get('limit')) || 50;
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'history', target, limit }));
    } catch { return sendJson(res, { status: 'error', messages: [] }, 500); }
  }
  if (urlObj.pathname === '/api/squad/stats') {
    try {
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'stats' }));
    } catch { return sendJson(res, { status: 'error', stats: {} }, 500); }
  }
  if (urlObj.pathname === '/api/squad/send' && req.method === 'POST') {
    try {
      const { from, target, text } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'send', from, target, text }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/send-keys' && req.method === 'POST') {
    try {
      const { target, text } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'send_raw', target, text }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/broadcast' && req.method === 'POST') {
    try {
      const { text } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'broadcast', text }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/kill' && req.method === 'POST') {
    try {
      const { target } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'kill', target }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/capture') {
    try {
      const target = urlObj.searchParams.get('target') || 'agy-leader';
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'capture', target }));
    } catch { return sendJson(res, { status: 'error', output: '' }, 500); }
  }
  if (urlObj.pathname === '/api/squad/delegate' && req.method === 'POST') {
    try {
      const { from, to, task, context } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'delegate', from, to, task, context }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/inbox') {
    try {
      const target = urlObj.searchParams.get('target') || 'agy-leader';
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'inbox', target }));
    } catch { return sendJson(res, { status: 'error', tasks: [] }, 500); }
  }
  if (urlObj.pathname === '/api/squad/ack' && req.method === 'POST') {
    try {
      const { target, id, result } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'ack', target, id, result }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/goal' && req.method === 'POST') {
    try {
      const { text, from } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'set_goal', text, from }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/goal') {
    try {
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'get_goal' }));
    } catch { return sendJson(res, { status: 'error', goal: '' }, 500); }
  }
  if (urlObj.pathname === '/api/squad/skill-catalog') {
    return sendJson(res, { status: 'ok', count: skillCatalog.length, skills: skillCatalog });
  }
  if (urlObj.pathname === '/api/squad/skills') {
    try {
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'skills' }));
    } catch { return sendJson(res, { status: 'error', skills: [] }, 500); }
  }
  if (urlObj.pathname === '/api/squad/remember' && req.method === 'POST') {
    try {
      const { topic, summary, details, author } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'remember', topic, summary, details, author }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/recall') {
    try {
      const topic = urlObj.searchParams.get('topic') || '';
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'recall', topic }));
    } catch { return sendJson(res, { status: 'error' }, 500); }
  }
  if (urlObj.pathname === '/api/squad/knowledge') {
    try {
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'knowledge-list' }));
    } catch { return sendJson(res, { status: 'error', knowledge: [] }, 500); }
  }
  if (urlObj.pathname === '/api/squad/forget' && req.method === 'POST') {
    try {
      const { topic } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'forget', topic }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/claim' && req.method === 'POST') {
    try {
      const { agent, path: p, note, mode } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'claim', agent, path: p, note, mode }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/release' && req.method === 'POST') {
    try {
      const { agent, path: p } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'release', agent, path: p }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/knock' && req.method === 'POST') {
    try {
      const { from, path: p, text } = JSON.parse(await readBody(req));
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'knock', from, path: p, text }));
    } catch { return sendJson(res, { status: 'error' }, 400); }
  }
  if (urlObj.pathname === '/api/squad/claims') {
    try {
      await ensureDaemon();
      return sendJson(res, await daemonRpc({ action: 'claims' }));
    } catch { return sendJson(res, { status: 'error', claims: [] }, 500); }
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (ws, req) => {
  // Bridge: browser WS <-> pty-daemon unix socket. Daemon owns PTYs + replays scrollback.
  const urlObj = new URL(req.url, 'http://localhost');
  const sessionId = urlObj.searchParams.get('session') || 'agy-leader';
  try { await ensureDaemon(); } catch {}
  const daemon = net.createConnection(DAEMON_SOCKET);
  daemon.on('connect', () => {
    daemon.write(JSON.stringify({ action: 'attach', session_id: sessionId, cols: 80, rows: 24 }) + '\n');
  });
  daemon.on('data', (chunk) => {
    try { if (ws.readyState === 1) ws.send(chunk); } catch {}
  });
  const closeDaemon = () => { try { daemon.end(); } catch {} };
  const closeWs = () => { try { ws.close(); } catch {} };
  ws.on('message', (msg) => {
    try { daemon.write(msg.toString()); } catch {}
  });
  ws.on('close', closeDaemon);
  ws.on('error', closeDaemon);
  daemon.on('close', closeWs);
  daemon.on('error', closeWs);
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws/terminal')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`DeerFlow Pure-Node Web IDE + PTY running at http://localhost:${PORT}`);
});

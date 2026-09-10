#!/usr/bin/env node
// squad.mjs — CLI for agents (human or AI) inside PTY rooms to talk to each other.
// Usage:
//   node squad.mjs who                          list squad + session status
//   node squad.mjs inbox [agent-id]             show pending tasks (default $AGENT_ID)
//   node squad.mjs ack <task-id> <result...>    mark done + send result back to requester
//   node squad.mjs task <target> <text...>      delegate structured task (goes to inbox + PTY)
//   node squad.mjs tell <target> <text...>      raw keystrokes into target PTY
//   node squad.mjs broadcast <text...>          raw keystrokes into ALL rooms
//   node squad.mjs goal [text...]               show squad goal, or set it
//   node squad.mjs skills                       list available skills
const PORT = Number(process.env.HUD_PORT) || 5999;
const BASE = `http://localhost:${PORT}/api/squad`;
const ME = process.env.AGENT_ID || 'agy-leader';

async function api(path, obj) {
  const opts = obj === undefined
    ? {}
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
  const r = await fetch(BASE + path, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${path}`);
  return r.json();
}

function ago(ts) {
  if (!ts) return '-';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  return m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago';
}

const [, , cmd, ...rest] = process.argv;

try {
  if (cmd === 'who') {
    const d = await api('/agents');
    for (const a of d.agents || []) {
      console.log(`${a.alive ? '●' : '○'} ${a.title} (${a.id}) clients=${a.clients} ${a.alive ? ago(a.last_active) : 'down'}`);
      console.log(`  role: ${a.role}`);
      if (a.alive && a.last_line) console.log(`  last: ${a.last_line}`);
    }
  } else if (cmd === 'inbox') {
    const target = rest[0] || ME;
    const d = await api(`/inbox?target=${encodeURIComponent(target)}`);
    const tasks = d.tasks || [];
    if (!tasks.length) { console.log(`inbox ${target}: empty`); process.exit(0); }
    for (const t of tasks) {
      console.log(`--- ${t.id} from=${t.from} ---`);
      console.log(t.task);
      if (t.context) console.log(`[context] ${t.context}`);
      console.log(`ack: node squad.mjs ack ${t.id} <result...>`);
    }
  } else if (cmd === 'ack') {
    const [id, ...words] = rest;
    if (!id) { console.error('usage: node squad.mjs ack <task-id> <result...>'); process.exit(1); }
    const target = process.env.AGENT_ID || ME;
    console.log(JSON.stringify(await api('/ack', { target, id, result: words.join(' ') })));
  } else if (cmd === 'task') {
    const [to, ...words] = rest;
    if (!to || !words.length) { console.error('usage: node squad.mjs task <target> <text...>'); process.exit(1); }
    console.log(JSON.stringify(await api('/delegate', { from: ME, to, task: words.join(' ') })));
  } else if (cmd === 'send') {
    const [to, ...words] = rest;
    if (!to || !words.length) { console.error('usage: node squad.mjs send <target> <msg...>'); process.exit(1); }
    console.log(JSON.stringify(await api('/send', { from: ME, target: to, text: words.join(' ') })));
  } else if (cmd === 'listen') {
    const target = rest[0] || ME;
    const net = await import('node:net');
    const sock = net.createConnection('/tmp/deerflow-pty.sock');
    let buf = '';
    console.log(`listening for ${target} (Ctrl+C to stop)...`);
    sock.on('connect', () => sock.write(JSON.stringify({ action: 'subscribe', session_id: target }) + '\n'));
    sock.on('data', (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const m = JSON.parse(line);
          if (m.event === 'msg') console.log(`\n[${m.kind}] ${m.from} -> ${m.to}: ${m.body}`);
        } catch {}
      }
    });
    sock.on('error', (e) => { console.error('listen error: ' + e.message); process.exit(1); });
    await new Promise(() => {});
  } else if (cmd === 'tell') {
    const [to, ...words] = rest;
    if (!to || !words.length) { console.error('usage: node squad.mjs tell <target> <text...>'); process.exit(1); }
    console.log(JSON.stringify(await api('/send-keys', { target: to, text: words.join(' ') + '\n' })));
  } else if (cmd === 'broadcast') {
    if (!rest.length) { console.error('usage: node squad.mjs broadcast <text...>'); process.exit(1); }
    console.log(JSON.stringify(await api('/broadcast', { text: rest.join(' ') + '\n' })));
  } else if (cmd === 'goal') {
    if (!rest.length) {
      const d = await api('/goal');
      console.log(d.goal || '(no goal set)');
    } else {
      console.log(JSON.stringify(await api('/goal', { text: rest.join(' '), from: ME })));
    }
  } else if (cmd === 'skills') {
    const d = await api('/skills');
    console.log('skills: ' + ((d.skills || []).join(', ') || '(none)'));
  } else if (cmd === 'claim') {
    const [p, ...words] = rest;
    if (!p) { console.error('usage: node squad.mjs claim <path> [--shared] [note]'); process.exit(1); }
    const shared = words[0] === '--shared';
    if (shared) words.shift();
    console.log(JSON.stringify(await api('/claim', { agent: ME, path: p, note: words.join(' '), mode: shared ? 'shared' : 'exclusive' })));
  } else if (cmd === 'release') {
    const [p] = rest;
    if (!p) { console.error('usage: node squad.mjs release <path>'); process.exit(1); }
    console.log(JSON.stringify(await api('/release', { agent: ME, path: p })));
  } else if (cmd === 'knock') {
    const [p, ...words] = rest;
    if (!p) { console.error('usage: node squad.mjs knock <path> [message]'); process.exit(1); }
    console.log(JSON.stringify(await api('/knock', { from: ME, path: p, text: words.join(' ') || 'ขอร่วมแก้ไฟล์นี้ด้วย' })));
  } else if (cmd === 'claims' || cmd === 'changed') {
    const d = await api('/claims');
    const rows = d.claims || [];
    if (!rows.length) { console.log('no active claims'); process.exit(0); }
    for (const c of rows) {
      const who = [c.owner, ...(c.mates || [])].join('+');
      console.log(`${c.dirty ? '● modified' : '○ untouched'} [${c.mode || 'exclusive'}] ${c.path} — ${who}`);
    }
  } else if (cmd === 'restart') {
    const target = rest[0] || ME;
    console.log(JSON.stringify(await api('/kill', { target })));
  } else if (cmd === 'catalog') {
    const d = await api('/skill-catalog');
    const rows = d.skills || [];
    let last = '';
    for (const s of rows) {
      if (s.category !== last) { last = s.category; console.log('\n== ' + last + ' =='); }
      console.log('>> ' + s.name);
    }
    console.log('\ntotal: ' + rows.length);
  } else if (cmd === 'remember') {
    const [topic, ...words] = rest;
    if (!topic || !words.length) { console.error('usage: node squad.mjs remember <topic> <summary...>'); process.exit(1); }
    console.log(JSON.stringify(await api('/remember', { topic, summary: words.join(' '), details: '', author: ME })));
  } else if (cmd === 'recall') {
    const [topic] = rest;
    if (!topic) { console.error('usage: node squad.mjs recall <topic>'); process.exit(1); }
    const d = await api(`/recall?topic=${encodeURIComponent(topic)}`);
    if (d.status !== 'ok') { console.log('no such topic: ' + topic); process.exit(1); }
    console.log(`== ${d.knowledge.topic} (by ${d.knowledge.author}) ==`);
    console.log(d.knowledge.summary);
    if (d.knowledge.details) console.log(d.knowledge.details);
  } else if (cmd === 'knowledge') {
    const d = await api('/knowledge');
    const rows = d.knowledge || [];
    if (!rows.length) { console.log('knowledge base empty — be the first: node squad.mjs remember <topic> <summary>'); process.exit(0); }
    for (const k of rows) console.log(`>> ${k.topic} (by ${k.author}) :: ${k.summary}`);
  } else if (cmd === 'forget') {
    const [topic] = rest;
    if (!topic) { console.error('usage: node squad.mjs forget <topic>'); process.exit(1); }
    console.log(JSON.stringify(await api('/forget', { topic })));
  } else if (cmd === 'lesson') {
    console.log('read: SQUAD.md (who you are) + SQUAD-TALK.md (how to talk) in project dir');
  } else {
    console.log('squad.mjs — talk to the squad. commands: who | inbox [id] | ack <id> <result> | task <target> <text> | send <target> <msg> | listen [id] | tell <target> <text> | broadcast <text> | goal [text] | skills | lesson | restart [id] | claim <path> [--shared] [note] | release <path> | claims | knock <path> [msg] | catalog | remember <topic> <summary> | recall <topic> | knowledge | forget <topic>');
    process.exit(1);
  }
} catch (err) {
  console.error('squad error: ' + err.message + ' (is hud-web.mjs running on port ' + PORT + '?)');
  process.exit(1);
}

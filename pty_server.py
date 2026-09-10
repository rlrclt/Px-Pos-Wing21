#!/usr/bin/env python3
import os
import sys
import pty
import select
import termios
import struct
import fcntl
import socket
import threading
import subprocess
import time
import json

SOCKET_PATH = "/tmp/agy_pty_daemon.sock"
TMUX_BIN = "/Users/khamseankhampang/.gemini/antigravity-cli/bin/tmux"
MAIN_SESSION = "agy-team"

if not os.path.exists(TMUX_BIN):
    TMUX_BIN = "tmux"

# Preset DeerFlow SuperAgent Harnesses in the single session (agy-team)
PRESET_WINDOWS = [
    {"index": 0, "id": "agy-leader", "title": "🦌 0: DEERFLOW SUPERAGENT", "role": "Lead Orchestrator & Goal Planner", "cmd": "agy", "color": "#00f0ff"},
    {"index": 1, "id": "ai-research", "title": "🌐 1: DEEP RESEARCH HARNESS", "role": "Multi-hop Search & Repo Analysis", "cmd": None, "color": "#ffea00"},
    {"index": 2, "id": "ai-coder", "title": "⚡ 2: SANDBOX CODER HARNESS", "role": "Sandboxed Execution & Implementation", "cmd": None, "color": "#b026ff"},
    {"index": 3, "id": "ai-qa", "title": "🎨 3: ARTIFACT CREATOR", "role": "Deliverables, Docs & Test Suite", "cmd": None, "color": "#00ff88"},
    {"index": 4, "id": "ai-reviewer", "title": "🛡️ 4: MEMORY & VERIFIER", "role": "Memory Checkpoint & Policy Audit", "cmd": None, "color": "#ff007f"}
]

class TmuxWindowPTYSession:
    def __init__(self, target_id, command=None, cwd=None, rows=24, cols=80):
        self.target_id = target_id # e.g. "agy-team:agy-leader" or "agy-leader"
        self.cwd = cwd or os.getcwd()
        self.rows = max(10, int(rows))
        self.cols = max(20, int(cols))
        self.history = bytearray()
        self.max_history = 256 * 1024
        self.clients = set()
        self.lock = threading.Lock()
        self.alive = True
        
        self.full_target = self._resolve_target(command)
        
        self.master, slave = pty.openpty()
        self.set_size(self.rows, self.cols)
        
        self.pid = os.fork()
        if self.pid == 0:
            os.close(self.master)
            os.setsid()
            os.dup2(slave, 0)
            os.dup2(slave, 1)
            os.dup2(slave, 2)
            os.close(slave)
            
            env = os.environ.copy()
            env['TERM'] = 'screen-256color'
            env['COLORTERM'] = 'truecolor'
            
            # Attach directly to this specific window in the shared session
            os.execvpe(TMUX_BIN, [TMUX_BIN, 'attach-session', '-t', self.full_target], env)
        else:
            os.close(slave)
            fl = fcntl.fcntl(self.master, fcntl.F_GETFL)
            fcntl.fcntl(self.master, fcntl.F_SETFL, fl | os.O_NONBLOCK)
            
            self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
            self.reader_thread.start()

    def _resolve_target(self, command):
        # Format: agy-team:window_name
        window_name = self.target_id.split(':')[-1] if ':' in self.target_id else self.target_id
        full_target = f"{MAIN_SESSION}:{window_name}"
        
        # Ensure main session exists
        check_sess = subprocess.run([TMUX_BIN, 'has-session', '-t', MAIN_SESSION], capture_output=True)
        if check_sess.returncode != 0:
            # Create session with leader window
            leader_cmd = "agy" if window_name == "agy-leader" else (os.environ.get('SHELL', '/bin/zsh'))
            subprocess.run([
                TMUX_BIN, 'new-session', '-d', '-s', MAIN_SESSION,
                '-n', 'agy-leader',
                '-c', self.cwd,
                '-x', str(self.cols), '-y', str(self.rows),
                leader_cmd
            ])
            subprocess.run([TMUX_BIN, 'set-option', '-t', MAIN_SESSION, 'mouse', 'on'])
            subprocess.run([TMUX_BIN, 'set-option', '-t', MAIN_SESSION, 'history-limit', '50000'])
            subprocess.run([TMUX_BIN, 'set-option', '-g', 'window-size', 'latest'])
            subprocess.run([TMUX_BIN, 'set-window-option', '-g', 'aggressive-resize', 'on'])
            subprocess.run([TMUX_BIN, 'set-option', '-g', 'default-terminal', 'xterm-256color'])
            
        # Ensure target window exists
        check_win = subprocess.run([TMUX_BIN, 'list-windows', '-t', MAIN_SESSION, '-F', '#{window_name}'], capture_output=True, text=True)
        existing_windows = [w.strip() for w in check_win.stdout.split('\n') if w.strip()]
        
        if window_name not in existing_windows:
            cmd = command or (os.environ.get('SHELL', '/bin/zsh'))
            subprocess.run([
                TMUX_BIN, 'new-window', '-d', '-t', MAIN_SESSION,
                '-n', window_name,
                '-c', self.cwd,
                cmd
            ])
            
        return full_target

    def set_size(self, rows, cols):
        try:
            self.rows = max(10, int(rows))
            self.cols = max(20, int(cols))
            winsize = struct.pack("HHHH", self.rows, self.cols, 0, 0)
            fcntl.ioctl(self.master, termios.TIOCSWINSZ, winsize)
            subprocess.run([TMUX_BIN, 'refresh-client', '-t', self.full_target, '-C', f"{self.cols},{self.rows}"], capture_output=True)
        except Exception:
            pass

    def write(self, data):
        if not self.alive: return
        try:
            os.write(self.master, data)
        except Exception:
            self.alive = False

    def add_client(self, client_sock):
        with self.lock:
            self.clients.add(client_sock)
            if self.history:
                try: client_sock.sendall(self.history)
                except Exception: pass

    def remove_client(self, client_sock):
        with self.lock:
            self.clients.discard(client_sock)

    def _reader_loop(self):
        while self.alive:
            try:
                r, _, _ = select.select([self.master], [], [], 0.05)
                if self.master in r:
                    chunk = os.read(self.master, 4096)
                    if not chunk:
                        self.alive = False
                        break
                    with self.lock:
                        self.history.extend(chunk)
                        if len(self.history) > self.max_history:
                            self.history = self.history[-self.max_history:]
                        
                        dead = []
                        for cl in list(self.clients):
                            try: cl.sendall(chunk)
                            except Exception: dead.append(cl)
                        for d in dead:
                            self.clients.discard(d)
            except Exception:
                break
        self.alive = False


class PTYDaemon:
    def __init__(self):
        self.sessions = {} # target_id -> TmuxWindowPTYSession
        self.lock = threading.Lock()

    def get_or_create_session(self, target_id, command=None, cwd=None, rows=24, cols=80):
        with self.lock:
            if target_id in self.sessions and self.sessions[target_id].alive:
                s = self.sessions[target_id]
                s.set_size(rows, cols)
                return s
            session = TmuxWindowPTYSession(target_id, command=command, cwd=cwd, rows=rows, cols=cols)
            self.sessions[target_id] = session
            return session

    def list_windows(self):
        res = []
        try:
            out = subprocess.run([
                TMUX_BIN, 'list-windows', '-t', MAIN_SESSION,
                '-F', '#{window_index}:#{window_name}:#{window_active}:#{window_panes}'
            ], capture_output=True, text=True)
            for line in out.stdout.strip().split('\n'):
                if ':' in line:
                    idx, name, active, panes = line.split(':', 3)
                    res.append({
                        "index": int(idx),
                        "id": name,
                        "title": f"{idx}: {name.upper()}",
                        "active": active == "1",
                        "panes": int(panes)
                    })
        except Exception:
            pass
        return res

    def launch_all_squad(self, cwd=None):
        cwd = cwd or os.getcwd()
        # Initialize full squad in 1-click
        for w in PRESET_WINDOWS:
            self.get_or_create_session(w["id"], command=w["cmd"], cwd=cwd)
        return {"status": "ok", "message": "All squad windows launched"}

    def send_keys_to_target(self, target, text):
        window_name = target.split(':')[-1] if ':' in target else target
        full_target = f"{MAIN_SESSION}:{window_name}"
        subprocess.run([TMUX_BIN, 'send-keys', '-t', full_target, text, 'Enter'], capture_output=True)
        return {"status": "ok"}

    def capture_pane_output(self, target, lines=50):
        window_name = target.split(':')[-1] if ':' in target else target
        full_target = f"{MAIN_SESSION}:{window_name}"
        out = subprocess.run([TMUX_BIN, 'capture-pane', '-p', '-t', full_target, '-S', f"-{lines}"], capture_output=True, text=True)
        return {"output": out.stdout}

    def handle_client(self, client_sock):
        session = None
        try:
            raw_hdr = bytearray()
            while b'\n' not in raw_hdr:
                chunk = client_sock.recv(1024)
                if not chunk: return
                raw_hdr.extend(chunk)
            
            line, rest = raw_hdr.split(b'\n', 1)
            req = json.loads(line.decode('utf-8'))
            action = req.get('action', 'attach')
            target_id = req.get('session_id', 'agy-leader')
            
            if action == 'list':
                client_sock.sendall(json.dumps(self.list_windows()).encode('utf-8') + b'\n')
                return
            elif action == 'start_all':
                res = self.launch_all_squad(req.get('cwd'))
                client_sock.sendall(json.dumps(res).encode('utf-8') + b'\n')
                return
            elif action == 'send_keys':
                res = self.send_keys_to_target(req.get('target', target_id), req.get('text', ''))
                client_sock.sendall(json.dumps(res).encode('utf-8') + b'\n')
                return
            elif action == 'capture':
                res = self.capture_pane_output(req.get('target', target_id), req.get('lines', 50))
                client_sock.sendall(json.dumps(res).encode('utf-8') + b'\n')
                return
                
            rows = int(req.get('rows', 24))
            cols = int(req.get('cols', 80))
            cmd = req.get('command')
            cwd = req.get('cwd')
            
            session = self.get_or_create_session(target_id, command=cmd, cwd=cwd, rows=rows, cols=cols)
            session.add_client(client_sock)
            
            if rest:
                session.write(rest)
                
            while session.alive:
                r, _, _ = select.select([client_sock], [], [], 0.1)
                if client_sock in r:
                    data = client_sock.recv(4096)
                    if not data: break
                    if b'\x1b_RESIZE:' in data:
                        parts = data.split(b'\x1b_RESIZE:')
                        for p in parts[1:]:
                            if b'\x1b\\' in p:
                                sz = p.split(b'\x1b\\')[0].decode('utf-8', 'ignore')
                                try:
                                    r_s, c_s = sz.split(':')
                                    session.set_size(int(r_s), int(c_s))
                                except Exception: pass
                        data = parts[0]
                    if data:
                        session.write(data)
        except Exception:
            pass
        finally:
            if session:
                session.remove_client(client_sock)
            try: client_sock.close()
            except Exception: pass

    def run(self):
        if os.path.exists(SOCKET_PATH):
            try: os.unlink(SOCKET_PATH)
            except Exception: pass
            
        server_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server_sock.bind(SOCKET_PATH)
        server_sock.listen(64)
        
        while True:
            client, _ = server_sock.accept()
            t = threading.Thread(target=self.handle_client, args=(client,), daemon=True)
            t.start()

if __name__ == '__main__':
    daemon = PTYDaemon()
    daemon.run()

# Web Cockpit Persistent Sync & Multi-Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Antigravity Web HUD into a primary interactive Cyber Cockpit featuring auto-attaching persistent sessions (never losing `agy` session on reload), multi-terminal tabs, split-screen viewing, and sub-10ms zero-lag streaming.

**Architecture:** A Python/Node persistent PTY session manager (`pty_server.py`) maintains background PTY processes (main `agy` session and shell tabs). A lightweight Node HTTP + WebSocket server (`hud-web.mjs`) handles client connections, real-time file-watched telemetry streaming, and multi-session routing. The frontend provides tab management, split views, and real-time ANSI terminal rendering with local caching.

**Tech Stack:** Node.js (v24), Python 3 (pty, termios, select), WebSocket (RFC 6455), xterm.js, HTML5/CSS3 Cyberpunk Glassmorphism.

## Global Constraints
- Target location: `/Users/khamseankhampang/.gemini/antigravity-cli/`
- Zero external npm dependencies (pure standard libraries in Node and Python).
- Compatible with macOS zsh, GNU screen, and xterm-256color.
- Auto-attach to existing `agy` process without terminating or duplicating jobs.

---

### Task 1: Persistent PTY Daemon & Session Pool (`pty_server.py`)

**Files:**
- Create/Modify: `/Users/khamseankhampang/.gemini/antigravity-cli/pty_server.py`

**Interfaces:**
- Consumes: `session_id`, `command`, `rows`, `cols` from Node WebSocket bridge.
- Produces: Persistent PTY session handles with ring scrollback buffer and bidirectional pipe.

- [ ] **Step 1: Write multi-session manager with history ring buffer in Python**
- [ ] **Step 2: Implement auto-attach logic for `agy` and independent shell tabs**
- [ ] **Step 3: Test PTY session persistence and resize handling**
- [ ] **Step 4: Verify session surviving client disconnects**

---

### Task 2: High-Performance Multi-Session WebSocket Server (`hud-web.mjs`)

**Files:**
- Modify: `/Users/khamseankhampang/.gemini/antigravity-cli/hud-web.mjs`

**Interfaces:**
- Consumes: `/ws/terminal?session=<id>`, `/api/state`, `/api/sessions`
- Produces: Multiplexed WebSocket pipes routing to specific PTY sessions + instant `fs.watch` SSE telemetry push.

- [ ] **Step 1: Implement multi-session WebSocket routing (`/ws/terminal?session=<id>`)**
- [ ] **Step 2: Add session management API endpoints (`/api/sessions`, `/api/sessions/create`, `/api/sessions/kill`)**
- [ ] **Step 3: Implement sub-5ms `fs.watch` event pusher for statusline snapshot**
- [ ] **Step 4: Verify zero-latency streaming on localhost**

---

### Task 3: Multi-Terminal Tab & Split-Screen UI Frontend

**Files:**
- Modify: `/Users/khamseankhampang/.gemini/antigravity-cli/hud-web.mjs` (embedded HTML/JS)

**Interfaces:**
- Consumes: WebSocket streams for active tabs.
- Produces: Interactive tab bar (`[⚡ AGY Agent]`, `[🐚 Shell 1]`, `[➕ New Tab]`), Split-screen side-by-side mode, and responsive layout.

- [ ] **Step 1: Add tab manager UI with active state and session switching**
- [ ] **Step 2: Add Split-View button (Side-by-side: Left=AGY, Right=Shell)**
- [ ] **Step 3: Integrate local asset caching to eliminate external CDN lag**
- [ ] **Step 4: Wire action buttons (`Start agy`, `Finder`, `Copy JSON`, `Clear`, `Reconnect`)**

---

### Task 4: End-to-End Verification & CLI Wrapper (`agy-hud`)

**Files:**
- Modify: `/Users/khamseankhampang/.gemini/antigravity-cli/agy-hud`

- [ ] **Step 1: Update `agy-hud` to seamlessly start the persistent cockpit**
- [ ] **Step 2: Verify auto-attach behavior by opening multiple browser tabs/reloading**
- [ ] **Step 3: Verify multi-tab shell execution (`ls`, `git`, `agy`) and split screen**
- [ ] **Step 4: Confirm telemetry metrics update instantly on model activity**

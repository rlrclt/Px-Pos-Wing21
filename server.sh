#!/bin/bash
# server.sh — lifecycle for DeerFlow web IDE (web) + PTY daemon, SEPARATED.
#   Rule: restarting the WEB never touches chats. The daemon owns all PTY sessions.
#   Only `stop-all` kills chats (daemon).
# Usage: ./server.sh {start|stop|restart|status|logs|stop-all}
set -u
PROJ="/Users/khamseankhampang/Desktop/yoru work"
PORT="${HUD_PORT:-5999}"
SOCK="/tmp/deerflow-pty.sock"

web_pid() { lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -1; }
daemon_pids() { ps aux | grep "[p]ty-daemon.mjs" | awk '{print $2}'; }

case "${1:-status}" in
  start)
    if [ -n "$(web_pid)" ]; then echo "web already running (pid $(web_pid)) on :$PORT"; exit 0; fi
    cd "$PROJ" || exit 1
    HUD_PORT=$PORT nohup node hud-web.mjs > /tmp/hud.log 2>&1 &
    sleep 2
    curl -s -o /dev/null -w "web %{http_code}\n" http://localhost:$PORT/
    echo "open: http://localhost:$PORT/  monitor: http://localhost:$PORT/monitor"
    ;;
  stop)
    P=$(web_pid)
    if [ -z "$P" ]; then echo "web not running"; else kill -9 $P && echo "web stopped (daemon + chats untouched)"; fi
    ;;
  restart)
    P=$(web_pid)
    if [ -n "$P" ]; then kill -9 $P && echo "web stopped"; fi
    for i in $(seq 1 10); do [ -z "$(web_pid)" ] && break; sleep 1; done
    "$0" start
    ;;
  stop-all)
    P=$(web_pid)
    [ -n "$P" ] && kill -9 $P 2>/dev/null && echo "web stopped"
    for p in $(daemon_pids); do kill -9 $p 2>/dev/null && echo "daemon $p stopped (ALL CHATS LOST)"; done
    rm -f "$SOCK" /tmp/deerflow-pty.pid
    ;;
  status)
    P=$(web_pid)
    if [ -n "$P" ]; then echo "web: UP pid=$P :$PORT"; else echo "web: DOWN"; fi
    DPIDS=$(daemon_pids)
    if [ -n "$DPIDS" ]; then echo "daemon: UP pid(s): $(echo $DPIDS | tr '\n' ' ')"; else echo "daemon: DOWN"; fi
    [ -S "$SOCK" ] && echo "socket: $SOCK OK" || echo "socket: missing (daemon spawns on demand)"
    curl -s http://localhost:$PORT/api/squad/agents 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('rooms:', [(a['id'], 'live' if a['alive'] else 'down') for a in d.get('agents',[])])" 2>/dev/null || true
    ;;
  logs)
    tail -30 /tmp/hud.log 2>/dev/null; echo "--- daemon ---"; tail -10 ~/.gemini/antigravity-cli/pty-daemon.log 2>/dev/null
    ;;
  *) echo "usage: $0 {start|stop|restart|status|logs|stop-all}"; exit 1 ;;
esac

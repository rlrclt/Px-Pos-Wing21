#!/usr/bin/env bash
# ==============================================================================
# Antigravity Cyber Cockpit & HUD - Automated Installer
# ==============================================================================
set -euo pipefail

DEST_DIR="$HOME/.gemini/antigravity-cli"
mkdir -p "$DEST_DIR/bin"

echo "⚡ Installing Antigravity Cyber Cockpit & HUD..."

# Ensure PATH
if ! grep -q "antigravity-cli/bin" "$HOME/.zshrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.gemini/antigravity-cli/bin:$PATH"' >> "$HOME/.zshrc"
fi

# Set executable permissions
chmod +x "$DEST_DIR"/{agy-hud,hud-web.mjs,hud.mjs,statusline.mjs,pty_server.py} 2>/dev/null || true

echo "🎉 Installation completed successfully!"
echo "👉 Run: ~/.gemini/antigravity-cli/agy-hud"

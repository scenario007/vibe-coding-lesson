#!/bin/zsh
set -eu
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
if [[ -d /opt/homebrew/opt/openjdk@21/bin ]]; then
  export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
fi
if [[ -d /opt/homebrew/opt/postgresql@18/bin ]]; then
  export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
fi
.venv/bin/python scripts/launch.py stop

#!/bin/zsh
cd -- "$(dirname "$0")"
if [ ! -d frontend/node_modules ]; then
  npm --prefix frontend ci --legacy-peer-deps --no-audit --no-fund || exit 1
fi
python3 scripts/dev.py start && open http://127.0.0.1:5173

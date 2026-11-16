#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for program in ffmpeg ffprobe java sbt node npm uv initdb pg_ctl createdb; do
  command -v "$program" >/dev/null || { printf '缺少 %s，请按 README 安装开发依赖。\n' "$program" >&2; exit 1; }
done

if [[ ! -x .venv/bin/python ]]; then
  uv venv --python 3.13 .venv
fi
uv pip sync --python .venv/bin/python dsp/requirements.lock
(
  cd frontend
  npm ci
)
if [[ "${1:-}" == "--model" ]]; then
  model_path="${VOCALLAB_MODELS:-$PWD/.local/models}"
  cd dsp
  PYTORCH_ENABLE_MPS_FALLBACK=1 ../.venv/bin/python -m vocallab prepare-model "$model_path"
fi

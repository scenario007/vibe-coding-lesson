#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
folder="${1:-$PWD/.local/fixtures}"
mkdir -p "$folder"
archive="$folder/MUSDB18-7-STEMS.zip"

if [[ ! -f "$archive" ]]; then
  curl -fL --retry 2 https://github.com/sigsep/sigsep-mus-db/releases/download/v0.4.0/MUSDB18-7-STEMS.zip -o "$archive.partial"
  mv "$archive.partial" "$archive"
fi
source="$folder/sample.stem.mp4"
unzip -p "$archive" 'test/Cristina Vane - So Easy.stem.mp4' > "$source"
ffmpeg -nostdin -y -v error -i "$source" -map 0:a:0 "$folder/mix.wav"
ffmpeg -nostdin -y -v error -i "$source" -map 0:a:4 "$folder/clean.wav"
ffmpeg -nostdin -y -v error -i "$source" \
  -filter_complex '[0:a:1][0:a:2][0:a:3]amix=inputs=3:normalize=0[backing]' \
  -map '[backing]' -c:a pcm_f32le "$folder/backing.wav"

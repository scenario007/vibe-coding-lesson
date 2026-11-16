"""Generate labeled synthetic media to exercise actual decoders and signal processing."""
import math
import struct
import subprocess
import sys
import wave
from pathlib import Path

RATE = 22050


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", *map(str,args)], check=True)


def melody(path, delay=0):
    notes = [57, 62, 60, 66, 69, 64, 61, 72, 67, 65]
    durations = [.53, .72, .45, .87, .41, .53, .49, .68, .32, .6]
    data = [0] * round(delay * RATE)
    for midi, seconds in zip(notes, durations):
        count = round(seconds * RATE)
        hz = 440 * 2 ** ((midi-69)/12)
        for i in range(count):
            phase = 2 * math.pi * hz * i / RATE
            fade = min(1, i / (RATE * .025), (count-1-i) / (RATE*.025))
            data.append(round(fade * 12500 * (math.sin(phase) + .18*math.sin(2*phase))))
        data.extend([0]*round(.085*RATE))
    with wave.open(str(path), 'wb') as audio:
        audio.setparams((1,2,RATE,0,'NONE','not compressed'))
        audio.writeframes(struct.pack(f"<{len(data)}h", *data))


def prepare(folder):
    folder.mkdir(parents=True, exist_ok=True)
    reference = folder / "reference.wav"
    delayed = folder / "delayed.wav"
    melody(reference)
    melody(delayed, 1)
    ffmpeg("-i", reference, "-c:a", "libmp3lame", folder / "reference.mp3")
    ffmpeg("-i", reference, "-c:a", "aac", folder / "reference.m4a")
    color = ["-f", "lavfi", "-i", "color=c=black:s=160x160:r=15"]
    ffmpeg(*color, "-i", delayed, "-c:v", "libx264", "-c:a", "aac", "-shortest", folder / "delayed.mp4")
    ffmpeg(*color, "-i", delayed, "-c:v", "libx265", "-x265-params", "pools=1:log-level=error",
           "-tag:v", "hvc1", "-c:a", "aac", "-shortest", folder / "delayed.mov")
    ffmpeg(*color, "-an", "-t", 2, "-c:v", "libx264", folder / "without-audio.mp4")
    ffmpeg(*color, "-i", reference, "-itsoffset", "0.50", "-i", delayed, "-map", "0:v", "-map", "1:a", "-map", "2:a",
           "-disposition:a:0", "0", "-disposition:a:1", "default", "-t", "8.5", "-c:v", "libx264",
           "-c:a", "aac", folder / "multi-offset.mov")
    (folder / "broken.mov").write_bytes(b"not a recording at all")
    (folder / "renamed.wav").write_bytes((folder / "reference.mp3").read_bytes())


if __name__ == "__main__":
    prepare(Path(sys.argv[1]))

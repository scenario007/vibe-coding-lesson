from pathlib import Path

import numpy as np
import soundfile as sf


def crop_audio(source: Path, destination: Path, start: float, duration: float) -> None:
    with sf.SoundFile(source) as audio:
        offset = round(start * audio.samplerate)
        length = round(duration * audio.samplerate)
        audio.seek(offset)
        samples = audio.read(length, dtype="float32", always_2d=True)
        # Resampling and codec padding can change the length by a few samples.
        missing = length - len(samples)
        if missing > audio.samplerate * 0.04 or not len(samples):
            raise ValueError("音轨长度与所选区间不一致。")
        if missing:
            samples = np.pad(samples, ((0, missing), (0, 0)))
        sf.write(destination, samples, audio.samplerate, subtype="PCM_16")

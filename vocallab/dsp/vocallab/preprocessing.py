import os
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


def sample_rate() -> int:
    return int(os.environ.get("VOCALLAB_F0_RATE", "22050"))


def load_analysis_audio(path: Path) -> tuple[np.ndarray, list[str], float]:
    audio, rate = sf.read(path, dtype="float32", always_2d=True)
    warnings = []
    clipped = float(np.mean(np.abs(audio) >= 0.998))
    if clipped > 0.005:
        warnings.append("音轨存在削波，音高检测可能受影响。")
    mono = np.mean(audio, axis=1)
    channel_energy = np.mean(audio ** 2, axis=0)
    if len(channel_energy) > 1 and np.mean(mono ** 2) < 0.1 * max(channel_energy):
        mono = audio[:, np.argmax(channel_energy)]
        warnings.append("声道混合会抵消较多信号，使用能量更高的声道检测音高。")
    peak = float(np.max(np.abs(mono)))
    if peak < 0.01:
        warnings.append("音轨电平偏低。")
    if rate != sample_rate():
        mono = librosa.resample(mono, orig_sr=rate, target_sr=sample_rate())
    return mono, warnings, 0.78 if clipped > 0.005 or peak < 0.01 else 1.0

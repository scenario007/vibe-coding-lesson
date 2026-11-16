import os
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np

from .preprocessing import load_analysis_audio, sample_rate


@dataclass(frozen=True)
class Pitch:
    times: np.ndarray
    hz: np.ndarray
    midi: np.ndarray
    voiced: np.ndarray
    probability: np.ndarray
    rms: np.ndarray
    warnings: list[str]
    quality: float
    guide_midi: np.ndarray | None = None

    def serializable(self, original_start: float) -> dict:
        def nullable(array):
            return [round(float(value), 5) if np.isfinite(value) else None for value in array]

        return dict(timestamps=self.times.round(5).tolist(), originalStart=original_start,
                    f0Hz=nullable(self.hz), midiPitch=nullable(self.midi),
                    voicedFlags=self.voiced.tolist(),
                    voicedProbabilities=self.probability.round(5).tolist(),
                    rms=self.rms.round(7).tolist())


def extract(path: Path) -> Pitch:
    audio, warnings, quality = load_analysis_audio(path)
    sr = sample_rate()
    hop = round(sr * 0.020)
    frame = 2048 if sr <= 24000 else 4096
    rms = librosa.feature.rms(y=audio, frame_length=frame, hop_length=hop)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    gate = max(0.00015, float(np.quantile(rms, 0.92)) * 0.045)
    if np.any(rms >= gate):
        hz, voiced, prob = librosa.pyin(
            audio, sr=sr, fmin=float(os.getenv("VOCALLAB_F0_MIN", "65")),
            fmax=float(os.getenv("VOCALLAB_F0_MAX", "1050")), frame_length=frame,
            hop_length=hop, resolution=0.1, max_transition_rate=20,
        )
    else:
        hz = np.full(len(rms), np.nan)
        voiced = np.zeros(len(rms), dtype=bool)
        prob = np.zeros(len(rms))
    prob = np.clip(np.nan_to_num(prob), 0, 1)
    guide = librosa.hz_to_midi(np.where(voiced & (prob >= 0.18) & (rms >= gate), hz, np.nan))
    hz = np.where(voiced & (prob >= 0.50) & (rms >= gate), hz, np.nan)
    # Reject isolated outliers without changing the register of sustained notes.
    midi = librosa.hz_to_midi(hz)
    spike = (np.abs(midi[1:-1] - midi[:-2]) >= 8) & (np.abs(midi[1:-1] - midi[2:]) >= 8)
    spike &= np.abs(midi[:-2] - midi[2:]) < 1.0
    hz[1:-1][spike] = np.nan
    midi[1:-1][spike] = np.nan
    if np.mean(np.isfinite(hz)) < 0.25:
        warnings.append("有可靠音高的帧偏少，可能包含较多休止、噪声或分离伪影。")
    return Pitch(times, hz, midi, voiced, prob, rms, warnings, quality, guide)

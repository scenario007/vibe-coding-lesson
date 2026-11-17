"""Fast monophonic pitch estimates for the visual preview."""
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import fft, ndimage, signal


@dataclass(frozen=True)
class HarmonicPitch:
    step: float
    midi: np.ndarray

    def serializable(self) -> dict:
        return dict(step=self.step, midiPitch=[
            round(float(value), 3) if np.isfinite(value) else None for value in self.midi
        ])


def extract(path: Path) -> HarmonicPitch:
    audio, rate = sf.read(path, dtype="float32", always_2d=True)
    mono = audio.mean(axis=1)
    channel_power = np.mean(audio ** 2, axis=0)
    if np.mean(mono ** 2) < 0.1 * max(channel_power):
        mono = audio[:, np.argmax(channel_power)]
    target_rate = 22050
    if rate != target_rate:
        divisor = np.gcd(rate, target_rate)
        mono = signal.resample_poly(mono, target_rate // divisor, rate // divisor)
    return track(mono, target_rate)


def track(mono: np.ndarray, rate: int) -> HarmonicPitch:
    """Group spectral peaks by harmonic spacing and omit unsupported frames."""
    hop = round(.02 * rate)
    window_size = 2048
    transform_size = 8192
    padded = np.pad(mono, window_size // 2)
    frames = np.lib.stride_tricks.sliding_window_view(padded, window_size)[::hop]
    rms = np.concatenate([np.sqrt(np.mean(frames[start:start + 256] ** 2, axis=1))
                          for start in range(0, len(frames), 256)])
    floor = max(.00015, float(np.quantile(rms, .92)) * .055)

    bins_per_semitone = 8
    bins_per_octave = 12 * bins_per_semitone
    candidates = 36 + np.arange(48 * bins_per_semitone + 1) / bins_per_semitone
    fundamentals = 440 * 2 ** ((candidates - 69) / 12)
    orders = np.arange(1, 9)
    frequency = fundamentals[:, None] * orders
    bins = np.rint(frequency * transform_size / rate).astype(int)
    weights = orders ** -.65
    taper = signal.windows.hann(window_size, sym=False).astype(np.float32)
    output = np.full(len(frames), np.nan)

    for start in range(0, len(frames), 96):
        batch = frames[start:start + 96]
        active = rms[start:start + len(batch)] >= floor
        if not np.any(active):
            continue
        spectrum = np.abs(fft.rfft(batch[active] * taper, n=transform_size, axis=1))
        spectrum[:, :round(48 * transform_size / rate)] = 0
        maxima = ndimage.maximum_filter1d(spectrum, size=7, axis=1)
        peaks = np.where(spectrum >= maxima, spectrum, 0)
        peaks = ndimage.maximum_filter1d(peaks, size=5, axis=1)
        strongest = np.max(spectrum, axis=1)[:, None, None]
        evidence = peaks[:, bins] / np.maximum(strongest, 1e-10)
        present = evidence >= .055
        score = np.sum(np.sqrt(evidence) * weights, axis=2)
        score *= .60 + .40 * np.minimum(1.0, evidence[:, :, 0] / .16)
        support = (present.sum(axis=2) >= 2) & (
            present[:, :, 0] | (present[:, :, 1::2].any(axis=2) & present[:, :, 2::2].any(axis=2))
        )
        score = np.where(support, score, -1)
        best = np.argmax(score, axis=1)
        rows = np.arange(len(best))
        # Odd partials distinguish a lower fundamental from its octave.
        octave_below = np.maximum(0, best - bins_per_octave)
        odd_support = evidence[rows, octave_below, ::2]
        use_lower = (best >= bins_per_octave) & (score[rows, octave_below] >= .56 * score[rows, best]) & (
            (odd_support > .095).sum(axis=1) >= 2
        )
        best = np.where(use_lower, octave_below, best)
        confidence = score[rows, best]
        indices = start + np.flatnonzero(active)
        output[indices] = np.where(confidence >= .63, candidates[best], np.nan)

    # Remove isolated detections without filling gaps or smoothing away vibrato.
    connected = np.abs(np.diff(output)) <= 4
    neighbours = np.r_[False, connected] | np.r_[connected, False]
    output[~neighbours] = np.nan
    return HarmonicPitch(hop / rate, output)

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
    bridged_frames: list[int]

    def serializable(self) -> dict:
        return dict(step=self.step, midiPitch=[
            round(float(value), 3) if np.isfinite(value) else None for value in self.midi
        ], bridgedFrames=self.bridged_frames)


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


def _periodicity(frames: np.ndarray, frequency: np.ndarray, rate: int) -> np.ndarray:
    """Measure how well one cycle predicts the next directly in the waveform."""
    lag = np.rint(rate / frequency).astype(int)
    indices = (frames.shape[1] - 1024 - lag[:, None]) // 2 + np.arange(1024)
    left = np.take_along_axis(frames, indices, axis=1)
    right = np.take_along_axis(frames, indices + lag[:, None], axis=1)
    return np.sum(left * right, axis=1) / np.maximum(
        np.sqrt(np.sum(left ** 2, axis=1) * np.sum(right ** 2, axis=1)), 1e-12
    )


def _follow_candidates(pitches: np.ndarray, emission: np.ndarray) -> np.ndarray:
    """Prefer nearby pitches across a phrase when spectra support multiple harmonics."""
    states = np.arange(pitches.shape[1])
    back = np.zeros(pitches.shape, dtype=np.int8)
    primary = pitches[:, 0]
    voiced = np.flatnonzero(np.isfinite(primary))
    output = primary.copy()
    # Brief dropouts retain context. Longer pauses start a new phrase.
    breaks = np.flatnonzero(np.diff(voiced) > 5) + 1
    for phrase in np.split(voiced, breaks):
        if not len(phrase):
            continue
        cumulative = emission[phrase[0]].copy()
        for before, current in zip(phrase[:-1], phrase[1:]):
            distance = np.abs(pitches[before, :, None] - pitches[current, None, :])
            transition = np.minimum(.16 * distance, .60) + 3.0 * (distance >= 9)
            transition = np.nan_to_num(transition, nan=4.0)
            costs = cumulative[:, None] + transition / np.sqrt(current - before)
            back[current] = np.argmin(costs, axis=0)
            cumulative = emission[current] + costs[back[current], states]
        choice = int(np.argmin(cumulative))
        for current in phrase[::-1]:
            output[current] = pitches[current, choice]
            choice = back[current, choice]
    return output


def _bridge_short_gaps(output: np.ndarray, energy: np.ndarray, floor: float) -> list[int]:
    """Bridge short, energetic dropouts between nearby pitches within a phrase."""
    voiced = np.flatnonzero(np.isfinite(output))
    bridged = []
    for left, right in zip(voiced[:-1], voiced[1:]):
        if not 2 <= right - left <= 5 or abs(output[right] - output[left]) > 2:
            continue
        minimum = max(floor, .28 * min(energy[left], energy[right]))
        gap = slice(left + 1, right)
        if np.min(energy[gap]) >= minimum:
            output[gap] = np.linspace(output[left], output[right], right - left + 1)[1:-1]
            bridged.extend(range(left + 1, right))
    return bridged


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
    candidates = 36 + np.arange(48 * bins_per_semitone + 1) / bins_per_semitone
    fundamentals = 440 * 2 ** ((candidates - 69) / 12)
    orders = np.arange(1, 17)
    frequency = fundamentals[:, None] * orders
    bins = np.minimum(np.rint(frequency * transform_size / rate).astype(int), transform_size // 2)
    weights = orders ** -.65
    taper = signal.windows.hann(window_size, sym=False).astype(np.float32)
    pitches = np.full((len(frames), 5), np.nan)
    costs = np.full_like(pitches, np.inf)
    offsets = np.arange(-5, 6)

    for start in range(0, len(frames), 96):
        batch = frames[start:start + 96]
        active = rms[start:start + len(batch)] >= floor
        if not np.any(active):
            continue
        voiced_batch = batch[active]
        spectrum = np.abs(fft.rfft(voiced_batch * taper, n=transform_size, axis=1))
        spectrum[:, :round(48 * transform_size / rate)] = 0
        maxima = ndimage.maximum_filter1d(spectrum, size=7, axis=1)
        peaks = np.where(spectrum >= maxima, spectrum, 0)
        local_peaks = ndimage.maximum_filter1d(peaks, size=5, axis=1)
        extended_peaks = ndimage.maximum_filter1d(peaks, size=9, axis=1)
        strongest = np.max(spectrum, axis=1)[:, None, None]
        evidence = np.where(frequency <= 6500,
                            np.where(frequency >= 1700, extended_peaks[:, bins], local_peaks[:, bins]), 0)
        evidence /= np.maximum(strongest, 1e-10)
        primary = local_peaks[:, bins[:, :8]] / np.maximum(strongest, 1e-10)
        present = primary >= .055
        score = np.sum(np.sqrt(primary) * weights[:8], axis=2)
        score *= .60 + .40 * np.minimum(1.0, primary[:, :, 0] / .16)
        paired_partials = present[:, :, 1::2].any(axis=2) & present[:, :, 2::2].any(axis=2)
        low_partial = present[:, :, 1:3].any(axis=2)
        support = (present.sum(axis=2) >= 2) & (present[:, :, 0] | (low_partial & paired_partials))
        score = np.where(support, score, -1)
        best = np.argmax(score, axis=1)
        rows = np.arange(len(best))
        confidence = score[rows, best]
        indices = start + np.flatnonzero(active)
        usable = confidence >= .63
        pitches[indices[usable], 0] = candidates[best[usable]]
        costs[indices[usable], 0] = 0

        direct_periodicity = _periodicity(voiced_batch, fundamentals[best], rate)

        # Check the lower candidates with the original local peak test and with
        # the longer partial series, which also requires waveform confirmation.
        for state, (multiple, use_extended) in enumerate(((2, False), (3, False), (2, True), (3, True)), start=1):
            center = best - round(12 * np.log2(multiple) * bins_per_semitone)
            near = np.clip(center[:, None] + offsets, 0, len(candidates) - 1)
            partials = orders if use_extended else orders[:8]
            partial_weights = weights[:len(partials)]
            source = evidence if use_extended else primary
            local = source[rows[:, None], near, :]
            shared = partials % multiple == 0
            independent = local[:, :, ~shared]
            independent_peak = independent.max(axis=2)
            minimum_peak = .022 if multiple == 2 else .045
            base_match = local[:, :, shared].max(axis=2)
            plausible = (independent_peak >= minimum_peak) & (base_match >= (.12 if use_extended else .20))
            strength = (np.sqrt(independent) * partial_weights[~shared]).sum(axis=2)
            strength += .22 * (np.sqrt(local[:, :, shared]) * partial_weights[shared]).sum(axis=2)
            strength = np.where(plausible, strength, -1)
            choice = np.argmax(strength, axis=1)
            chosen_bin = near[rows, choice]
            strongest_peak = independent_peak[rows, choice]
            additional_peaks = (independent[rows, choice] >= .095).sum(axis=1) >= 2
            supported = usable & (center >= 0) & (strength[rows, choice] >= 0)
            penalty = np.clip(.30 - 1.5 * strongest_peak, -.50, .38) - .26 * additional_peaks
            if use_extended:
                alternative_periodicity = _periodicity(voiced_batch, fundamentals[chosen_bin], rate)
                period_gain = alternative_periodicity - direct_periodicity
                supported &= (alternative_periodicity >= .40) & (period_gain >= -.12)
                penalty -= np.clip(period_gain, -.25, .9)
            pitches[indices[supported], state] = candidates[chosen_bin[supported]]
            costs[indices[supported], state] = penalty[supported] + (.15 if multiple == 3 else 0)

    output = _follow_candidates(pitches, costs)
    # Remove isolated detections without filling gaps or smoothing away vibrato.
    connected = np.abs(np.diff(output)) <= 4
    neighbours = np.r_[False, connected] | np.r_[connected, False]
    output[~neighbours] = np.nan
    # Use a shorter energy window so the FFT window does not smear over a pause.
    middle = window_size // 2
    half = hop // 2
    energy = np.concatenate([np.sqrt(np.mean(frames[start:start + 256, middle-half:middle+half] ** 2, axis=1))
                             for start in range(0, len(frames), 256)])
    bridged = _bridge_short_gaps(output, energy, floor)
    return HarmonicPitch(hop / rate, output, bridged)

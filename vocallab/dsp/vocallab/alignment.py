from dataclasses import dataclass, replace
from math import gcd
import os
from pathlib import Path
from time import perf_counter

import numpy as np
import soundfile as sf
from scipy import fft, ndimage, signal

FRAME_STEP = .015
RATE = 12000
METHOD = "envelope"
WEIGHTS = {"envelope": .36, "energyChange": .25, "onset": .24, "activity": .15}


@dataclass(frozen=True)
class Detection:
    offset: float | None
    confidence: float
    reliable: bool
    feature_scores: dict
    warnings: list[str]
    feature_ms: float
    correlation_ms: float

    def serializable(self, starts: tuple[float, float], reference_range=None, *, opening_window=False) -> dict:
        return dict(referenceRange=reference_range, openingWindow=opening_window, offsetSeconds=self.offset, originalOffsetSeconds=original_offset(self.offset, starts),
                    confidence=round(self.confidence, 3), reliable=self.reliable, method=METHOD,
                    featureScores=self.feature_scores, warnings=self.warnings,
                    featureMilliseconds=round(self.feature_ms, 2), correlationMilliseconds=round(self.correlation_ms, 2),
                    elapsedMilliseconds=round(self.feature_ms + self.correlation_ms, 2))


@dataclass(frozen=True)
class Features:
    values: dict[str, np.ndarray]
    activity: np.ndarray


@dataclass(frozen=True)
class Alignment:
    reference_times: np.ndarray
    user_times: np.ndarray
    offset: float
    shift: int | None
    confidence: float
    reliable: bool
    warnings: list[str]
    manual_offset: float | None
    automatic: dict | None

    @property
    def method(self):
        return "manual" if self.manual_offset is not None else METHOD

    def serializable(self, starts: tuple[float, float]) -> dict:
        active_offset = self.offset if len(self.reference_times) else None
        return dict(offset=self.offset, offsetSeconds=active_offset, originalOffsetSeconds=original_offset(active_offset, starts),
                    tempoRatio=1.0, transposeSemitones=self.shift, confidence=round(self.confidence, 3),
                    reliable=self.reliable, warnings=self.warnings, manualOffset=self.manual_offset, method=self.method,
                    featureScores=self.automatic["featureScores"] if self.automatic else {},
                    automatic=self.automatic, timeMapping=np.column_stack((self.reference_times, self.user_times)).round(6).tolist())


def original_offset(offset: float | None, starts: tuple[float, float]) -> float | None:
    return None if offset is None else round(offset + starts[1] - starts[0], 6)


def load_mono(path: Path, clip_range=None) -> tuple[np.ndarray, int]:
    with sf.SoundFile(path) as source:
        rate = source.samplerate
        if clip_range is None:
            audio = source.read(dtype="float32", always_2d=True)
        else:
            start, end = (round(t * rate) for t in clip_range)
            source.seek(start)
            audio = source.read(end - start, dtype="float32", always_2d=True)
    mono = audio.mean(axis=1)
    if audio.shape[1] > 1:
        channel_power = np.mean(audio ** 2, axis=0)
        if np.mean(mono ** 2) < .1 * channel_power.max():
            mono = audio[:, channel_power.argmax()]
    return mono, rate


def features(samples: np.ndarray, rate: int) -> Features:
    if rate != RATE:
        divisor = gcd(rate, RATE)
        samples = signal.resample_poly(samples, RATE // divisor, rate // divisor)
    hop = round(FRAME_STEP * RATE)
    width = 480
    padded = np.pad(samples, width // 2)
    frames = np.lib.stride_tricks.sliding_window_view(padded, width)[::hop]
    rms = np.sqrt(np.einsum("ij,ij->i", frames, frames) / width)
    quiet, loud = np.quantile(rms, [.15, .95])
    floor = max(1e-6, quiet * 1.25, loud * .025)
    span = max(1e-6, loud - floor)
    relative = np.maximum(rms - floor, 0) / span
    envelope = ndimage.gaussian_filter1d(np.log1p(8 * np.minimum(relative, 3)), 2.0)
    activity = ndimage.gaussian_filter1d(np.clip(relative * 5, 0, 1), 2.0)
    change = np.gradient(ndimage.gaussian_filter1d(envelope, 1.5))

    # Broad bands make flux largely insensitive to harmonics moving between adjacent FFT bins.
    spectral = np.abs(fft.rfft(frames * signal.windows.hann(width, sym=False).astype(np.float32), axis=1)) ** 2
    bands = np.array([0, 150, 300, 600, 1200, 2400, 4000]) * width // RATE
    power = np.sqrt(np.add.reduceat(spectral, bands, axis=1))
    scale = np.maximum(np.quantile(power, .90, axis=0), max(1e-5, power.max() * .02))
    compressed = np.log1p(5 * power / scale)
    flux = np.mean(np.maximum(np.diff(compressed, axis=0, prepend=compressed[:1]), 0), axis=1)
    onset = ndimage.gaussian_filter1d(flux, 1.5) * ndimage.maximum_filter1d(activity, 7)
    return Features(dict(envelope=envelope, energyChange=change, onset=onset, activity=activity), activity)


def detect(reference: Features, user: Features, search_seconds: float) -> Detection:
    started = perf_counter()
    ra, ua = reference.activity, user.activity
    all_lags = signal.correlation_lags(len(ua), len(ra))
    indices = np.flatnonzero(np.abs(all_lags) * FRAME_STEP <= search_seconds + 1e-9)
    lags = all_lags[indices]

    def correlate(r, u):
        return signal.correlate(u, r, method="fft")[indices]

    def elapsed():
        return (perf_counter() - started) * 1000

    rv, uv = (ra >= .28).astype(float), (ua >= .28).astype(float)
    paired = correlate(rv, uv)
    overlap = np.minimum(len(ra), len(ua) - lags) - np.maximum(0, -lags)
    min_duration = min(2.0, min(len(ra), len(ua)) * FRAME_STEP * .65)
    min_voice = max(.35 / FRAME_STEP, .30 * min(rv.sum(), uv.sum()))
    usable = (overlap * FRAME_STEP >= min_duration) & (paired >= min_voice - 1e-6)
    if not usable.any():
        return Detection(None, 0, False, {}, ["共同演唱时间太短，无法估计偏移。"], 0, elapsed())

    ones_r, ones_u = np.ones(len(ra)), np.ones(len(ua))
    # Per-lag weighted Pearson. Weight is the mean activity of the two frames, so shared silence has zero weight.
    weight = np.maximum(correlate(ra, ones_u) + correlate(ones_r, ua), 1e-8)

    def weighted(r, u):
        return correlate(r * ra, u) + correlate(r, u * ua)

    curves = {}
    for name in WEIGHTS:
        r, u = reference.values[name], user.values[name]
        sx, sy = weighted(r, ones_u), weighted(ones_r, u)
        vx = weighted(r * r, ones_u) - sx * sx / weight
        vy = weighted(ones_r, u * u) - sy * sy / weight
        norm = np.sqrt(np.maximum(vx, 0) * np.maximum(vy, 0))
        covariance = weighted(r, u) - sx * sy / weight
        scores = np.divide(covariance, norm, out=np.zeros_like(norm), where=norm > 1e-7).clip(-1, 1)
        if np.max(norm[usable]) > 1e-7:
            curves[name] = scores

    if not curves:
        return Detection(None, 0, False, {}, ["演唱强弱变化不足，无法估计偏移。"], 0, elapsed())

    support = np.clip(paired / max(1.0, min(rv.sum(), uv.sum())), 0, 1)
    combined = sum(WEIGHTS[name] * scores for name, scores in curves.items()) / sum(WEIGHTS[name] for name in curves)
    combined -= .15 * (1 - support)
    best = int(np.argmax(np.where(usable, combined, -np.inf)))
    offset = round(float(lags[best] * FRAME_STEP), 4)
    score = float(combined[best])
    distant = usable & (np.abs(lags - lags[best]) * FRAME_STEP >= .30)
    margin = score - float(np.max(combined[distant])) if distant.any() else 1.0
    feature_scores = {}
    for name, scores in curves.items():
        peak = int(np.argmax(np.where(usable, scores, -np.inf)))
        feature_scores[name] = dict(offsetSeconds=round(float(lags[peak] * FRAME_STEP), 4),
                                    score=round(float(scores[best]), 3), peakScore=round(float(scores[peak]), 3))

    warnings = []
    if score < .32:
        warnings.append("两轨的演唱强弱和起音匹配较弱，请复听确认偏移。")
    if margin < .045:
        warnings.append("有多个相近的时间偏移，重复节奏可能造成歧义。")
    agreeing = sum(abs(row["offsetSeconds"] - offset) <= .20 and row["score"] >= .23
                   for row in feature_scores.values())
    if agreeing < 2:
        warnings.append("声学特征给出的偏移不一致，建议手动微调。")
    if abs(offset) >= search_seconds - FRAME_STEP and search_seconds >= FRAME_STEP:
        warnings.append("检测值靠近搜索边界，可能需要扩大偏移范围。")
    confidence = float(np.clip(score, 0, 1) * min(1.0, .4 + margin / .15) * min(1.0, .4 + agreeing * .3))
    return Detection(offset if score >= .12 else None, min(confidence, .44) if warnings else confidence,
                     not warnings, feature_scores, warnings, 0, elapsed())


def detect_paths(reference: Path, user: Path, search_seconds: float | None = None, clip_range=None) -> Detection:
    if search_seconds is None:
        search_seconds = float(os.getenv("VOCALLAB_ALIGNMENT_SEARCH_SECONDS", "3"))
    if not np.isfinite(search_seconds) or search_seconds <= 0:
        raise ValueError("Alignment search range must be positive and finite.")
    started = perf_counter()
    ref = features(*load_mono(reference, clip_range))
    usr = features(*load_mono(user, clip_range))
    feature_ms = (perf_counter() - started) * 1000
    return replace(detect(ref, usr, search_seconds), feature_ms=feature_ms)


def nearest(times, track):
    indices = np.rint((times - track.times[0]) / (track.times[1] - track.times[0])).astype(int)
    in_bounds = (indices >= 0) & (indices < len(track.times))
    return np.where(in_bounds, track.midi[np.clip(indices, 0, len(track.times) - 1)], np.nan)


def align(reference, user, durations, automatic: dict | None, manual: float | None = None) -> Alignment:
    candidate = automatic["offsetSeconds"] if automatic else None
    chosen = manual if manual is not None else candidate
    offset = chosen if chosen is not None else 0.0
    start, end = max(0.0, -offset), min(durations[0], durations[1] - offset)
    x = np.array([start, end]) if chosen is not None and end > start else np.empty(0)
    y = x + offset
    reliable = bool(len(x) and (manual is not None or (automatic and automatic["reliable"])))
    confidence = 1.0 if reliable and manual is not None else automatic["confidence"] if automatic and manual is None else 0.0
    warnings = list(automatic["warnings"]) if automatic and manual is None else []
    # Pitch is compared only after timing is fixed. Pitch quality cannot change the detected offset.
    compare = (reference.times >= start) & (reference.times <= end)
    delta = nearest(reference.times[compare] + offset, user) - reference.midi[compare] if len(x) else np.empty(0)
    paired = delta[np.isfinite(delta)]
    shift = int(np.rint(np.median(paired))) if paired.size else 0
    if abs(shift) > 12 or (shift and np.mean(np.abs(paired - shift) <= 1.0) < .65):
        shift = 0
    if reliable and paired.size >= 30 and shift:
        warnings.append("检测到可能的整体移调。移调后的命中率单独列出。")
    return Alignment(x, y, offset, shift if reliable and paired.size >= 30 else None,
                     confidence, reliable, warnings, manual, automatic)

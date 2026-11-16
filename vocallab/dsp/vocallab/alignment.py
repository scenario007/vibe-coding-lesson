from dataclasses import dataclass, replace

import numpy as np
from numba import njit

from .pitch import Pitch

GRID = 0.06


@dataclass(frozen=True)
class Alignment:
    reference_times: np.ndarray
    user_times: np.ndarray
    offset: float
    tempo_ratio: float
    shift: int | None
    confidence: float
    reliable: bool
    warnings: list[str]
    manual_offset: float | None
    method: str = "pitch"

    def serializable(self) -> dict:
        return dict(offset=round(self.offset, 3), tempoRatio=round(self.tempo_ratio, 4),
                    transposeSemitones=self.shift, confidence=round(self.confidence, 3),
                    reliable=self.reliable, warnings=self.warnings, manualOffset=self.manual_offset, method=self.method,
                    timeMapping=[[round(float(r), 4), round(float(u), 4)]
                                 for r, u in zip(self.reference_times, self.user_times)])


def nearest(times: np.ndarray, track: Pitch) -> np.ndarray:
    indices = np.rint(times / (track.times[1] - track.times[0])).astype(int)
    in_bounds = (indices >= 0) & (indices < len(track.times))
    return np.where(in_bounds, track.midi[np.clip(indices, 0, len(track.times) - 1)], np.nan)


def coarse(ref: np.ndarray, usr: np.ndarray) -> tuple:
    positions = np.arange(len(ref))
    ref_valid = np.isfinite(ref)
    max_offset = min(round(30 / GRID), max(2, round(max(len(ref), len(usr)) * 0.45)))
    offsets = np.arange(-max_offset, max_offset + 1, 2)
    ratios = np.unique(np.r_[1.0, np.arange(0.70, 1.401, 0.025)])
    candidates = []
    for ratio in ratios:
        mapped = np.rint(ratio * positions).astype(int)[None, :] + offsets[:, None]
        valid = (mapped >= 0) & (mapped < len(usr))
        midi = np.where(valid, usr[np.clip(mapped, 0, len(usr) - 1)], np.nan)
        delta = midi - ref
        paired = np.isfinite(delta)
        counts = np.sum(paired, axis=1)
        eligible = counts >= max(8, np.count_nonzero(ref_valid) * 0.38,
                                 np.count_nonzero(np.isfinite(usr)) * 0.35)
        if not np.any(eligible):
            continue
        local = delta[eligible]
        shift = np.rint(np.nanmedian(local, axis=1))
        residual = np.abs(local - shift[:, None])
        score = np.nansum(np.minimum(residual, 3.0), axis=1) / counts[eligible]
        score += 1.8 * (1 - counts[eligible] / max(1, np.count_nonzero(ref_valid)))
        score += 0.10 * np.abs(ratio - 1) + 0.0001 * np.abs(offsets[eligible])
        candidates.extend((float(error), ratio, int(offset), int(s))
                          for error, offset, s in zip(score, offsets[eligible], shift))
    if not candidates:
        return 4.0, 1.0, 0, 0, 0.0
    candidates.sort()
    error, ratio, offset, shift = candidates[0]
    alternative = next((row for row in candidates[1:]
                        if abs(row[2] - offset) * GRID > 0.65
                        and abs(row[2] - offset + (row[1] - ratio) * len(ref) * 0.5) * GRID > 0.65),
                       (error + 1, 0, 0, 0))
    return error, ratio, offset, shift, alternative[0] - error


@njit(cache=True)
def bounded_path(ref, usr, ratio, offset, shift, band):
    n, m = len(ref), len(usr)
    costs = np.full((n, m), np.inf)
    directions = np.zeros((n, m), dtype=np.int8)
    start = max(0, int(np.ceil(-offset / ratio)))
    stop = min(n - 1, int(np.floor((m - 1 - offset) / ratio)))
    for i in range(start, stop + 1):
        target = int(round(i * ratio + offset))
        for j in range(max(0, target - band), min(m, target + band + 1)):
            local = 0.15
            if np.isfinite(ref[i]) and np.isfinite(usr[j]):
                local = min(3.2, abs(usr[j] - ref[i] - shift))
            elif np.isfinite(ref[i]) != np.isfinite(usr[j]):
                local = 1.45
            local += 0.25 * abs(j - target) / max(1, band)
            if i == start and j == min(m - 1, max(0, target)):
                costs[i, j] = local
            if i > start and j >= 1 and costs[i - 1, j - 1] + local < costs[i, j]:
                costs[i, j], directions[i, j] = costs[i - 1, j - 1] + local, 1
            if i > start and j >= 2 and costs[i - 1, j - 2] + local + 0.4 < costs[i, j]:
                costs[i, j], directions[i, j] = costs[i - 1, j - 2] + local + 0.4, 2
            if i > start + 1 and j >= 1 and costs[i - 2, j - 1] + local + 0.4 < costs[i, j]:
                costs[i, j], directions[i, j] = costs[i - 2, j - 1] + local + 0.4, 3
    if start >= stop:
        return np.empty(0), np.empty(0)
    j = min(m - 1, max(0, int(round(stop * ratio + offset))))
    if not np.isfinite(costs[stop, j]):
        return np.empty(0), np.empty(0)
    x = []
    y = []
    i = stop
    while i >= start:
        x.append(i * GRID)
        y.append(j * GRID)
        step = directions[i, j]
        if step == 0:
            break
        i -= 2 if step == 3 else 1
        j -= 2 if step == 2 else 1
    return np.asarray(x)[::-1], np.asarray(y)[::-1]


def evidence(r, u, x, y, shift):
    delta = u[np.rint(y / GRID).astype(int)] - r[np.rint(x / GRID).astype(int)]
    matched = np.isfinite(delta)
    paired = int(np.count_nonzero(matched))
    r_voiced = np.count_nonzero(np.isfinite(r))
    u_voiced = np.count_nonzero(np.isfinite(u))
    coverage = min(1.0, paired / max(1, r_voiced, u_voiced))
    density = min(r_voiced / max(len(r), 1), u_voiced / max(len(u), 1))
    if paired:
        errors = np.abs(delta[matched] - shift)
        median, agreement = float(np.median(errors)), float(np.mean(errors <= 1.0))
    else:
        median, agreement = 99.0, 0.0
    return paired, coverage, density, median, agreement, x[matched]


def align(reference: Pitch, user: Pitch, manual: float | None = None) -> Alignment:
    rt = np.arange(0, reference.times[-1], GRID)
    ut = np.arange(0, user.times[-1], GRID)
    r, u = nearest(rt, reference), nearest(ut, user)
    warnings = []
    if manual is not None:
        # A user-supplied anchor is independent of pitch confidence and has no time stretch.
        start, end = max(0.0, -manual), min(reference.times[-1], user.times[-1] - manual)
        x = np.linspace(start, end, max(2, int((end-start) / GRID) + 1)) if end - start > .04 else np.empty(0)
        y = x + manual
        delta = nearest(y, user) - nearest(x, reference)
        delta = delta[np.isfinite(delta)]
        shift = int(np.rint(np.median(delta))) if delta.size else 0
        coverage = min(1.0, delta.size / max(1, np.isfinite(r).sum(), np.isfinite(u).sum()))
        density = min(np.isfinite(r).mean(), np.isfinite(u).mean())
        agreement = float(np.mean(np.abs(delta - shift) <= 1.0)) if delta.size else 0.0
        confident = coverage >= .42 and delta.size * GRID >= 1.0 and density >= .12 and agreement >= .70 and abs(shift) <= 12
        if not confident:
            warnings.append("已按手动对齐点同步复听。音高证据不足，暂不生成对比评分。")
        return Alignment(x, y, manual, 1.0, shift if confident else None,
                         coverage * agreement if confident else 0.0, bool(confident), warnings, manual, "manual")

    error, ratio, offset, shift, margin = coarse(r, u)
    width = min(2.5, max(0.48, len(r) * GRID * 0.05))
    x, y = bounded_path(r, u, ratio, offset, shift, round(width / GRID))
    paired, coverage, density, median, agreement, _ = evidence(r, u, x, y, shift)
    confident = coverage >= 0.42 and paired * GRID >= 1.0 and median <= 0.65 and agreement >= 0.70
    confident &= error <= 1.70 and abs(shift) <= 12 and density >= 0.12
    ambiguous = margin < 0.055 and 0.22 < error < 4
    if np.isfinite(r).sum() >= 8:
        melody = r[np.isfinite(r)]
        transitions = np.count_nonzero(np.diff(np.isfinite(r)))
        ambiguous |= np.ptp(np.quantile(melody, [.15, .85])) < .55 and transitions < 4
    confident &= not ambiguous
    strength = min(1.0, coverage / 0.78) * agreement * (1 - min(median, 1.0) * 0.35)
    if confident:
        if shift:
            warnings.append("检测到可能的整体移调。移调后的命中率单独列出。")
        return Alignment(x, y, offset * GRID, ratio, shift, strength, True, warnings, None)

    if reference.guide_midi is not None and user.guide_midi is not None:
        gr = nearest(rt, replace(reference, midi=reference.guide_midi))
        gu = nearest(ut, replace(user, midi=user.guide_midi))
        score, speed, lag, key, separation = coarse(gr, gu)
        gx, gy = bounded_path(gr, gu, speed, lag, key, round(width / GRID))
        count, overlap, guide_density, residual, same, anchors = evidence(gr, gu, gx, gy, key)
        # Require distinct, distributed melody anchors for timing-only use of softer pitch estimates.
        if (count * GRID >= 2.0 and overlap >= .48 and guide_density >= .14 and residual <= .6
                and same >= .78 and score <= 1.45 and separation >= .09 and abs(key) <= 12
                and np.ptp(anchors) >= 3.0 and np.ptp(gr[np.isfinite(gr)]) >= 3.0):
            left = max(0, np.searchsorted(gx, anchors[0]) - 1)
            right = min(len(gx), np.searchsorted(gx, anchors[-1]) + 2)
            return Alignment(gx[left:right], gy[left:right], lag * GRID, speed, None, min(.44, overlap * same),
                             False, ["已用较弱的旋律证据提供近似复听位置，暂不生成对比评分。"], None, "guide")

    if ambiguous:
        warnings.append("出现多个相近的时间匹配。可参考复听并手动设置偏移。")
    warnings.append("音高轮廓或有效重叠不足。可在两条轨上分别定位同一句，再用当前位置对齐。")
    return Alignment(np.empty(0), np.empty(0), 0.0, 1.0, None, min(0.44, strength * 0.55),
                     False, warnings, None)

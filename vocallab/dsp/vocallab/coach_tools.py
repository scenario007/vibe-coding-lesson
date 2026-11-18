"""Selective acoustic measurements from the report and cached pitch estimates."""
import argparse
from dataclasses import dataclass
import json
from pathlib import Path
from time import perf_counter

import numpy as np
from scipy.ndimage import median_filter
from scipy.signal import correlate, detrend, find_peaks

from .harmonic_pitch import RELIABLE
from .segments import runs

VERSION = 1
MIN_COVERAGE = .50
CATALOG = json.loads(Path(__file__).with_name("coach_catalog.json").read_text())
REGISTRY = {tool["id"]: tool for tool in CATALOG}



@dataclass(frozen=True)
class Track:
    time: np.ndarray
    pitch: np.ndarray
    db: np.ndarray
    active: np.ndarray
    step: float
    duration: float
    source: str
    pitch_source: str

    @classmethod
    def load(cls, workspace, report, role):
        data = report["pitchTracks"][role]
        time = np.asarray(data["timestamps"])
        pitch = np.where(data["voicedFlags"], data["midiPitch"], np.nan).astype(float)
        energy = np.asarray(data["rms"])
        pitch_source = "pYIN"
        preview = workspace / role / "pitch-preview.json"
        if preview.is_file():
            cached = json.loads(preview.read_text())
            if cached.get("frameQuality") and len(cached["frameQuality"]) == len(cached["midiPitch"]):
                pitch = np.asarray(cached["midiPitch"], dtype=float)
                pitch[np.asarray(cached["frameQuality"]) != RELIABLE] = np.nan
                pitch[cached.get("bridgedFrames") or []] = np.nan
                cached_time = np.arange(len(pitch)) * cached["step"]
                energy = np.interp(cached_time, time, energy)
                time, pitch_source = cached_time, "harmonic"
        step = float(np.median(np.diff(time))) if len(time) > 1 else .02
        peak = float(np.quantile(energy, .95))
        active = energy >= max(.00015, peak * .06)
        relative = 20 * np.log10(np.maximum(energy, 1e-6) / max(peak, 1e-6))
        duration = report["preprocessing"][f"{role}Duration"]
        return cls(time, pitch, relative, active, step, duration,
                   report["separation"][role].get("inputTrack", "original"), pitch_source)


def span(mask, step, minimum):
    return list(runs(mask, max(1, int(np.ceil(minimum / step)))))


def join_short_gaps(mask, step, gap):
    result = mask.copy()
    for a, b in runs(~mask, 1):
        if a and b < len(mask) and (b - a) * step <= gap:
            result[a:b] = True
    return result


def bounds(track, a, b):
    return float(track.time[a]), min(track.duration, float(track.time[b - 1] + track.step))


def stable_ranges(track):
    pitch = track.pitch
    stable = np.isfinite(pitch)
    stable[1:] &= ~(np.abs(np.diff(pitch)) > .65)
    for a, b in span(stable, track.step, .14):
        left = a
        seed = max(2, int(.10 / track.step))
        anchor = np.median(pitch[a:min(a + seed, b)])
        while left < b:
            off = np.flatnonzero(np.abs(pitch[left:b] - anchor) > .70)
            end = left + int(off[0]) if len(off) else b
            if (end - left) * track.step >= .14:
                yield left, end
            left = max(left + 1, end)
            if left < b:
                anchor = np.median(pitch[left:min(left + seed, b)])


def high_limit(track):
    values = track.pitch[np.isfinite(track.pitch)]
    return float(np.percentile(values, 79) - .20) if len(values) >= 8 else None


def high_ranges(track, stable, threshold=None):
    p = track.pitch
    limit = high_limit(track) if threshold is None else threshold
    if limit is None:
        return []
    return [(a, b) for a, b in stable if b - a >= 2 and
            (b - a) * track.step >= .16 and np.median(p[a:b]) >= limit]


def groups(ranges, step):
    if not ranges:
        return
    group = [ranges[0]]
    for a, b in ranges[1:]:
        if (a - group[-1][1]) * step <= .55:
            group.append((a, b))
        else:
            if len(group) >= 2:
                yield group
            group = [(a, b)]
    if len(group) >= 2:
        yield group


def transitions(track, kind):
    for a, b in span(np.isfinite(track.pitch), track.step, .12):
        p = median_filter(track.pitch[a:b], size=3)
        delta = np.diff(p)
        if kind == "glissando":
            for direction in (-1, 1):
                movement = (delta * direction > .045) & (delta * direction < .72)
                for i, j in span(movement, track.step, .12):
                    if abs(p[j] - p[i]) >= 1.0:
                        yield a + i, a + j + 1
        else:
            width = max(4, round(.38 / track.step))
            for i in range(0, len(p) - width + 1, max(1, width // 2)):
                j = i + width
                knots = np.r_[p[i], p[i + 2:j - 1:2], p[j - 1]]
                significant = np.diff(knots)
                directions = np.sign(significant[np.abs(significant) >= .50])
                if len(directions) >= 2 and np.any(np.diff(directions)) and np.ptp(knots) >= 1.40:
                    yield a + i, a + j


def candidate_ranges(track, tool, stable, threshold):
    step = track.step
    p, db = track.pitch, track.db
    if tool == "consecutive_high_notes":
        return [(group[0][0], group[-1][1]) for group in groups(high_ranges(track, stable, threshold), step)]
    if tool in ("high_notes", "high_note_attack"):
        high = high_ranges(track, stable, threshold)
        if tool == "high_note_attack":
            return [(max(0, a - round(.16 / step)), min(len(p), max(b, a + round(.22 / step))))
                    for a, b in high]
        return high
    if tool in ("sustained_notes", "vibrato"):
        minimum = REGISTRY[tool]["minimumSeconds"]
        if tool == "vibrato":
            return span(np.isfinite(p), step, minimum)
        return [(a, b) for a, b in stable if (b - a) * step >= minimum]
    if tool == "pitch_leaps":
        return [(max(a, b - round(.22 / step)), min(d, c + round(.30 / step)))
                for (a, b), (c, d) in zip(stable, stable[1:])
                if (c - b) * step <= .18 and abs(np.median(p[c:d]) - np.median(p[a:b])) >= 3]
    if tool in ("melisma", "glissando"):
        return list(transitions(track, tool))
    if tool == "soft_vocal_regions":
        if not track.active.any():
            return []
        cut = min(-8, float(np.percentile(db[track.active], 35)))
        return span(track.active & (db <= cut), step, .40)
    phrases = span(join_short_gaps(track.active, step, .32), step, .65)
    if tool == "relative_dynamics":
        return [(a, b) for a, b in phrases if np.ptp(np.percentile(db[a:b], [15, 85])) >= 7]
    return phrases


def vibrato(pitch, valid, step):
    # A continuous run is required. Interpolated missing F0 cannot create periodicity.
    spans = span(valid, step, .8)
    if not spans:
        return {}
    a, b = max(spans, key=lambda pair: pair[1] - pair[0])
    curve = detrend(pitch[a:b])
    if np.std(curve) < .075 or np.ptp(pitch[a:b]) > 2.2:
        return {}
    corr = correlate(curve, curve, mode="full", method="fft")[len(curve) - 1:]
    corr = corr / corr[0]
    lo, hi = max(2, round(1 / (8 * step))), min(len(curve) - 1, round(1 / (4 * step)))
    peaks = [i for i in find_peaks(corr)[0] if lo <= i <= hi and corr[i] >= .52]
    if not peaks:
        return {}
    lag = max(peaks, key=lambda i: corr[i])
    width = lag * 3
    # Record the first three-cycle window with periodic energy in the detected band.
    onset = next((i for i in range(0, len(curve) - width + 1, max(1, lag // 3))
                  if np.std(curve[i:i + width]) >= .075 and
                  np.corrcoef(curve[i:i + width - lag], curve[i + lag:i + width])[0, 1] >= .55), None)
    return dict(rate_hz=1 / (lag * step), amplitude_cents=np.ptp(np.percentile(curve, [10, 90])) * 50,
                center_midi=np.median(pitch[a:b]), periodicity=corr[lag],
                **({"periodic_onset_s": (a + onset) * step} if onset is not None else {}))


def high_statistics(track, a, b, high_threshold):
    if high_threshold is None:
        return {}
    p = track.pitch[a:b]
    local = Track(track.time[a:b], p, track.db[a:b], track.active[a:b], track.step, track.duration, track.source, track.pitch_source)
    high = high_ranges(local, list(stable_ranges(local)), high_threshold)
    values = [float(np.median(local.pitch[i:j])) for i, j in high]
    result = dict(relative_high_midi=high_threshold, high_note_count=len(high),
                  high_total_s=sum(j - i for i, j in high) * track.step)
    if len(high) >= 2:
        middle = len(high) // 2
        result.update(mean_gap_s=np.mean([i - j for (_, j), (i, _) in zip(high, high[1:])]) * track.step,
                      high_half_change_cents=(np.median(values[-middle:]) - np.median(values[:middle])) * 100)
    return result


def measure(track, interval, tool, target=None, high_threshold=None):
    a, b = np.searchsorted(track.time, interval)
    times = track.time[a:b]
    p, db, active = track.pitch[a:b], track.db[a:b], track.active[a:b]
    valid = np.isfinite(p)
    coverage = np.mean(valid) if len(valid) else 0
    voiced = np.mean(active) if len(active) else 0
    enough = coverage >= MIN_COVERAGE and np.count_nonzero(valid) >= 5
    duration = interval[1] - interval[0]
    metrics = {"duration_s": duration, "pitch_coverage": coverage, "activity_ratio": voiced}
    warnings = []
    if track.source != "original":
        warnings.append("分离音轨可能改变动态并损失微弱人声。")
    if track.pitch_source == "pYIN":
        warnings.append("快速基频质量缓存缺失，使用有效的 pYIN 帧。")
    if np.any(active):
        metrics["active_s"] = np.count_nonzero(active) * track.step
    elif len(active):
        warnings.append("录音电平低于活动阈值，无法可靠判断是否演唱。")
    dynamics = tool in ("relative_dynamics", "soft_vocal_regions")
    if enough:
        values = p[valid]
        metrics.update(representative_midi=np.median(values), highest_midi=np.percentile(values, 95),
                       peak_midi=np.max(values), pitch_variation_cents=np.ptp(np.percentile(values, [10, 90])) * 100)
        if tool in ("high_notes", "consecutive_high_notes"):
            metrics.update(high_statistics(track, a, b, high_threshold))
        first = p[valid & (times <= interval[0] + duration * .25)]
        last = p[valid & (times >= interval[1] - duration * .25)]
        if len(first) >= 3 and len(last) >= 3 and duration >= .4:
            metrics["pitch_drift_cents"] = (np.median(last) - np.median(first)) * 100
        if target is not None and tool in ("high_notes", "high_note_attack", "sustained_notes"):
            metrics["target_midi"] = target
            metrics["deviation_cents"] = (metrics["representative_midi"] - target) * 100
            metrics["near_target_s"] = np.count_nonzero(np.abs(p - target) <= .50) * track.step
        if tool == "high_note_attack":
            indices = np.flatnonzero(valid)
            onset = indices[0]
            if times[onset] - interval[0] <= .24:
                metrics["onset_midi"] = np.median(p[indices[:3]])
                if target is not None:
                    metrics["attack_deviation_cents"] = (metrics["onset_midi"] - target) * 100
                    attack = times <= times[onset] + .35
                    metrics["overshoot_cents"] = max(0, np.nanmax(p[attack]) - target) * 100
                    holds = span(np.abs(p - target) <= .5, track.step, .08)
                    if holds and holds[0][0] >= onset:
                        metrics["reach_target_s"] = times[holds[0][0]] - times[onset]
        if tool in ("vibrato", "sustained_notes"):
            metrics.update(vibrato(p, valid, track.step))
        if tool in ("pitch_leaps", "glissando", "melisma"):
            contiguous = span(valid, track.step, .10)
            if contiguous:
                left, right = max(contiguous, key=lambda pair: pair[1] - pair[0])
                curve = p[left:right]
                metrics["directional_change_cents"] = (np.median(curve[-3:]) - np.median(curve[:3])) * 100
                significant = np.diff(median_filter(curve, 3)[::max(1, round(.045 / track.step))])
                signs = np.sign(significant[np.abs(significant) >= .36])
                metrics["direction_changes"] = np.count_nonzero(np.diff(signs))
                if tool == "pitch_leaps":
                    movement = np.abs(np.diff(curve))
                    change = int(np.argmax(movement)) if len(movement) else 0
                    end = np.median(curve[-3:])
                    arrival = np.flatnonzero(np.abs(curve[change + 1:] - end) <= .5)
                    if len(arrival) and abs(metrics["directional_change_cents"]) >= 200:
                        metrics["transition_s"] = (arrival[0] + 1) * track.step
                        metrics["settled_variation_cents"] = np.ptp(curve[change + 1 + arrival[0]:]) * 100
    if tool in ("vocal_continuity", "sustained_notes", "consecutive_high_notes", "soft_vocal_regions"):
        gaps = [(left, right) for left, right in span(~active, track.step, .11) if left and right < len(active)]
        if np.any(active):
            metrics["activity_gaps"] = len(gaps)
            metrics["interruption_s"] = sum(right - left for left, right in gaps) * track.step
    if dynamics and voiced >= .25:
        low, middle, high = np.percentile(db[active], [10, 50, 90])
        metrics.update(relative_db=middle, dynamic_range_db=high - low)
        thirds = max(1, len(db) // 3)
        if np.any(active[:thirds]) and np.any(active[-thirds:]):
            metrics["tail_change_db"] = np.median(db[-thirds:][active[-thirds:]]) - np.median(db[:thirds][active[:thirds]])
    if not enough:
        warnings.append("实测基频覆盖不足。")
    available = (enough or (dynamics and voiced >= .25)
                 or (tool == "vocal_continuity" and voiced >= .25))
    if tool == "vibrato" and "rate_hz" not in metrics:
        available = False
        warnings.append("没有足够可靠的周期性证据，无法判定颤音。")
    if tool == "high_note_attack" and "onset_midi" not in metrics:
        available = False
        warnings.append("未找到可靠起音。")
    return dict(status="measured" if available else "insufficient", coverage=round(float(coverage), 3),
                source=track.source, pitchSource=track.pitch_source, warnings=warnings,
                metrics={key: round(float(value), 4) for key, value in metrics.items() if np.isfinite(value)})


def mapped_interval(report, interval):
    a, b = interval
    alignment = report["alignment"]
    mapping = np.asarray(alignment["timeMapping"], dtype=float)
    if not alignment["reliable"] or len(mapping) < 2:
        return "alignment", None
    offset = alignment.get("offsetSeconds")
    if offset is None:
        if a < mapping[0, 0] - 1e-5 or b > mapping[-1, 0] + 1e-5:
            return "uncovered", None
        left, right = np.interp([a, b], mapping[:, 0], mapping[:, 1])
    else:
        left, right = a + offset, b + offset
    limit = report["preprocessing"]["userDuration"]
    if left < -1e-5 or right > limit + 1e-5:
        return "uncovered", None
    return "measured", [max(0, float(left)), min(limit, float(right))]


def compare(report, reference, user, interval, tool, threshold=None):
    threshold = high_limit(reference) if threshold is None else threshold
    ref = measure(reference, interval, tool, high_threshold=threshold)
    target = ref["metrics"].get("representative_midi")
    if tool in ("high_note_attack", "consecutive_high_notes"):
        left, right = np.searchsorted(reference.time, interval)
        voiced = reference.pitch[left:right]
        finite = voiced[np.isfinite(voiced)]
        if len(finite) and ref["status"] == "measured":
            target = float(np.median(finite[finite >= np.percentile(finite, 70)]))
            ref = measure(reference, interval, tool, target, threshold)
    state, user_range = mapped_interval(report, interval)
    if not user_range:
        return dict(status=state, reference=ref, user=None, userRange=None, comparison={})
    usr = measure(user, user_range, tool, target, threshold)
    comparison = {}
    if ref["status"] == "measured" and usr["status"] == "measured":
        common = ("representative_midi", "near_target_s", "active_s", "activity_gaps")
        if tool in ("high_notes", "sustained_notes", "consecutive_high_notes", "high_note_attack"):
            common += ("pitch_drift_cents", "reach_target_s")
        if tool == "consecutive_high_notes":
            common += ("high_note_count", "high_total_s", "high_half_change_cents", "mean_gap_s")
        if tool in ("relative_dynamics", "soft_vocal_regions"):
            common += ("dynamic_range_db", "tail_change_db")
        if tool in ("vibrato", "sustained_notes"):
            common += ("rate_hz", "amplitude_cents")
        if tool in ("pitch_leaps", "glissando", "melisma"):
            common += ("directional_change_cents", "direction_changes", "transition_s")
        for key in common:
            if key in ref["metrics"] and key in usr["metrics"]:
                comparison[key] = round(usr["metrics"][key] - ref["metrics"][key], 4)
    else:
        state = "insufficient"
    return dict(status=state, reference=ref, user=usr, userRange=user_range, comparison=comparison)


def run_tools(workspace, report, request):
    track = Track.load(workspace, report, "reference")
    user = Track.load(workspace, report, "user") if request.get("targets") else None
    stable = list(stable_ranges(track))
    selected = request.get("tools", [])
    targets = request.get("targets", [])
    threshold = request.get("highThreshold")
    assert len(selected) <= 6 and len(set(selected)) == len(selected) and len(targets) <= 24
    assert threshold is None or np.isfinite(threshold) and 36 <= threshold <= 84
    assert all(name in REGISTRY for name in selected)
    assert all(item["tool"] in REGISTRY and 0 <= item["start"] < item["end"] <= track.duration + 1e-5
               and item["end"] - item["start"] >= .10 for item in targets)

    candidates, observations, runs_log = [], [], []
    for tool in selected:
        started = perf_counter()
        ranges = candidate_ranges(track, tool, stable, threshold)
        # Prioritize enough evidence for interpretation while retaining several local candidates.
        def relevance(item):
            a, b = item
            if tool == "high_notes":
                return float(np.nanmedian(track.pitch[a:b])), b - a
            return b - a
        retained = sorted(sorted(set(ranges), key=relevance, reverse=True)[:5])
        for a, b in retained:
            left, right = bounds(track, a, b)
            high_threshold = high_limit(track) if threshold is None else threshold
            segment_pitch = track.pitch[a:b]
            attack_target = None
            if tool == "high_note_attack" and np.isfinite(segment_pitch).any():
                attack_target = np.nanpercentile(segment_pitch, 75)
            result = measure(track, (left, right), tool, attack_target, high_threshold)
            if result["status"] != "measured":
                continue
            candidates.append(dict(id=f"{tool}-{a}-{b}", tool=tool, start=round(left, 5), end=round(right, 5),
                                   measurement=result))
        runs_log.append(dict(tool=tool, status="measured" if any(c["tool"] == tool for c in candidates) else "insufficient",
                             milliseconds=round((perf_counter() - started) * 1000, 3)))
    for target in targets:
        started = perf_counter()
        tool = target["tool"]
        result = compare(report, track, user, (target["start"], target["end"]), tool, threshold)
        observations.append(dict(id=f"{target['id']}/{tool}", segmentId=target["id"], tool=tool, **result))
        runs_log.append(dict(tool=tool, status=result["status"], milliseconds=round((perf_counter() - started) * 1000, 3)))
    return dict(version=VERSION, candidates=candidates, observations=observations, runs=runs_log)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("request", type=Path)
    parser.add_argument("result", type=Path)
    args = parser.parse_args()
    report = json.loads(args.report.read_text())
    request = json.loads(args.request.read_text())
    result = run_tools(args.workspace, report, request)
    args.result.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    main()

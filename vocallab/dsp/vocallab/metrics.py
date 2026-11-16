import numpy as np

from .alignment import nearest
from .segments import analyze_segments, uncertain_segments


def evaluate(reference, user, alignment, starts, separated):
    times = reference.times
    valid_reference = np.isfinite(reference.midi)
    valid_user = np.isfinite(user.midi)
    metrics = []

    def metric(name, value, unit, frames, coverage):
        metrics.append(dict(name=name, value=round(float(value), 5) if value is not None else None,
                            unit=unit, validFrames=frames, coverage=round(float(coverage), 5)))

    reference_count = int(np.count_nonzero(valid_reference))
    user_count = int(np.count_nonzero(valid_user))
    signal = min(np.mean(reference.probability[valid_reference]) if reference_count else 0,
                 np.mean(user.probability[valid_user]) if user_count else 0)
    reference_density = reference_count / len(times)
    user_density = user_count / len(user.times)
    metric("referenceF0Coverage", reference_density, "ratio", reference_count, reference_density)
    metric("userF0Coverage", user_density, "ratio", user_count, user_density)
    x, y = alignment.reference_times, alignment.user_times
    mapped = np.interp(times, x, y, left=np.nan, right=np.nan) if len(x) else np.full(len(times), np.nan)
    mapped_pitch = nearest(np.nan_to_num(mapped), user)
    mapped_pitch[~np.isfinite(mapped)] = np.nan
    paired = valid_reference & np.isfinite(mapped_pitch)
    frames = int(np.count_nonzero(paired))
    coverage = frames / max(1, reference_count)
    usable = alignment.reliable and frames >= 30 and coverage >= 0.42
    density_factor = min(1.0, np.sqrt(min(reference_density, user_density) / .55))
    confidence = float(alignment.confidence * min(reference.quality, user.quality) * density_factor *
                       (0.65 + .35 * signal) * (0.89 if separated else 1.0))
    shift = alignment.shift or 0
    cents = (mapped_pitch[paired] - reference.midi[paired]) * 100
    metric("pitchHitRate", np.mean(np.abs(cents) <= 50) if usable else None, "ratio", frames, coverage)
    metric("meanAbsoluteCents", np.mean(np.abs(cents)) if usable else None, "cent", frames, coverage)
    metric("transposedHitRate", np.mean(np.abs(cents - shift * 100) <= 50) if usable else None, "ratio", frames, coverage)
    metric("matchedCoverage", coverage if usable else None, "ratio", frames, coverage)
    deviations = mapped[paired] - (times[paired] + alignment.offset)
    metric("medianTimingDeviation", np.median(np.abs(deviations)) if usable and alignment.method != "manual" else None, "second", frames, coverage)
    if usable:
        probs = np.interp(mapped, user.times, user.probability, left=0, right=0)
        segments, phrases = analyze_segments(times, mapped, reference.midi, mapped_pitch, probs,
                                             shift, starts, confidence)
    else:
        segments = uncertain_segments(reference, starts[0], "reference") + uncertain_segments(user, starts[1], "user")
        phrases = []
    high = [phrase for phrase in phrases if phrase["type"] == "high"]
    high_coverage = sum(phrase["frames"] for phrase in high) / max(1, frames)
    metric("highContinuity", np.mean([p["continuity"] for p in high]) if high else None,
           "ratio", sum(p["frames"] for p in high), high_coverage)
    return metrics, segments, phrases, confidence

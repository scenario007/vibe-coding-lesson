import numpy as np
from scipy.stats import theilslopes


def runs(mask, minimum):
    edges = np.flatnonzero(np.diff(np.r_[False, mask, False]))
    return [(int(a), int(b)) for a, b in edges.reshape(-1, 2) if b - a >= minimum]


def analyze_segments(times, mapped, reference, user, probability, shift, starts, confidence):
    step = times[1] - times[0]
    seconds = lambda n: max(1, round(n / step))
    paired = np.isfinite(reference) & np.isfinite(user) & np.isfinite(mapped)
    cents = (user - reference - shift) * 100
    segments = []

    def mark(kind, a, b, **evidence):
        last = b - 1
        segments.append(dict(type=kind, referenceStart=round(float(times[a] + starts[0]), 4),
                             referenceEnd=round(float(times[last] + starts[0]), 4),
                             userStart=round(float(mapped[a] + starts[1]), 4) if np.isfinite(mapped[a]) else None,
                             userEnd=round(float(mapped[last] + starts[1]), 4) if np.isfinite(mapped[last]) else None,
                             evidence={key: round(float(value), 4) for key, value in evidence.items()},
                             confidence=round(float(confidence), 3)))

    for kind, mask in [("sharp", cents > 65), ("flat", cents < -65)]:
        for a, b in runs(paired & mask, seconds(0.30)):
            mark(kind, a, b, medianCents=np.median(cents[a:b]), frames=b-a)
    for a, b in runs(np.isfinite(reference) & np.isfinite(mapped) & ((probability < 0.5) | ~np.isfinite(user)),
                     seconds(0.32)):
        mark("uncertain_pitch", a, b, medianProbability=np.median(probability[a:b]), frames=b-a)

    def summarize(a, b, kind):
        valid = paired[a:b]
        errors = cents[a:b]
        count = int(np.count_nonzero(valid))
        continuity = count / (b - a)
        # Chunk medians suppress oscillation before the robust slow-drift estimate.
        blocks = [(times[i:min(i+seconds(0.24), b)], cents[i:min(i+seconds(0.24), b)])
                  for i in range(a, b, seconds(0.24))]
        centers = [(np.median(t[np.isfinite(e)]), np.nanmedian(e)) for t, e in blocks
                   if np.count_nonzero(np.isfinite(e)) >= max(3, len(e) * 0.55)]
        drift = None
        if len(centers) >= 4 and continuity >= 0.65:
            center_times, center_pitch = np.asarray(centers).T
            drift = float(theilslopes(center_pitch, center_times).slope * (center_times[-1] - center_times[0]))
        median = float(np.median(errors[valid])) if count else None
        hit = float(np.mean(np.abs(errors[valid]) <= 50)) if count else None
        if drift is not None and abs(drift) >= 50:
            mark("drift" if kind == "sustained" else "high_drop" if drift < -50 else "drift",
                 a, b, driftCents=drift, coverage=continuity)
        for gap_start, gap_end in runs(~valid, seconds(0.24)):
            if kind == "sustained":
                mark("interruption", a + gap_start, a + gap_end,
                     missingSeconds=(gap_end - gap_start) * step)
            elif continuity >= 0.2:
                mark("high_interruption", a + gap_start, a + gap_end,
                     missingSeconds=(gap_end - gap_start) * step)
        return dict(type=kind, referenceStart=round(float(times[a] + starts[0]), 4),
                    referenceEnd=round(float(times[b-1] + starts[0]), 4),
                    frames=count, continuity=round(continuity, 4),
                    driftCents=round(drift, 2) if drift is not None else None,
                    medianCents=round(median, 2) if median is not None else None,
                    hitRate=round(hit, 4) if hit is not None else None)

    sustained = []
    within_range = np.isfinite(reference) & np.isfinite(mapped)
    for a, b in runs(within_range, seconds(0.8)):
        anchor = a
        for i in range(a + 1, b + 1):
            if i == b or abs(reference[i] - reference[anchor]) > 0.65:
                if i - anchor >= seconds(0.8):
                    sustained.append(summarize(anchor, i, "sustained"))
                anchor = i
    valid_reference = reference[within_range]
    high = []
    if len(valid_reference) and np.ptp(valid_reference) >= 3.5:
        threshold = max(np.quantile(valid_reference, 0.76), np.median(valid_reference) + 1.8)
        high = [summarize(a, b, "high") for a, b in runs(within_range & (reference >= threshold), seconds(0.48))]
    return sorted(segments, key=lambda segment: segment["referenceStart"]), sustained + high


def uncertain_segments(track, start, role):
    minimum = round(0.45 / (track.times[1] - track.times[0]))
    signal = track.rms >= max(0.00015, np.quantile(track.rms, 0.92) * 0.045)
    return [
        dict(type="uncertain_pitch", referenceStart=round(float(track.times[a] + start), 4) if role == "reference" else None,
             referenceEnd=round(float(track.times[b-1] + start), 4) if role == "reference" else None,
             userStart=round(float(track.times[a] + start), 4) if role == "user" else None,
             userEnd=round(float(track.times[b-1] + start), 4) if role == "user" else None,
             evidence=dict(medianProbability=round(float(np.median(track.probability[a:b])), 4), frames=b-a),
             confidence=0.35)
        for a, b in runs(signal & ~np.isfinite(track.hz), minimum)
    ]

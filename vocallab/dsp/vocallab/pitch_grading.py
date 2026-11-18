"""Phrase and note scores derived exclusively from harmonic pitch evidence."""
import json
from dataclasses import dataclass
from time import perf_counter

import numpy as np
from scipy.ndimage import maximum_filter1d, median_filter

from .harmonic_pitch import OCTAVE_UNCERTAIN, QUIET, RELIABLE, HarmonicPitch, extract
from .report import ROLES, save_preview
from .segments import runs


@dataclass(frozen=True)
class NoteGrade:
    score: float | None
    missed: bool
    paired: int
    octave_frames: int
    cents: float | None
    drift: float | None
    weight: float


def note_ranges(pitch, step):
    minimum = round(.12 / step)
    lookahead = max(3, round(.08 / step))
    for start, end in runs(np.isfinite(pitch), minimum):
        notes = median_filter(pitch[start:end], size=3, mode="nearest")
        left = 0
        anchor = np.median(notes[:lookahead])
        possible = np.flatnonzero(np.abs(np.diff(notes)) >= .375) + 1
        for cut in possible:
            following = notes[cut:cut + lookahead]
            if (cut - left >= minimum and len(following) == lookahead
                    and np.ptp(following) <= .70 and abs(np.median(following) - anchor) >= .85):
                yield start + left, start + cut
                left, anchor = cut, np.median(following)
        if len(notes) - left >= minimum:
            yield start + left, end


def phrases(quality, step):
    # Join short internal rests while leaving long reference silence out of the score.
    active = quality != QUIET
    for a, b in runs(~active, 1):
        if a and b < len(active) and (b - a) * step <= .28:
            active[a:b] = True
    return runs(active, max(1, round(.14 / step)))


def estimate_local_shift(ref_activity, user_activity, mapped_start, step):
    """Report a clearly better local lag without changing the applied offset."""
    wing = round(.36 / step)
    length = len(ref_activity)
    start = mapped_start - wing
    stop = mapped_start + length + wing
    if length < .65 / step or start < 0 or stop > len(user_activity):
        return None
    reference = ref_activity.astype(np.float32)
    reference -= reference.mean()
    if np.std(reference) < 8:
        return None
    windows = np.lib.stride_tricks.sliding_window_view(user_activity[start:stop], length).astype(np.float32)
    windows -= windows.mean(axis=1, keepdims=True)
    norm = np.linalg.norm(windows, axis=1) * np.linalg.norm(reference)
    scores = np.sum(windows * reference, axis=1) / np.maximum(norm, 1e-8)
    best = int(np.argmax(scores))
    lag = (best - wing) * step
    alternatives = np.abs(np.arange(len(scores)) - best) * step >= .14
    if (abs(lag) >= .22 and scores[best] >= .64 and scores[best] - scores[wing] >= .20
            and scores[best] - np.max(scores[alternatives], initial=-1) >= .09):
        return round(lag * 1000)
    return None


def grade_note(ref, usr, paired, quiet, octave, step):
    count = int(paired.sum())
    weight = min(.8, len(ref) * step)
    octave_frames = int(octave.sum())
    if count >= max(3, round(.08 / step)) and count / len(ref) >= .55:
        delta = 100 * (usr[paired] - ref[paired])
        points = np.interp(np.abs(delta), [0, 20, 50, 100, 200], [100, 100, 75, 35, 0])
        drift = None
        part = len(ref) // 4
        if len(ref) * step >= .65 and paired[:part].sum() >= 4 and paired[-part:].sum() >= 4:
            change = np.median(delta[-paired[-part:].sum():]) - np.median(delta[:paired[:part].sum()])
            if abs(change) >= 45:
                drift = float(change)
        return NoteGrade(float(points.mean()), False, count, octave_frames, float(np.median(delta)), drift, weight)
    if count == 0 and len(ref) * step >= .11 and quiet.mean() >= .67:
        return NoteGrade(0.0, True, 0, octave_frames, None, None, weight)
    return NoteGrade(None, False, count, octave_frames, None, None, weight)


def aggregate(notes):
    decided = [note for note in notes if note.score is not None]
    score = round(float(np.average([note.score for note in decided], weights=[note.weight for note in decided])), 1) if decided else None
    missed = sum(note.missed for note in decided)
    return score, len(decided) - missed, missed


def grade(reference: HarmonicPitch, user: HarmonicPitch, preprocessing: dict, alignment: dict) -> dict:
    started = perf_counter()
    step = reference.step
    origin = preprocessing["referenceStart"]
    duration = preprocessing["referenceDuration"]
    automatic = alignment.get("automatic") or {}
    chosen = None if automatic.get("openingWindow") else automatic.get("referenceRange")
    start, end = chosen if chosen else (0, duration)
    start, end = max(0, min(duration, start)), max(0, min(duration, end))
    lower, upper = np.searchsorted(np.arange(len(reference.midi)) * step, [start, end])
    ref = reference.midi[lower:upper].copy()
    ref_quality = reference.quality[lower:upper]
    bridged = np.asarray(reference.bridged_frames, dtype=int) - lower
    ref[bridged[(bridged >= 0) & (bridged < len(ref))]] = np.nan

    offset = alignment.get("offsetSeconds")
    fixed = offset is not None and alignment.get("reliable", False) and step == user.step
    mapped = np.rint((np.arange(lower, upper) * step + (offset if offset is not None else 0)) / user.step).astype(int)
    inside = (mapped >= 0) & (mapped < len(user.midi))
    mapped = mapped.clip(0, len(user.midi) - 1)
    usr = user.midi[mapped]
    usr_quality = user.quality[mapped]
    trusted = inside & (ref_quality == RELIABLE) & (usr_quality == RELIABLE) & np.isfinite(ref) & np.isfinite(usr)
    conservative_quiet = maximum_filter1d(user.quality != QUIET, size=9, mode="constant", cval=True) == 0
    missing = inside & (ref_quality == RELIABLE) & conservative_quiet[mapped]
    octave = inside & ((ref_quality == OCTAVE_UNCERTAIN) | (usr_quality == OCTAVE_UNCERTAIN))

    def absolute(frame):
        return round(origin + min(end, max(start, (lower + frame) * step)), 4)

    phrase_scores, all_notes = [], []
    scored_phrases = undecidable_phrases = total_notes = 0
    ref_activity = reference.activity[lower:upper]
    for a, b in phrases(ref_quality, step):
        candidates = [(a + left, a + right) for left, right in note_ranges(ref[a:b], step)]
        total_notes += len(candidates)
        timing = estimate_local_shift(ref_activity[a:b], user.activity,
                                      int(round(((lower + a) * step + offset) / user.step)), step) if fixed else None
        notes = []
        if fixed and timing is None:
            for left, right in candidates:
                trim = 2 if (right - left) * step >= .22 else 0
                core = slice(left + trim, right - trim)
                notes.append(grade_note(ref[core], usr[core], trusted[core], missing[core], octave[core], step))
        score, scored, missed = aggregate(notes)
        decided = scored + missed
        if not fixed or timing is not None:
            status, score = "alignment", None
        elif not candidates or decided / len(candidates) < .60:
            status, score = "insufficient", None
        elif scored == 0:
            status = "missed"
        else:
            status = "scored"
        all_notes.extend(notes)
        if status in ("scored", "missed"):
            scored_phrases += 1
        else:
            undecidable_phrases += 1
        cents = [note.cents for note in notes if note.cents is not None]
        drifts = [note.drift for note in notes if note.drift is not None]
        details = []
        for index, (left, right) in enumerate(candidates):
            note = notes[index] if notes else None
            decision = "alignment" if note is None else "missed" if note.missed else (
                "scored" if note.score is not None else "insufficient")
            details.append(dict(start=absolute(left), end=absolute(right), status=decision,
                                referenceMidi=round(float(np.median(ref[left:right])), 3),
                                score=round(note.score, 1) if note and note.score is not None else None,
                                deviationCents=round(note.cents, 1) if note and note.cents is not None else None))
        phrase_scores.append(dict(start=absolute(a), end=absolute(b),
                                  status=status, score=score, totalNotes=len(candidates),
                                  scoredNotes=scored, missedNotes=missed, pairedFrames=sum(n.paired for n in notes),
                                  octaveUncertainFrames=sum(n.octave_frames for n in notes),
                                  deviationCents=round(float(np.median(cents)), 1) if cents else None,
                                  driftCents=round(max(drifts, key=abs), 1) if drifts else None,
                                  timingMilliseconds=timing, notes=details))
    overall, scored, missed = aggregate(all_notes)
    coverage = (scored + missed) / max(1, total_notes)
    enough_phrases = (scored_phrases >= (2 if len(phrase_scores) > 1 else 1)
                      and scored_phrases / max(1, len(phrase_scores)) >= .60)
    status = "scored" if fixed and scored + missed >= 5 and coverage >= .60 and enough_phrases else (
        "alignment" if not fixed else "insufficient")
    return dict(version=1, start=round(origin + start, 4), end=round(origin + end, 4),
                status=status, score=overall if status == "scored" else None,
                coverage=round(coverage, 4), totalNotes=total_notes, scoredNotes=scored, missedNotes=missed,
                pairedFrames=sum(n.paired for n in all_notes), scoredPhrases=scored_phrases,
                pendingPhrases=undecidable_phrases, phrases=phrase_scores,
                elapsedMilliseconds=round((perf_counter() - started) * 1000, 2))


def score_report(report, workspace):
    started = perf_counter()
    harmonic = {}
    for role in ROLES:
        folder = workspace / role
        cache = folder / "pitch-preview.json"
        if cache.is_file():
            data = json.loads(cache.read_text())
            if len(data.get("frameQuality") or ()) == len(data["midiPitch"]) == len(data.get("activity") or ()):
                harmonic[role] = HarmonicPitch.from_cache(data)
                continue
        path = folder / (report["separation"][role].get("inputTrack", "original") + ".wav")
        if not path.is_file():
            return report
        harmonic[role] = extract(path)
        save_preview(folder, harmonic[role])
    evidence_ms = (perf_counter() - started) * 1000
    score = grade(harmonic["reference"], harmonic["user"], report["preprocessing"], report["alignment"])
    score["evidenceMilliseconds"] = round(evidence_ms, 2)
    print(f"PITCH SCORE evidence={evidence_ms:.2f} ms grading={score['elapsedMilliseconds']:.2f} ms", flush=True)
    return dict(report, pitchScore=score)

from dataclasses import replace

import numpy as np

from vocallab.harmonic_pitch import OCTAVE_UNCERTAIN, QUIET, UNCERTAIN, HarmonicPitch, track
from vocallab.pitch_grading import estimate_local_shift, grade

STEP = .02
RATE = 22050
NOTES = [55, 59, 62, 57, 62, 60, 63, 67]
PREPROCESSING = dict(referenceStart=12.0, referenceDuration=8.0)
ALIGNMENT = dict(offsetSeconds=.5, reliable=True, automatic=None)


def melody(shift=0, delay=0, skip=None):
    rng = np.random.default_rng(12)
    blocks = [np.zeros(round((.2 + delay) * RATE))]
    for i, note in enumerate(NOTES):
        t = np.arange(round((.34 + (i % 3) * .08) * RATE)) / RATE
        phase = 2 * np.pi * t * (440 * 2 ** ((note + shift - 69) / 12))
        edge = np.minimum(1, np.minimum(t, t[-1] - t) / .035)
        voice = .28 * edge * (np.sin(phase) + .48 * np.sin(2 * phase) + .26 * np.sin(3 * phase))
        if i == skip:
            voice[:] = 0
        blocks.extend((voice * rng.uniform(.8, 1.1), np.zeros(round((.46 if i in (2, 5) else .10) * RATE))))
    blocks.append(np.zeros(RATE))
    return np.concatenate(blocks).astype(np.float32)


def test_harmonic_score_recognizes_delayed_copy_and_penalizes_clear_wrong_notes():
    reference = track(melody(), RATE)
    good = grade(reference, track(melody(delay=.5), RATE), PREPROCESSING, ALIGNMENT)
    bad = grade(reference, track(melody(shift=2, delay=.5), RATE), PREPROCESSING, ALIGNMENT)
    assert good["status"] == bad["status"] == "scored"
    assert good["score"] >= 95 and bad["score"] <= 10
    assert good["scoredNotes"] == bad["scoredNotes"] == len(NOTES)
    octave = grade(reference, track(melody(shift=-12, delay=.5), RATE), PREPROCESSING, ALIGNMENT)
    assert octave["score"] <= 10 and octave["scoredNotes"] == len(NOTES)
    assert good["start"] == 12.0 and good["phrases"][0]["start"] > 12


def test_confirmed_silence_counts_as_missed_but_uncertain_noise_does_not():
    reference = track(melody(), RATE)
    user = track(melody(delay=.5, skip=0), RATE)
    scored = grade(reference, user, PREPROCESSING, ALIGNMENT)
    assert scored["missedNotes"] == 1
    assert scored["phrases"][0]["notes"][0]["status"] == "missed"
    noisy = replace(user, quality=np.where(user.quality == QUIET, UNCERTAIN, user.quality))
    unknown = grade(reference, noisy, PREPROCESSING, ALIGNMENT)
    assert unknown["missedNotes"] == 0
    assert unknown["coverage"] < scored["coverage"]


def test_unreliable_timing_and_ambiguous_octaves_do_not_generate_scores():
    ref = track(melody(), RATE)
    usr = track(melody(delay=.5), RATE)
    no_alignment = grade(ref, usr, PREPROCESSING, dict(ALIGNMENT, reliable=False))
    assert no_alignment["status"] == "alignment" and no_alignment["score"] is None
    ambiguous = replace(usr, quality=np.where(np.isfinite(usr.midi), OCTAVE_UNCERTAIN, usr.quality))
    result = grade(ref, ambiguous, PREPROCESSING, ALIGNMENT)
    assert result["score"] is None and result["missedNotes"] == 0
    assert sum(phrase["octaveUncertainFrames"] for phrase in result["phrases"]) > 0


def test_mapped_selection_and_quiet_track_ignore_plotting_range_and_bridges():
    reference = track(melody(shift=-12), RATE)
    user = track(melody(shift=-12, delay=.5), RATE)
    preview = user.serializable()
    upgraded = HarmonicPitch.from_cache(preview)
    assert np.array_equal(user.quality, upgraded.quality) and np.array_equal(user.activity, upgraded.activity)
    alignment = dict(ALIGNMENT, automatic={"referenceRange": [0, 1.55]})
    score = grade(reference, upgraded, PREPROCESSING, alignment)
    assert (score["start"], score["end"]) == (12.0, 13.55)
    assert score["scoredNotes"] >= 2
    assert score["score"] is None
    assert len(score["phrases"]) <= 2 and max(p["end"] for p in score["phrases"]) <= 13.55


def test_local_timing_diagnostic_preserves_the_fixed_mapping():
    t = np.arange(1, 141)
    rng = np.random.default_rng(7)
    sequence = (40 + 25 * np.sin(t / 6) + 12 * np.sin(t / 3.3) + rng.integers(-5, 5, len(t))).astype(np.uint8)
    user = np.pad(sequence, (44, 30))
    assert estimate_local_shift(sequence, user, 30, STEP) == 280
    assert estimate_local_shift(sequence, user, 44, STEP) is None

import json

import numpy as np
import pytest

from vocallab.coach_tools import Track, candidate_ranges, compare, measure, run_tools, stable_ranges
from vocallab.harmonic_pitch import OCTAVE_UNCERTAIN, RELIABLE


def track(pitch, energy=None, step=.02):
    p = np.asarray(pitch, dtype=float)
    time = np.arange(len(p)) * step
    power = np.asarray(energy) if energy is not None else np.where(np.isfinite(p), -3., -65.)
    return Track(time, p, power, power > -25, step, len(p) * step, "original", "harmonic")


def ref_report(offset=.5, reliable=True):
    return {"alignment": {"reliable": reliable, "offsetSeconds": offset, "timeMapping": [[0, .5], [2.5, 3]]},
            "preprocessing": {"referenceStart": 18., "userStart": 23., "referenceDuration": 3., "userDuration": 3.}}


def test_sustained_pitch_drift_and_activity_gap():
    p = np.linspace(72., 71., 100)
    p[40:48] = np.nan
    result = measure(track(p), [0., 2.], "sustained_notes")
    assert result["status"] == "measured"
    assert result["metrics"]["pitch_drift_cents"] == pytest.approx(-75.76, abs=2)
    assert result["metrics"]["interruption_s"] == pytest.approx(.16)
    assert result["coverage"] == .92
    assert "rate_hz" not in result["metrics"]


def test_vibrato_recovers_period_and_rejects_irregular_jitter():
    time = np.arange(125) * .02
    regular = 71 + .28 * np.sin(2 * np.pi * 5 * time)
    result = measure(track(regular), [0, 2.5], "vibrato")
    assert result["metrics"]["rate_hz"] == pytest.approx(5., abs=.4)
    assert result["metrics"]["amplitude_cents"] == pytest.approx(27, abs=4)
    assert result["metrics"]["periodic_onset_s"] < .2
    rng = np.random.default_rng(14)
    jitter = measure(track(71 + rng.normal(0, .27, len(time))), [0, 2.5], "vibrato")
    assert jitter["status"] == "insufficient"
    regular[::2] = np.nan
    assert measure(track(regular), [0, 2.5], "vibrato")["status"] == "insufficient"


def test_high_attack_detects_inward_slide_and_correct_offset():
    pre = np.r_[np.full(20, np.nan), np.full(50, 72.), np.full(80, np.nan)]
    cover = np.r_[np.full(45, np.nan), np.linspace(69., 72., 17), np.full(33, 72.), np.full(55, np.nan)]
    result = compare(ref_report(), track(pre), track(cover), (.4, 1.4), "high_note_attack")
    assert result["status"] == "measured"
    assert result["userRange"] == pytest.approx([.9, 1.9])
    assert result["user"]["metrics"]["attack_deviation_cents"] < -260
    assert result["user"]["metrics"]["reach_target_s"] == pytest.approx(.28, abs=.025)
    assert compare(ref_report(reliable=False), track(pre), track(cover), (.4, 1.4), "high_notes")["status"] == "alignment"
    assert compare(ref_report(), track(pre), track(cover), (2.2, 2.8), "high_notes")["status"] == "uncovered"
    early = compare(ref_report(offset=-.5), track(cover), track(pre), (.9, 1.9), "high_notes")
    assert early["userRange"] == pytest.approx([.4, 1.4])


def test_consecutive_highs_leap_glide_and_melisma_candidates():
    notes = track(np.r_[np.repeat(67., 16), np.repeat(72., 28), np.repeat(73., 35), np.repeat(71., 25)])
    stable = list(stable_ranges(notes))
    assert candidate_ranges(notes, "consecutive_high_notes", stable, 70.)
    assert candidate_ranges(notes, "pitch_leaps", stable, None)
    high = measure(notes, [.32, 2.08], "consecutive_high_notes", high_threshold=70.)
    assert high["metrics"]["high_note_count"] == 3
    assert high["metrics"]["high_half_change_cents"] < 0
    assert high["metrics"]["high_total_s"] == pytest.approx(1.72, abs=.06)
    glide = track(np.linspace(65., 70., 30))
    assert candidate_ranges(glide, "glissando", [], None)
    turn = track(np.interp(np.arange(25), [0, 4, 8, 12, 16, 20, 24], [64, 67, 63, 66, 64, 66, 65]))
    assert candidate_ranges(turn, "melisma", [], None)


def test_relative_dynamics_and_soft_voice_do_not_assume_volume_matches_pitch():
    p = np.full(100, 65.)
    db = np.r_[np.full(30, -3.), np.full(40, -15.), np.full(30, -6.)]
    a = track(p, db)
    b = track(p, db - 2)
    assert candidate_ranges(a, "soft_vocal_regions", [], None)
    assert candidate_ranges(a, "relative_dynamics", [], None)
    for item in (a, b):
        measured = measure(item, [0., 2.], "relative_dynamics")
        assert measured["metrics"]["dynamic_range_db"] == pytest.approx(12)
    quiet = measure(track(np.full(100, np.nan)), [0., 2.], "relative_dynamics")
    assert quiet["status"] == "insufficient"
    assert "relative_db" not in quiet["metrics"]


def test_registry_selects_only_requested_tools_and_ignores_bridged_and_octave_frames(tmp_path):
    report = ref_report()
    pitch = [70.] * 150
    ref = {"timestamps": (np.arange(150) * .02).tolist(), "midiPitch": pitch, "voicedFlags": [True] * 150,
           "rms": [.02] * 150}
    report.update(pitchTracks={"reference": ref, "user": ref},
                  separation={"reference": {"inputTrack": "vocals"}, "user": {"inputTrack": "original"}})
    folder = tmp_path / "reference"
    folder.mkdir()
    evidence = {"step": .02, "midiPitch": pitch, "frameQuality": [OCTAVE_UNCERTAIN] * 8 + [RELIABLE] * 142,
                "bridgedFrames": [8, 9]}
    (folder / "pitch-preview.json").write_text(json.dumps(evidence))
    result = run_tools(tmp_path, report, {"tools": ["sustained_notes"], "targets": [
        {"id": "mark", "tool": "sustained_notes", "start": 0., "end": .4}]})
    assert [item["tool"] for item in result["candidates"]] == ["sustained_notes"]
    assert result["candidates"][0]["start"] == pytest.approx(.20)
    note = result["observations"][0]
    assert note["reference"]["coverage"] == .5
    assert note["user"]["pitchSource"] == "pYIN"
    assert note["reference"]["source"] == "vocals"
    with pytest.raises(AssertionError):
        run_tools(tmp_path, report, {"tools": ["nonexistent_tool"]})

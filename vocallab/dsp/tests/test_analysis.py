from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from vocallab.alignment import align
from vocallab.metrics import evaluate
from vocallab.pitch import extract
from vocallab.segments import analyze_segments

RATE = 22050
NOTES = np.array([57, 62, 60, 66, 69, 64, 61, 72, 67, 65])


def song(delay=0, semitones=0, gain=0.35, durations=None, notes=NOTES):
    lengths = durations if durations is not None else [0.53, .72, .45, .87, .41, .53, .49, .68, .32, .6]
    blocks = [np.zeros(round(delay * RATE))]
    for note, duration in zip(notes + semitones, lengths):
        t = np.arange(round(duration * RATE)) / RATE
        hz = 440 * 2 ** ((note - 69) / 12)
        phase = 2 * np.pi * hz * t
        envelope = np.minimum(1, np.minimum(t, t[-1]-t) / 0.025)
        blocks.extend((gain * envelope * (np.sin(phase) + 0.2 * np.sin(phase * 2)), np.zeros(round(0.085 * RATE))))
    return np.concatenate(blocks)


def track(path: Path, audio):
    sf.write(path, audio, RATE)
    return extract(path)


@pytest.fixture(scope="module")
def reference(tmp_path_factory):
    return track(tmp_path_factory.mktemp("pitch") / "reference.wav", song())


@pytest.mark.parametrize(("changes", "delay", "shift"), [
    ({}, 0, 0), ({"delay": 1}, 1, 0), ({"semitones": 1}, 0, 1),
    ({"gain": .045}, 0, 0),
    ({"durations": [.62, .72, .35, .97, .41, .41, .53, .68, .39, .67]}, 0, 0),
])
def test_expected_pitch_and_alignment(reference, tmp_path, changes, delay, shift):
    user = track(tmp_path / "user.wav", song(**changes))
    alignment = align(reference, user)
    assert alignment.reliable, alignment
    assert alignment.shift == shift
    assert abs(alignment.offset - delay) <= .32
    metrics, _, _, _ = evaluate(reference, user, alignment, (0, 0), False)
    metrics = {metric["name"]: metric["value"] for metric in metrics}
    assert metrics["transposedHitRate"] >= .83
    if shift:
        assert metrics["pitchHitRate"] < .15
        assert 83 <= metrics["meanAbsoluteCents"] <= 130


@pytest.mark.parametrize("other", ["silence", "noise", "different"])
def test_low_confidence_suppresses_comparison(reference, tmp_path, other):
    audio = {
        "silence": np.zeros(RATE * 10),
        "noise": np.random.default_rng(31).standard_normal(RATE * 4) * .08,
        "different": song(notes=np.array([66, 51, 72, 60, 68, 72, 58, 52, 60, 70])),
    }[other]
    user = track(tmp_path / "other.wav", audio)
    alignment = align(reference, user)
    assert not alignment.reliable
    metrics, _, _, _ = evaluate(reference, user, alignment, (0, 0), False)
    assert next(item for item in metrics if item["name"] == "meanAbsoluteCents")["value"] is None


def test_manual_offset_and_absolute_mapping(reference, tmp_path):
    user = track(tmp_path / "manual.wav", song(delay=1))
    result = align(reference, user, manual=1.0)
    assert result.reliable
    assert abs(result.offset - 1) < .055
    assert result.manual_offset == 1
    assert np.all(np.diff(result.user_times) > 0)


def test_slow_drift_is_distinguished_from_vibrato():
    t = np.arange(0, 2, .02)
    ref = np.full(len(t), 67)
    vibrato = .65 * np.sin(t * 2 * np.pi * 5.2)
    segments, phrases = analyze_segments(t, t, ref, ref + vibrato, np.ones(len(t)), 0, (2, 3), .9)
    assert not any(item["type"] == "drift" for item in segments)
    assert abs(phrases[0]["driftCents"]) < 35
    segments, _ = analyze_segments(t, t, ref, ref + t * .65 + vibrato, np.ones(len(t)), 0, (2, 3), .9)
    assert any(item["type"] == "drift" for item in segments)


def test_manual_offset_still_enables_listening_when_pitch_is_unreliable(reference, tmp_path):
    user = track(tmp_path / "limited.wav", np.zeros(len(song())))
    alignment = align(reference, user, manual=.83)
    assert not alignment.reliable
    assert alignment.method == "manual" and alignment.offset == .83
    assert len(alignment.reference_times) >= 2
    np.testing.assert_allclose(alignment.user_times - alignment.reference_times, .83)
    metrics, _, _, _ = evaluate(reference, user, alignment, (0, 0), False)
    assert next(item for item in metrics if item["name"] == "pitchHitRate")["value"] is None


def test_weaker_contour_can_supply_timing_without_scoring(reference, tmp_path):
    from dataclasses import replace

    user = track(tmp_path / "weak.wav", song(delay=1))
    limited = replace(user, midi=np.full_like(user.midi, np.nan))
    alignment = align(reference, limited)
    assert alignment.method == "guide" and not alignment.reliable
    assert abs(alignment.offset - 1) <= .20
    assert len(alignment.reference_times) >= 2

from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from vocallab.alignment import align, detect_paths
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
    path = tmp_path_factory.mktemp("pitch") / "reference.wav"
    return path, track(path, song())


@pytest.mark.parametrize(("changes", "delay", "shift"), [
    ({}, 0, 0), ({"delay": 1}, 1, 0), ({"semitones": 1}, 0, 1),
    ({"gain": .045}, 0, 0),
])
def test_expected_pitch_and_alignment(reference, tmp_path, changes, delay, shift):
    ref_path, ref = reference
    path = tmp_path / "user.wav"
    user = track(path, song(**changes))
    automatic = detect_paths(ref_path, path).serializable((0, 0))
    alignment = align(ref, user, (ref.times[-1], user.times[-1]), automatic)
    assert alignment.reliable, alignment
    assert alignment.shift == shift
    assert abs(alignment.offset - delay) <= .030
    metrics, _, _, _ = evaluate(ref, user, alignment, (0, 0), False)
    metrics = {metric["name"]: metric["value"] for metric in metrics}
    assert metrics["transposedHitRate"] >= .83
    if shift:
        assert metrics["pitchHitRate"] < .15
        assert 83 <= metrics["meanAbsoluteCents"] <= 130


@pytest.mark.parametrize("other", ["silence", "noise"])
def test_low_confidence_suppresses_comparison(reference, tmp_path, other):
    audio = {
        "silence": np.zeros(RATE * 10),
        "noise": np.random.default_rng(31).standard_normal(RATE * 4) * .08,
    }[other]
    ref_path, ref = reference
    path = tmp_path / "other.wav"
    user = track(path, audio)
    automatic = detect_paths(ref_path, path).serializable((0, 0))
    alignment = align(ref, user, (ref.times[-1], user.times[-1]), automatic)
    assert not alignment.reliable
    metrics, _, _, _ = evaluate(ref, user, alignment, (0, 0), False)
    assert next(item for item in metrics if item["name"] == "meanAbsoluteCents")["value"] is None


def test_manual_offset_and_absolute_mapping(reference, tmp_path):
    user = track(tmp_path / "manual.wav", song(delay=1))
    _, ref = reference
    result = align(ref, user, (ref.times[-1], user.times[-1]), None, manual=1.0)
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
    _, ref = reference
    alignment = align(ref, user, (ref.times[-1], user.times[-1]), None, manual=.83)
    assert alignment.reliable
    assert alignment.method == "manual" and alignment.offset == .83
    assert len(alignment.reference_times) >= 2
    np.testing.assert_allclose(alignment.user_times - alignment.reference_times, .83)
    metrics, _, _, _ = evaluate(ref, user, alignment, (0, 0), False)
    assert next(item for item in metrics if item["name"] == "pitchHitRate")["value"] is None


def test_timing_with_missing_f0(reference, tmp_path):
    from dataclasses import replace

    ref_path, ref = reference
    path = tmp_path / "weak.wav"
    user = track(path, song(delay=1))
    limited = replace(user, midi=np.full_like(user.midi, np.nan))
    automatic = detect_paths(ref_path, path).serializable((0, 0))
    alignment = align(ref, limited, (ref.times[-1], user.times[-1]), automatic)
    assert alignment.method == "envelope" and alignment.reliable
    assert abs(alignment.offset - 1) <= .030
    assert len(alignment.reference_times) == 2
    metrics, _, _, _ = evaluate(ref, limited, alignment, (0, 0), False)
    assert next(item for item in metrics if item["name"] == "pitchHitRate")["value"] is None


def test_manual_adjustment_reuses_f0_and_recomputes_comparison(reference, tmp_path):
    from vocallab.report import realign

    _, ref = reference
    user = track(tmp_path / "manual.wav", song(delay=1))
    starts = (3.2, 1.7)
    cached = dict(preprocessing=dict(referenceStart=starts[0], userStart=starts[1],
                                     referenceDuration=ref.times[-1], userDuration=user.times[-1]),
                  pitchTracks=dict(reference=ref.serializable(starts[0]), user=user.serializable(starts[1])),
                  separation=dict(reference=dict(enabled=True), user=dict(enabled=True)),
                  alignment=dict(warnings=[]), warnings=[])
    # There are no role audio files in this workspace. Manual changes only require cached pitch data.
    wrong = realign(cached, tmp_path, 0, None, lambda stage: None)
    update = realign(wrong, tmp_path, 1, None, lambda stage: None)
    assert update["pitchTracks"] == cached["pitchTracks"]
    assert update["alignment"]["offsetSeconds"] == 1
    assert update["alignment"]["originalOffsetSeconds"] == -.5
    assert update["alignment"]["timeMapping"][0] == [0, 1]
    hit_rate = lambda report: next(m["value"] for m in report["metrics"] if m["name"] == "pitchHitRate")
    assert hit_rate(update) > max(.9, hit_rate(wrong))


def test_default_alignment_uses_opening_even_when_the_later_offset_is_different(tmp_path):
    from vocallab.pitch import Pitch
    from vocallab.report import realign

    duration = 67
    original = np.zeros(RATE * duration, dtype=np.float32)
    cover = np.zeros_like(original)

    def place(samples, audio, at):
        index = round(at * RATE)
        samples[index:index + len(audio)] = audio

    place(original, song(), .45)
    place(cover, song(semitones=3), .95)
    for time in (31, 39, 47, 55):
        place(original, song(), time)
        place(cover, song(semitones=3), time + 1.55)

    for role, audio in (("reference", original), ("user", cover)):
        directory = tmp_path / role
        directory.mkdir()
        sf.write(directory / "original.wav", audio, RATE)

    times = np.arange(0, duration, .02)
    missing = np.full(len(times), np.nan)
    pitch = Pitch(times, missing, missing, np.zeros(len(times), dtype=bool), np.zeros(len(times)),
                  np.zeros(len(times)), [], 1)
    report = dict(preprocessing=dict(referenceStart=8.0, userStart=4.0,
                                     referenceDuration=duration, userDuration=duration),
                  pitchTracks=dict(reference=pitch.serializable(8.0), user=pitch.serializable(4.0)),
                  alignment=dict(warnings=[]), warnings=[],
                  separation={role: {"enabled": False, "inputTrack": "original"} for role in ("reference", "user")})

    result = realign(report, tmp_path, None, None, lambda _: None)
    automatic = result["alignment"]["automatic"]
    assert automatic["referenceRange"] == (0.0, 30.0)
    assert automatic["openingWindow"] and automatic["reliable"]
    assert automatic["offsetSeconds"] == pytest.approx(.5, abs=.025)
    assert result["alignment"]["timeMapping"][-1][0] > 60
    assert (result["pitchScore"]["start"], result["pitchScore"]["end"]) == (8.0, 75.0)

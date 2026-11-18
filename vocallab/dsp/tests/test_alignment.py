from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from scipy.signal import resample_poly

from vocallab.alignment import detect, detect_paths, features

RATE = 24000
NOTES = np.array([55, 62, 59, 64, 62, 69, 55, 57, 67, 64, 55, 65, 61, 69])
LENGTHS = [.31, .58, .21, .35, .72, .40, .31, .61, .24, .57, .38, .49, .44, .34]
PAUSES = [.09, .28, .17, .04, .12, .51, .11, .09, .23, .34, .07, .32, .11, .19]


def voice(notes=NOTES, recording=False):
    rng = np.random.default_rng(12)
    chunks = [np.zeros(round(1.7 * RATE))]
    for i, (note, length, pause) in enumerate(zip(notes, LENGTHS, PAUSES)):
        t = np.arange(round(length * RATE)) / RATE
        phase = 2 * np.pi * (440 * 2 ** ((note - 69) / 12)) * t
        env = np.minimum(1, np.minimum(t, length - t) / .025) * (1 - .4 * t / length)
        clean = np.sin(phase) + .3 * np.sin(2 * phase)
        altered = .65 * np.sin(phase + .9) + .51 * np.sin(3 * phase) + .25 * np.sin(5 * phase)
        gain = (.60 + .35 * np.sin(i)) if recording else 1.
        chunks.extend((.3 * gain * env * (altered if recording else clean), np.zeros(round(pause * RATE))))
    chunks.append(np.zeros(RATE * 2))
    samples = np.concatenate(chunks)
    if recording:
        t = np.arange(len(samples)) / RATE
        samples += .007 * rng.normal(size=len(t)) + .008 * np.sin(2 * np.pi * 92 * t) * (.6 + .4 * np.cos(6 * t))
    return samples.astype(np.float32)


def shifted(samples, seconds):
    count = round(abs(seconds) * RATE)
    return np.pad(samples, (count, 0)) if seconds >= 0 else samples[count:]


@pytest.mark.parametrize("delay", [.2, .5, 1, -.5, -1.5])
def test_recovers_signed_offset(delay):
    reference = voice()
    result = detect(features(reference, RATE), features(shifted(reference, delay), RATE), 3)
    assert result.reliable, result
    assert result.offset == pytest.approx(delay, abs=.023)


@pytest.mark.parametrize("notes", [
    NOTES + 4,
    NOTES - 5,
    NOTES + np.array([0, 1, -3, 0, 2, 0, -2, 0, 1, 0, 0, 3, 0, 0]),
    NOTES + np.array([0, 7, 0, -8, 0, 0, 4, 0, 0, 0, -6, 0, 9, 0]),
], ids=["higher-key", "lower-key", "local-detuning", "wrong-notes"])
def test_timing_is_independent_of_pitch(notes):
    result = detect(features(voice(), RATE), features(shifted(voice(notes), .5), RATE), 3)
    assert result.reliable, result
    assert result.offset == pytest.approx(.5, abs=.030)


def test_recording_differences_sample_rates_and_nonzero_crops(tmp_path: Path):
    samples = voice()
    recording = shifted(voice(NOTES + 3, recording=True), .5)
    ref_start, user_start = .31, .45
    reference, user = tmp_path / "reference.wav", tmp_path / "user.wav"
    sf.write(reference, samples[round(ref_start * RATE):], RATE)
    sf.write(user, resample_poly(recording[round(user_start * RATE):], 2, 1), 2 * RATE)
    result = detect_paths(reference, user, clip_range=(.6, 7.6))
    assert result.reliable, result
    serialized = result.serializable((ref_start, user_start))
    assert serialized["offsetSeconds"] == pytest.approx(.36, abs=.030)
    assert serialized["originalOffsetSeconds"] == pytest.approx(.5, abs=.030)


def test_search_can_be_extended():
    reference = features(voice(), RATE)
    user = features(shifted(voice(), 4.2), RATE)
    result = detect(reference, user, 5)
    assert result.reliable
    assert result.offset == pytest.approx(4.2, abs=.030)


def test_repeating_rhythm_warns_about_other_peaks():
    t = np.arange(RATE) / RATE
    beat = np.sin(2 * np.pi * 220 * t) * (np.sin(np.pi * np.minimum(t, .4) / .4) ** 2)
    reference = features(np.tile(beat, 10), RATE)
    result = detect(reference, reference, 3)
    assert not result.reliable
    assert any("歧义" in warning for warning in result.warnings)


def test_limited_shared_voice_has_no_candidate():
    almost_silent = np.zeros(RATE * 20)
    almost_silent[:RATE // 20] = voice()[RATE * 2:RATE * 2 + RATE // 20]
    weak = features(almost_silent, RATE)
    result = detect(weak, weak, 3)
    assert result.offset is None
    assert not result.reliable

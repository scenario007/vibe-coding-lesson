import numpy as np

from vocallab.harmonic_pitch import track


def test_harmonic_track_recovers_missing_fundamental_and_respects_silence():
    rate = 22050
    time = np.arange(rate * 3) / rate
    audio = np.zeros_like(time, dtype=np.float32)
    first = (time >= .25) & (time < 1.15)
    last = (time >= 1.75) & (time < 2.75)
    for selection, hz, partials in (
        (first, 220, ((2, .4), (3, .24), (5, .14))),
        (last, 330, ((1, .18), (2, .38), (3, .18))),
    ):
        audio[selection] = sum(amplitude * np.sin(2 * np.pi * hz * order * time[selection])
                               for order, amplitude in partials)
    result = track(audio, rate)
    assert result.step == .02
    times = np.arange(result.midi.size) * result.step
    for start, end, hz in ((.35, 1.05, 220), (1.85, 2.65, 330)):
        expected = 69 + 12 * np.log2(hz / 440)
        actual = result.midi[(times >= start) & (times < end)]
        assert np.mean(np.abs(actual - expected) < .5) >= .98
    assert np.isnan(result.midi[(times > 1.25) & (times < 1.65)]).all()


def test_silence_has_no_pitch():
    result = track(np.zeros(22050, dtype=np.float32), 22050)
    assert all(value is None for value in result.serializable()["midiPitch"])


def test_tracks_low_note_under_dominant_second_and_third_harmonics():
    rate = 22050
    time = np.arange(rate * 2) / rate
    phase = 2 * np.pi * 261.626 * time
    second_dominates = (time > .35) & (time < .75)
    third_dominates = (time > .95) & (time < 1.35)
    voice = .055 * np.sin(phase)
    voice += (.12 + .58 * second_dominates) * np.sin(2 * phase)
    voice += (.09 + .62 * third_dominates) * np.sin(3 * phase)
    voice += .11 * np.sin(4 * phase) + .085 * np.sin(6 * phase)
    result = track(voice.astype(np.float32), rate)
    times = np.arange(result.midi.size) * result.step
    for start, end in ((.4, .7), (1.0, 1.3)):
        actual = result.midi[(times >= start) & (times < end)]
        assert np.mean(np.abs(actual - 60) <= .5) >= .90


def test_keeps_genuine_pitch_above_c5_after_lower_note():
    rate = 22050
    time = np.arange(rate * 2) / rate
    audio = np.zeros_like(time, dtype=np.float32)
    for start, end, pitch in ((.2, .85, 62), (.85, 1.8, 74)):
        selection = (time >= start) & (time < end)
        phase = 2 * np.pi * (440 * 2 ** ((pitch - 69) / 12)) * time[selection]
        audio[selection] = .52 * np.sin(phase) + .24 * np.sin(2 * phase) + .12 * np.sin(3 * phase)
    result = track(audio, rate)
    times = np.arange(result.midi.size) * result.step
    assert np.mean(np.abs(result.midi[(times >= 1) & (times < 1.7)] - 74) <= .5) >= .98


def test_bridges_only_short_energetic_gaps_between_nearby_pitches():
    from vocallab.harmonic_pitch import _bridge_short_gaps

    curve = np.array([60, np.nan, np.nan, 60.6, np.nan, 61, np.nan, 67] +
                     [np.nan] * 5 + [67.5])
    rms = np.ones(len(curve))
    rms[4] = .01
    assert _bridge_short_gaps(curve, rms, .1) == [1, 2]
    np.testing.assert_allclose(curve[1:3], [60.2, 60.4])
    assert np.isnan(curve[[4, 6, 8, 9, 10, 11, 12]]).all()


def test_higher_partials_resolve_double_frequency_when_fundamental_is_weak():
    rate = 22050
    t = np.arange(rate * 2) / rate
    phase = 2 * np.pi * 261.626 * t
    emphasis = (t >= .55) & (t < 1.45)
    sound = .035 * np.sin(phase) + .20 * np.sin(2 * phase) + .08 * np.sin(4 * phase)
    sound += .08 * np.sin(8 * phase) + (.12 + .55 * emphasis) * np.sin(9 * phase)
    sound += .13 * np.sin(11 * phase) + .14 * np.sin(13 * phase)
    values = track(sound.astype(np.float32), rate).midi[35:65]
    assert np.mean(np.abs(values - 60) < .5) >= .98


def test_nearby_low_partial_residue_cannot_pull_a_high_note_down_an_octave():
    rate = 22050
    time = np.arange(rate * 2) / rate
    lower = (time >= .13) & (time < .65)
    higher = time >= .65
    high_hz = 440 * 2 ** (1 / 12)
    audio = np.zeros_like(time)

    def add_harmonics(active, hz, weights):
        phase = 2 * np.pi * hz * time[active] + .6
        audio[active] += .23 * sum(weight * np.sin(order * phase) for order, weight in enumerate(weights, 1))

    add_harmonics(lower, high_hz / 2, [.55, .28, .18, .08])
    add_harmonics(higher, high_hz, [.34, .34, .33, .38, 1, .5])
    add_harmonics(higher, high_hz / 2 + 4, [.20, 0, .184, 0, .174, 0, .18, 0, .124])

    result = track(audio.astype(np.float32), rate)
    frames = np.arange(result.midi.size) * result.step
    assert np.mean(np.abs(result.midi[(frames >= .20) & (frames < .55)] - 58) <= .5) >= .98
    assert np.mean(np.abs(result.midi[(frames >= .86) & (frames < 1.78)] - 70) <= .5) >= .98


def test_short_legitimate_octave_jump_keeps_the_high_note():
    rate = 22050
    time = np.arange(rate * 2) / rate
    audio = np.zeros_like(time, dtype=np.float32)
    for start, end, pitch in ((.25, .8, 58), (.8, 1.06, 70), (1.06, 1.75, 58)):
        active = (time >= start) & (time < end)
        phase = 2 * np.pi * (440 * 2 ** ((pitch - 69) / 12)) * time[active]
        audio[active] = .41 * np.sin(phase) + .22 * np.sin(phase * 2) + .17 * np.sin(phase * 3)
    result = track(audio, rate)
    frames = np.arange(result.midi.size) * result.step
    assert np.mean(np.abs(result.midi[(frames >= .86) & (frames <= 1.00)] - 70) <= .5) >= .98

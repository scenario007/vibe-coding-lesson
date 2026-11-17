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

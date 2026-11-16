import json
import os
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest
import soundfile as sf

from vocallab.pitch import extract
from vocallab.report import analyze
from vocallab.separation import SeparationError, VocalSeparator, WEIGHT


def test_missing_model_error(tmp_path):
    source = tmp_path / "source.wav"
    sf.write(source, np.zeros(22050), 22050)
    worker = VocalSeparator(tmp_path / "models", tmp_path / "cache")
    with patch.object(worker, "prepare", side_effect=OSError("model unavailable")):
        with pytest.raises(SeparationError, match="改用干净人声"):
            worker.separate(source, tmp_path, 0, 1, "test")


def test_clean_voice_skips_separation(tmp_path):
    for role in ("reference", "user"):
        directory = tmp_path / role
        directory.mkdir()
        sf.write(directory / "context.wav", np.zeros(44100), 22050)
    clip = dict(trim=0, duration=2, start=0, separate=False, identity="fixture")
    invalid_models = tmp_path / "not-a-model-directory"
    invalid_models.write_text("unusable path")
    manifest = dict(workspace=str(tmp_path), models=str(invalid_models), cache=str(tmp_path / "cache"),
                    clips=dict(reference=clip, user=clip), analysisId="fixture",
                    referenceMetadata={}, userMetadata={}, manualOffset=None)
    with patch.object(VocalSeparator, "prepare", side_effect=AssertionError("should skip")):
        result = analyze(manifest, lambda _: None)
    assert result["separation"]["reference"]["status"] == "skipped"
    assert (tmp_path / "reference" / "original.wav").exists()
    assert not (tmp_path / "reference" / "vocals.wav").exists()


def pitch_comparison(clean, test):
    assert len(clean.hz) == len(test.hz)
    valid = np.isfinite(clean.hz)
    found = valid & np.isfinite(test.hz)
    assert np.count_nonzero(valid) >= 12, "Select an excerpt with at least 12 detected vocal frames."
    delta = np.abs((test.midi[found] - clean.midi[found]) * 100)
    count = np.count_nonzero(valid)
    return dict(cleanVoicedFrames=int(count), matchedFrames=int(len(delta)),
                meanAbsoluteCents=round(float(np.mean(delta)), 2) if len(delta) else None,
                hit50=round(float(np.mean(delta <= 50)), 4) if len(delta) else None,
                hit50AllClean=round(float(np.sum(delta <= 50) / count), 4),
                detectedOnCleanFrames=round(float(np.sum(found) / count), 4),
                octaveErrors=int(np.count_nonzero((delta >= 1150) & (delta <= 1250))),
                activeFrames=int(np.count_nonzero(np.isfinite(test.hz))))


@pytest.mark.integration
def test_model_with_two_accompaniment_strengths(tmp_path):
    if not os.getenv("VOCALLAB_MODEL_TEST"):
        pytest.skip("Set VOCALLAB_MODEL_TEST=1 after preparing the model and test stems.")
    fixtures = Path(os.environ["VOCALLAB_FIXTURES"]).absolute()
    models = Path(os.environ["VOCALLAB_MODELS"]).absolute()
    assert (models / WEIGHT).is_file()
    clean_path = fixtures / "clean.wav"
    vocals, rate = sf.read(clean_path, always_2d=True)
    backing, backing_rate = sf.read(fixtures / "backing.wav", always_2d=True)
    assert rate == backing_rate
    length = min(len(vocals), len(backing))
    vocals, backing = vocals[:length], backing[:length]
    input_clean = tmp_path / "clean.wav"
    sf.write(input_clean, vocals, rate)
    clean = extract(input_clean)
    worker = VocalSeparator(models, tmp_path / "cache")
    results = {}
    for db in (-5, 5):
        mix = vocals + backing * (np.sqrt(np.mean(vocals ** 2) / np.mean(backing ** 2)) * 10 ** (db / 20))
        mix *= min(1, .95 / np.max(np.abs(mix)))
        source = tmp_path / f"mix{db}.wav"
        sf.write(source, mix, rate)
        output = tmp_path / f"out{db}"
        output.mkdir()
        result = worker.separate(source, output, 0, length / rate, f"mix-{db}")
        assert result["device"] in {"cpu", "mps", "cuda:0", "cuda"}
        assert all(sf.info(output / f"{name}.wav").frames == length for name in ["vocals", "instrumental"])
        results[str(db)] = {"device": result["device"], "mix": pitch_comparison(clean, extract(source)),
                            "separated": pitch_comparison(clean, extract(output / "vocals.wav"))}
        with patch.object(worker, "_infer", side_effect=AssertionError("cache should avoid inference")):
            assert worker.separate(source, output, 0, length / rate, f"mix-{db}")["cached"]
    print(json.dumps(results, ensure_ascii=False, indent=2))

import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from time import perf_counter

from .alignment import align, detect_paths
from .harmonic_pitch import HarmonicPitch, extract as extract_harmonic_pitch
from .metrics import evaluate
from .pitch_grading import grade
from .pitch import Pitch
from .preprocessing import sample_rate

ROLES = ("reference", "user")


def analyze(manifest, progress):
    from .audio_io import crop_audio
    from .pitch import extract
    from .separation import VocalSeparator

    workspace = Path(manifest["workspace"])
    separator = VocalSeparator(Path(manifest["models"]), Path(manifest["cache"]))
    settings = manifest["clips"]
    separation = {}
    pitch = {}
    harmonic = {}
    for role in ROLES:
        clip = settings[role]
        folder = workspace / role
        context = folder / "context.wav"
        crop_audio(context, folder / "original.wav", clip["trim"], clip["duration"])
        if clip["separate"]:
            progress(f"separation_{role}")
            separation[role] = separator.separate(context, folder, clip["trim"], clip["duration"], clip["identity"],
                                                   mode=clip.get("separationMode") or "precise")
        else:
            separation[role] = dict(enabled=False, model=None, modelVersion=None, status="skipped",
                                     outputTracks=["original"], inputTrack="original", warnings=[],
                                     weightSha256=None, device=None, cached=False, parameters=None)
        context.unlink()
        path = folder / (separation[role]["inputTrack"] + ".wav")
        harmonic[role] = extract_harmonic_pitch(path)
        save_preview(folder, harmonic[role])

    for role in ROLES:
        progress(f"pitch_{role}")
        path = workspace / role / (separation[role]["inputTrack"] + ".wav")
        pitch[role] = extract(path)

    report = dict(analysisId=manifest["analysisId"], status="completed", referenceMetadata=manifest["referenceMetadata"],
                  userMetadata=manifest["userMetadata"], preprocessing=dict(sampleRate=sample_rate(), method="pYIN",
                  referenceStart=settings["reference"]["start"], userStart=settings["user"]["start"],
                  referenceDuration=settings["reference"]["duration"], userDuration=settings["user"]["duration"]),
                  separation=separation, pitchTracks={role: pitch[role].serializable(settings[role]["start"]) for role in ROLES})
    warnings = [f"{'原唱' if role == 'reference' else '我的演唱'} · {warning}"
                for role in ROLES for warning in pitch[role].warnings + separation[role]["warnings"]]
    return update_comparison(report, workspace, pitch, warnings, manifest.get("manualOffset"), None, None, progress, harmonic)


def realign(report, workspace, manual, reference_range, progress):
    alignment_warnings = report["alignment"]["warnings"]
    warnings = [warning for warning in report["warnings"] if warning not in alignment_warnings]
    pitch = {role: Pitch.from_report(report["pitchTracks"][role],
             [warning for warning in warnings if warning.startswith("原唱 ·" if role == "reference" else "我的演唱 ·")])
             for role in ROLES}
    automatic = report["alignment"].get("automatic") if manual is not None else None
    return update_comparison(report, workspace, pitch, warnings, manual, reference_range, automatic, progress)


def update_comparison(report, workspace, pitch, warnings, manual, reference_range, automatic, progress, harmonic=None):
    preprocessing = report["preprocessing"]
    separation = report["separation"]
    starts = tuple(preprocessing[role + "Start"] for role in ROLES)
    durations = tuple(preprocessing[role + "Duration"] for role in ROLES)
    progress("alignment")
    if automatic is None and manual is None:
        paths = [workspace / role / (separation[role]["inputTrack"] + ".wav") for role in ROLES]
        automatic = detect_paths(*paths, clip_range=reference_range).serializable(starts, reference_range)
        print(f"ALIGNMENT features={automatic['featureMilliseconds']:.2f} ms "
              f"correlation={automatic['correlationMilliseconds']:.2f} ms "
              f"total={automatic['elapsedMilliseconds']:.2f} ms", flush=True)
    alignment = align(pitch["reference"], pitch["user"], durations, automatic, manual)
    progress("metrics")
    metrics, segments, phrases, confidence = evaluate(
        pitch["reference"], pitch["user"], alignment, starts, any(item["enabled"] for item in separation.values()))
    progress("report")
    updated = dict(report, alignment=alignment.serializable(starts), metrics=metrics, segments=segments, phrases=phrases,
                   warnings=warnings + alignment.warnings, confidence=round(confidence, 3))
    return score_report(updated, workspace, harmonic)


def save_preview(folder, harmonic):
    temporary = None
    try:
        with NamedTemporaryFile(mode="w", dir=folder, prefix="pitch-preview-", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(harmonic.serializable(), handle, allow_nan=False, separators=(",", ":"))
        temporary.replace(folder / "pitch-preview.json")
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def score_report(report, workspace, harmonic=None):
    started = perf_counter()
    if harmonic is None:
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
            harmonic[role] = extract_harmonic_pitch(path)
            save_preview(folder, harmonic[role])
    evidence_ms = (perf_counter() - started) * 1000
    score = grade(harmonic["reference"], harmonic["user"], report["preprocessing"], report["alignment"])
    score["evidenceMilliseconds"] = round(evidence_ms, 2)
    print(f"PITCH SCORE evidence={evidence_ms:.2f} ms grading={score['elapsedMilliseconds']:.2f} ms", flush=True)
    return dict(report, pitchScore=score)

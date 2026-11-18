import json
from pathlib import Path

from .alignment import align, detect_paths
from .metrics import evaluate
from .pitch import Pitch
from .preprocessing import sample_rate

ROLES = ("reference", "user")


def analyze(manifest, progress):
    from .audio_io import crop_audio
    from .harmonic_pitch import extract as extract_harmonic_pitch
    from .pitch import extract
    from .separation import VocalSeparator

    workspace = Path(manifest["workspace"])
    separator = VocalSeparator(Path(manifest["models"]), Path(manifest["cache"]))
    settings = manifest["clips"]
    separation = {}
    pitch = {}
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
        preview = extract_harmonic_pitch(path).serializable()
        temporary = folder / "pitch-preview.tmp"
        temporary.write_text(json.dumps(preview, allow_nan=False))
        temporary.replace(folder / "pitch-preview.json")

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
    return update_comparison(report, workspace, pitch, warnings, manifest.get("manualOffset"), None, None, progress)


def realign(report, workspace, manual, reference_range, progress):
    alignment_warnings = report["alignment"]["warnings"]
    warnings = [warning for warning in report["warnings"] if warning not in alignment_warnings]
    pitch = {role: Pitch.from_report(report["pitchTracks"][role],
             [warning for warning in warnings if warning.startswith("原唱 ·" if role == "reference" else "我的演唱 ·")])
             for role in ROLES}
    automatic = report["alignment"].get("automatic") if manual is not None else None
    return update_comparison(report, workspace, pitch, warnings, manual, reference_range, automatic, progress)


def update_comparison(report, workspace, pitch, warnings, manual, reference_range, automatic, progress):
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
    return dict(report, alignment=alignment.serializable(starts), metrics=metrics, segments=segments, phrases=phrases,
                warnings=warnings + alignment.warnings, confidence=round(confidence, 3))

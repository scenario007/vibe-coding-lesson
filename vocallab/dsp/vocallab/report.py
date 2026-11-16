from pathlib import Path

from .alignment import align
from .audio_io import crop_audio
from .metrics import evaluate
from .pitch import extract
from .preprocessing import sample_rate
from .separation import VocalSeparator

ROLES = ("reference", "user")


def analyze(manifest, progress):
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

    for role in ROLES:
        progress(f"pitch_{role}")
        path = workspace / role / (separation[role]["inputTrack"] + ".wav")
        pitch[role] = extract(path)

    progress("alignment")
    alignment = align(pitch["reference"], pitch["user"], manifest.get("manualOffset"))
    progress("metrics")
    starts = tuple(settings[role]["start"] for role in ROLES)
    metrics, segments, phrases, confidence = evaluate(
        pitch["reference"], pitch["user"], alignment, starts, any(item["enabled"] for item in separation.values()))
    warnings = [f"{'原唱' if role == 'reference' else '我的演唱'} · {warning}"
                for role in ROLES for warning in pitch[role].warnings + separation[role]["warnings"]]
    progress("report")
    return dict(analysisId=manifest["analysisId"], status="completed", referenceMetadata=manifest["referenceMetadata"],
                userMetadata=manifest["userMetadata"], preprocessing=dict(sampleRate=sample_rate(), method="pYIN",
                referenceStart=starts[0], userStart=starts[1], referenceDuration=settings["reference"]["duration"],
                userDuration=settings["user"]["duration"]), separation=separation,
                alignment=alignment.serializable(), pitchTracks={role: pitch[role].serializable(starts[i])
                for i, role in enumerate(ROLES)}, metrics=metrics, segments=segments,
                phrases=phrases, warnings=warnings + alignment.warnings, confidence=round(confidence, 3))

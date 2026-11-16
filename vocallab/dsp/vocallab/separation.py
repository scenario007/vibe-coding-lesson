import gc
import hashlib
import json
import logging
import os
import shutil
from importlib.metadata import version
from pathlib import Path
from tempfile import TemporaryDirectory

from .audio_io import crop_audio

MODEL = "BS-RoFormer Viperx 1297"
WEIGHT = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
SHA256 = "5b84f37e8d444c8cb30c79d77f613a41c05868ff9c9ac6c7049c00aefae115aa"
PARAMS = {"segment_size": 256, "override_model_segment_size": True, "overlap": 2, "batch_size": 1, "pitch_shift": 0}
CONFIG_SHA256 = "2bfdd16c656bd9519aba757cc4f8834b7ede675eb1e00ec4772d74ae1c41af7f"

FAST_MODEL = "MDX-Net Kim Vocal 2"
FAST_WEIGHT = "Kim_Vocal_2.onnx"
FAST_SHA256 = "ce74ef3b6a6024ce44211a07be9cf8bc6d87728cc852a68ab34eb8e58cde9c8b"
FAST_PARAMS = {"hop_length": 1024, "segment_size": 256, "overlap": 0.25, "batch_size": 1, "enable_denoise": False}


class SeparationError(RuntimeError):
    pass


class VocalSeparator:
    def __init__(self, models: Path, cache: Path):
        self.models = models.absolute()
        self.cache = cache.absolute()
        self.separator = None
        self.device = None
        self.mode = None

    def _load(self, mode: str, force_cpu: bool = False):
        import torch
        from audio_separator.separator import Separator

        torch.set_num_threads(min(6, os.cpu_count() or 1))
        separator = Separator(log_level=logging.WARNING, model_file_dir=str(self.models),
                              output_format="WAV", sample_rate=44100, mdxc_params=PARAMS, mdx_params=FAST_PARAMS,
                              normalization_threshold=0.99, amplification_threshold=0,
                              invert_using_spec=False)
        if force_cpu:
            separator.torch_device = torch.device("cpu")
            separator.torch_device_mps = None
            separator.onnx_execution_provider = ["CPUExecutionProvider"]
        separator.load_model(FAST_WEIGHT if mode == "fast" else WEIGHT)
        self.separator = separator
        self.mode = mode
        if mode == "fast" and not isinstance(separator.model_instance.model_run, torch.nn.Module):
            providers = separator.onnx_execution_provider or []
            self.device = "Core ML / CPU" if "CoreMLExecutionProvider" in providers else str(separator.torch_device)
        else:
            self.device = str(separator.torch_device)

    def _infer(self, audio: Path, temp: Path):
        self.separator.model_instance.output_dir = str(temp)
        names = self.separator.separate(str(audio), custom_output_names={
            "Vocals": "vocals", "Instrumental": "instrumental", "No Vocals": "instrumental",
        })
        tracks = {Path(name).stem.lower(): temp / Path(name).name for name in names}
        if set(tracks) != {"vocals", "instrumental"} or not all(path.is_file() for path in tracks.values()):
            raise SeparationError(f"分离模型没有输出完整的两条音轨（{', '.join(tracks)}）。")
        return tracks

    def prepare(self, mode: str = "precise") -> dict:
        """Download only the checkpoint and config registered by audio-separator."""
        from audio_separator.separator import Separator

        self.models.mkdir(parents=True, exist_ok=True)
        separator = Separator(log_level=logging.WARNING, model_file_dir=str(self.models))
        fast = mode == "fast"
        model_name, weight, digest = (FAST_MODEL, FAST_WEIGHT, FAST_SHA256) if fast else (MODEL, WEIGHT, SHA256)
        files = separator.download_model_files(weight)
        checks = [(weight, digest)]
        if not fast:
            checks.append((WEIGHT.replace(".ckpt", ".yaml"), CONFIG_SHA256))
        for name, expected in checks:
            with (self.models / name).open("rb") as fh:
                if hashlib.file_digest(fh, "sha256").hexdigest() != expected:
                    raise SeparationError(f"模型文件校验失败：{name}")
        return {"model": model_name, "modelVersion": weight, "sha256": digest,
                "bytes": (self.models / weight).stat().st_size, "config": files[-1],
                "device": str(separator.torch_device), "parameters": FAST_PARAMS if fast else PARAMS}

    def separate(self, source: Path, output: Path, trim: float, duration: float, identity: str,
                 mode: str = "precise") -> dict:
        fast = mode == "fast"
        model_name, weight, digest = (FAST_MODEL, FAST_WEIGHT, FAST_SHA256) if fast else (MODEL, WEIGHT, SHA256)
        profile = FAST_PARAMS if fast else PARAMS
        policy = os.getenv("VOCALLAB_DEVICE", "auto")
        config = dict(weight=digest, config=None if fast else CONFIG_SHA256, identity=identity, trim=trim,
                      duration=duration, rate=44100, params=profile, devicePolicy=policy,
                      library=version("audio-separator"), torch=version("torch"), pipeline=1)
        def cache_entry(params):
            payload = json.dumps({**config, "params": params}, sort_keys=True).encode()
            return self.cache / hashlib.sha256(payload).hexdigest()

        self.cache.mkdir(parents=True, exist_ok=True)
        cache_files = ("metadata.json", "vocals.wav", "instrumental.wav")
        def complete(path):
            return all((path / name).is_file() for name in cache_files)

        legacy = {**PARAMS, "overlap": 4}
        entry, params = cache_entry(profile), profile
        legacy_entry = cache_entry(legacy)
        if not fast and not complete(entry) and complete(legacy_entry):
            entry, params = legacy_entry, legacy
        if complete(entry):
            metadata = json.loads((entry / "metadata.json").read_text())
            os.utime(entry, None)
            cached = True
        else:
            if entry.is_dir():
                shutil.rmtree(entry)
            with TemporaryDirectory(dir=self.cache, prefix="inference-") as temporary:
                temp = Path(temporary)
                try:
                    # Verify a newly downloaded or externally provisioned checkpoint before loading it.
                    if self.mode != mode:
                        self.separator = None
                        self.prepare(mode)
                    import torch
                    can_try_mps = policy != "cpu" and torch.backends.mps.is_available()
                    try:
                        if self.separator is None:
                            self._load(mode, force_cpu=policy == "cpu")
                        paths = self._infer(source, temp)
                    except (RuntimeError, NotImplementedError):
                        if not can_try_mps or self.device == "cpu":
                            raise
                        self.separator = None
                        gc.collect()
                        torch.mps.empty_cache()
                        self._load(mode, force_cpu=True)
                        paths = self._infer(source, temp)
                    staged = temp / "stems"
                    staged.mkdir()
                    for name, path in paths.items():
                        crop_audio(path, staged / f"{name}.wav", trim, duration)
                    metadata = {"device": self.device, "cacheKey": entry.name}
                    (staged / "metadata.json").write_text(json.dumps(metadata))
                    staged.replace(entry)
                except Exception as error:
                    raise SeparationError("人声分离失败。请检查模型、可用内存及本地日志，或改用干净人声。") from error
            cached = False
        for name in ("vocals", "instrumental"):
            shutil.copyfile(entry / f"{name}.wav", output / f"{name}.wav")
        return dict(enabled=True, model=model_name, modelVersion=weight, status="completed",
                    outputTracks=["original", "vocals", "instrumental"], inputTrack="vocals",
                    warnings=["模型估计的人声可能含伴奏、和声或分离伪影。"],
                    weightSha256=digest, device=metadata["device"], cached=cached,
                    parameters=None if fast else params)

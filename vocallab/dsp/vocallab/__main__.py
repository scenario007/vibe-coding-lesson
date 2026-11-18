import argparse
import json
import traceback
from pathlib import Path

from .report import analyze, realign


def main():
    parser = argparse.ArgumentParser(description="VocalLab local analysis worker")
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("analyze")
    run.add_argument("manifest", type=Path)
    run.add_argument("result", type=Path)
    adjust = commands.add_parser("realign")
    adjust.add_argument("report", type=Path)
    adjust.add_argument("result", type=Path)
    adjust.add_argument("--manual", type=float)
    adjust.add_argument("--reference-range", nargs=2, type=float)
    setup = commands.add_parser("prepare-model")
    setup.add_argument("models", type=Path)
    setup.add_argument("--mode", choices=("fast", "precise"), default="precise")
    options = parser.parse_args()
    if options.command == "prepare-model":
        from .separation import VocalSeparator

        print(json.dumps(VocalSeparator(options.models, options.models).prepare(options.mode), ensure_ascii=False))
        return
    try:
        def progress(stage):
            print(f"STAGE {stage}", flush=True)

        if options.command == "realign":
            result = realign(json.loads(options.report.read_text()), options.report.parent,
                             options.manual, options.reference_range, progress)
        else:
            result = analyze(json.loads(options.manifest.read_text()), progress)
        temporary = options.result.with_suffix(".tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False))
        temporary.replace(options.result)
    except Exception as error:
        traceback.print_exc()
        message = "声学分析未完成，请检查本地日志。"
        if options.command == "analyze":
            from .separation import SeparationError

            if isinstance(error, SeparationError):
                message = str(error)
        print(f"ERROR {message}", flush=True)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()

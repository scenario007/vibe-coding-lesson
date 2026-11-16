import argparse
import json
import traceback
from pathlib import Path

from .report import analyze
from .separation import SeparationError, VocalSeparator


def main():
    parser = argparse.ArgumentParser(description="VocalLab local analysis worker")
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("analyze")
    run.add_argument("manifest", type=Path)
    run.add_argument("result", type=Path)
    setup = commands.add_parser("prepare-model")
    setup.add_argument("models", type=Path)
    options = parser.parse_args()
    if options.command == "prepare-model":
        print(json.dumps(VocalSeparator(options.models, options.models).prepare(), ensure_ascii=False))
        return
    try:
        result = analyze(json.loads(options.manifest.read_text()), lambda stage: print(f"STAGE {stage}", flush=True))
        temporary = options.result.with_suffix(".tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False))
        temporary.replace(options.result)
    except Exception as error:
        traceback.print_exc()
        message = str(error) if isinstance(error, SeparationError) else "声学分析未完成，请检查本地日志。"
        print(f"ERROR {message}", flush=True)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()

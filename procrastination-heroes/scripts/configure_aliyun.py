#!/usr/bin/env python3
"""Save a rotated Aliyun image key locally without printing it or committing it."""
from getpass import getpass
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / ".env.local"


def main():
    print("请先在阿里云百炼控制台禁用聊天中暴露的旧 Key，并生成新 Key。")
    key = getpass("粘贴新的阿里云百炼 API Key（输入不会显示）：").strip()
    if not key or any(char.isspace() for char in key):
        print("没有保存：Key 为空或包含空白字符。")
        return
    lines = CONFIG.read_text().splitlines() if CONFIG.exists() else []
    names = {"ALIYUN_DASHSCOPE_API_KEY", "ALIYUN_IMAGE_GENERATION_ENABLED"}
    kept = [line for line in lines if line.split("=", 1)[0].strip() not in names]
    kept.extend([f"ALIYUN_DASHSCOPE_API_KEY={key}", "ALIYUN_IMAGE_GENERATION_ENABLED=true"])
    CONFIG.write_text("\n".join(kept) + "\n")
    os.chmod(CONFIG, 0o600)
    print("已安全写入本机 .env.local。请停止并重新启动项目后使用。")


if __name__ == "__main__":
    main()

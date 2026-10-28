#!/usr/bin/env python3
"""Save a rotated Aliyun image key locally without printing it or committing it."""
from getpass import getpass
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / ".env.local"


def main():
    print("请先在阿里云百炼控制台禁用聊天中暴露的旧 Key，并生成新 Key。")
    print("请在百炼 API Key 管理页面选择华北2（北京），使用普通模型 API Key。")
    key = getpass("粘贴新的阿里云百炼 API Key（输入不会显示）：").strip()
    if not key.startswith("sk-") or any(char.isspace() for char in key) or any(mark in key for mark in ("*", "…", "•••")):
        print("没有保存：请粘贴创建时显示的完整百炼 API Key，不要使用带星号的脱敏内容。")
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

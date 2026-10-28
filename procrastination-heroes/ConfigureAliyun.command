#!/bin/zsh
cd -- "$(dirname "$0")"
python3 scripts/configure_aliyun.py
echo ""
echo "按回车键关闭窗口。"
read

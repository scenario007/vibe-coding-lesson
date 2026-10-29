#!/usr/bin/env python3
"""Exercise the Aliyun image adapter with a local fake service; no real API calls or fees."""
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9n8AAAAASUVORK5CYII="
)
requests = []


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        requests.append((self.path, body))
        url = f"http://127.0.0.1:{self.server.server_port}/result.png"
        result = {"output": {"choices": [{"message": {"content": [{"type": "text", "text": "完成"}, {"type": "image", "image": url}]}}]}}
        encoded = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(PNG)))
        self.end_headers()
        self.wfile.write(PNG)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="heroes-image-test-") as directory:
            env = dict(os.environ)
            env.update(
                ALIYUN_DASHSCOPE_API_KEY="local-mock-key",
                ALIYUN_DASHSCOPE_BASE_URL=f"http://127.0.0.1:{server.server_port}/api/v1",
                ALIYUN_IMAGE_ASSET_DIR=directory,
                ALIYUN_IMAGE_MODEL="wan2.7-image",
                ALIYUN_IMAGE_SIZE="1K",
                ALIYUN_IMAGE_GENERATION_ENABLED="true",
                ALIYUN_IMAGE_GENERATION_REQUIRED="true",
                HTTPS_PROXY="",
                https_proxy="",
            )
            subprocess.run(
                ["sbt", "-batch", "Test / runMain services.ai.AliyunImageClientChecks"],
                cwd=ROOT / "backend",
                env=env,
                check=True,
            )
            assert len(requests) == 1
            for path, body in requests:
                assert path == "/api/v1/services/aigc/multimodal-generation/generation"
                assert body["model"] == "wan2.7-image"
                assert body["parameters"] == {"size": "1K", "n": 1, "watermark": False}
                prompt = body["input"]["messages"][0]["content"][0]["text"]
                assert "公会手账" in prompt and "1:1" in prompt and "禁止任何文字" in prompt
            assert "稿纸剑" in requests[0][1]["input"]["messages"][0]["content"][0]["text"]
            assert (Path(directory) / "reward/mock-reward.original.png").read_bytes() == PNG
            print("PASS: model, size, prompts and local persistence verified without external calls")
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    main()

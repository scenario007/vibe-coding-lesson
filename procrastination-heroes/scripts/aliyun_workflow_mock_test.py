#!/usr/bin/env python3
"""Exercise reward generation against local fake model services."""
import base64
import json
import os
from pathlib import Path
import signal
import socket
import struct
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request
import uuid
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9n8AAAAASUVORK5CYII=")


def square_png():
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    pixels = b"".join(b"\0" + b"".join(bytes((50, 80, 180, 255)) if 10 <= x < 30 and 10 <= y < 30 else bytes((255, 255, 255, 255)) for x in range(40)) for y in range(40))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 40, 40, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")


SQUARE_PNG = square_png()
image_requests = []
text_requests = []
plan = {
    "title": "完成论文初稿",
    "category": "study",
    "summary": "先写出一个可以继续修改的初稿。",
    "stages": [{"title": "写下开头", "description": "写出第一段", "checklist": ["打开文档"], "minutes": 10, "criterion": "完成第一段", "dependsOn": []}],
    "reward": {"name": "稿纸剑", "story": "一把由初稿折成的剑。", "symbol": "sword", "palette": "gold"},
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def reply(self, value):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/v1/chat/completions":
            text_requests.append(body)
            content = body["messages"][1]["content"]
            result = ({ } if "文本失败测试" in content else {"visualDescription": "完整保留用户指定的钻石材质和物件形状，手绘清晰轮廓。"}) if "visualDescription" in body["messages"][0]["content"] else plan
            self.reply({"choices": [{"finish_reason": "stop", "message": {"content": json.dumps(result, ensure_ascii=False)}}], "usage": {"prompt_tokens": 100, "completion_tokens": 100}})
        elif self.path == "/api/v1/services/aigc/multimodal-generation/generation":
            image_requests.append(body)
            prompt = body["input"]["messages"][0]["content"][0]["text"]
            if "失败测试" in prompt or "认证测试" in prompt:
                data = b'{"message":"mock failure"}'
                self.send_response(401 if "认证测试" in prompt else 503)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            path = "square.png" if "透明测试" in prompt else "result.png"
            url = f"http://127.0.0.1:{self.server.server_port}/{path}"
            self.reply({"output": {"choices": [{"message": {"content": [{"type": "image", "image": url}]}}]}})
        else:
            self.send_error(404)

    def do_GET(self):
        image = SQUARE_PNG if self.path == "/square.png" else PNG
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(image)))
        self.end_headers()
        self.wfile.write(image)


def available_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def call(port, name, body=None, token=None):
    payload = dict(body or {})
    if token:
        payload["userToken"] = token
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/{name.lower()}",
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def wait_job(port, token, job_id):
    for _ in range(90):
        job = call(port, "GetGenerationJobAPI", {"jobId": job_id}, token)
        if job["status"] == "succeeded":
            return job
        if job["status"] == "failed":
            raise AssertionError(job.get("error"))
        time.sleep(0.5)
    raise AssertionError("AI job timed out")


def main():
    db = "heroes_image_test_" + uuid.uuid4().hex[:10]
    port = available_port()
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    process = None
    try:
        subprocess.run(["createdb", "-h", "127.0.0.1", "-p", "54329", "-U", "heroes", db], check=True)
        with tempfile.TemporaryDirectory(prefix="heroes-image-workflow-") as directory:
            root = Path(directory)
            manifest = root / "manifest.json"
            manifest.write_text('{"assets": []}')
            env = dict(os.environ)
            env.update(
                HTTP_PORT=str(port), DB_HOST="127.0.0.1", DB_PORT="54329", DB_USER="heroes", DB_NAME=db,
                TOKENHUB_API_KEY="local-mock-key", TOKENHUB_BASE_URL=f"http://127.0.0.1:{server.server_port}/v1",
                TOKENHUB_MODEL="deepseek-v4.1-flash", TOKENHUB_ART_MANIFEST=str(manifest),
                ALIYUN_DASHSCOPE_API_KEY="local-mock-key", ALIYUN_DASHSCOPE_BASE_URL=f"http://127.0.0.1:{server.server_port}/api/v1",
                ALIYUN_IMAGE_ASSET_DIR=str(root / "generated"), ALIYUN_IMAGE_MODEL="wan2.7-image", ALIYUN_IMAGE_SIZE="1K",
                ALIYUN_IMAGE_GENERATION_ENABLED="true", ALIYUN_IMAGE_GENERATION_REQUIRED="false", HTTPS_PROXY="", https_proxy="",
            )
            with (root / "backend.log").open("w+") as log:
                process = subprocess.Popen(["sbt", "-batch", "run"], cwd=ROOT / "backend", env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
                for _ in range(120):
                    if process.poll() is not None:
                        log.seek(0)
                        raise AssertionError("Test backend exited: " + log.read()[-4000:])
                    try:
                        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1):
                            break
                    except OSError:
                        time.sleep(0.5)
                else:
                    raise AssertionError("Test backend did not start")

                auth = call(port, "RegisterUserAPI", {"username": "image_" + uuid.uuid4().hex[:8], "password": "LocalTest2026!", "nickname": "素材测试勇者"})
                token = auth["token"]
                request = {"goal": "完成论文初稿", "dueDate": None, "dailyMinutes": None, "preference": "公会手账", "feedback": "任务等级：challenge", "requestKey": str(uuid.uuid4()), "generateRewardImage": True}
                job = wait_job(port, token, call(port, "RequestPlanGenerationAPI", request, token)["id"])
                reward = job["result"]["reward"]
                assert reward["imageUrl"] == f"/generated/reward/{job['id']}.original.png"
                assert (root / "generated/reward" / f"{job['id']}.original.png").read_bytes() == PNG
                assert len(image_requests) == 1
                assert len(text_requests) == 2
                reward_prompt = image_requests[0]["input"]["messages"][0]["content"][0]["text"]
                assert "整理后的视觉描述" in reward_prompt and "原始需求" in reward_prompt

                draft = call(port, "CreateQuestDraftAPI", {"title": plan["title"], "category": "study", "description": plan["summary"], "dueDate": None, "tier": "challenge", "stages": plan["stages"], "reward": reward, "jobId": job["id"]}, token)
                assert draft["reward"]["imageUrl"] == reward["imageUrl"] and len(image_requests) == 1
                call(port, "StartQuestAPI", {"questId": draft["quest"]["id"]}, token)
                call(port, "CompleteQuestStepAPI", {"questId": draft["quest"]["id"], "stepId": draft["steps"][0]["id"]}, token)
                dashboard = call(port, "GetDashboardAPI", token=token)
                assert len(dashboard["rewards"]) == 1
                assert "coins" not in dashboard and "progress" not in dashboard
                assert "稿纸剑" in reward_prompt

                request.update(requestKey=str(uuid.uuid4()), generateRewardImage=False)
                fixed_job = wait_job(port, token, call(port, "RequestPlanGenerationAPI", request, token)["id"])
                assert fixed_job["result"]["reward"]["imageUrl"] is None and len(image_requests) == 1
                fixed_reward = {"name": "作业书本", "story": "把要交的东西一页页压平，今天也算推进。", "symbol": "book", "palette": "sage"}
                fixed = call(port, "CreateQuestDraftAPI", {"title": "固定作业", "category": "study", "description": "固定模式", "dueDate": None, "tier": "daily", "stages": plan["stages"], "reward": fixed_reward, "jobId": fixed_job["id"]}, token)
                assert fixed["reward"]["imageUrl"] is None and len(image_requests) == 1

                request.update(goal="失败测试", requestKey=str(uuid.uuid4()), generateRewardImage=True)
                failed_image_job = wait_job(port, token, call(port, "RequestPlanGenerationAPI", request, token)["id"])
                assert failed_image_job["result"]["reward"]["imageUrl"] is None and len(image_requests) == 2
                failed_draft = call(port, "CreateQuestDraftAPI", {"title": "失败测试", "category": "study", "description": "图片失败时保留手绘", "dueDate": None, "tier": "challenge", "stages": plan["stages"], "reward": failed_image_job["result"]["reward"], "jobId": failed_image_job["id"]}, token)
                assert failed_draft["reward"]["imageUrl"] is None and len(image_requests) == 2

                request.update(goal="认证测试", requestKey=str(uuid.uuid4()), generateRewardImage=True)
                auth_job = wait_job(port, token, call(port, "RequestPlanGenerationAPI", request, token)["id"])
                assert auth_job["result"]["reward"]["imageUrl"] is None
                assert "认证失败" in auth_job["result"]["reward"]["imageError"] and len(image_requests) == 3
                auth_draft = call(port, "CreateQuestDraftAPI", {"title": "认证测试", "category": "study", "description": "保留已生成的文字计划", "dueDate": None, "tier": "challenge", "stages": plan["stages"], "reward": auth_job["result"]["reward"], "jobId": auth_job["id"]}, token)
                assert auth_draft["reward"]["imageUrl"] is None and len(image_requests) == 3
                report = call(port, "GetUsageReportAPI", token=token)
                assert len(report["events"]) >= 6 and report["measuredTokens"] > 0
                print("PASS: reward text refinement, image generation, persistence and failure handling")
    finally:
        if process and process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=20)
        subprocess.run(["dropdb", "-h", "127.0.0.1", "-p", "54329", "-U", "heroes", "--if-exists", db], check=False)
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    main()

"""Run the local database and app, detached from the Start.command terminal."""
import argparse
import fcntl
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local"
DB = LOCAL / "postgres"
STATE = LOCAL / "services.json"
PASSWORD = LOCAL / "database-password"
PORT = int(os.getenv("VOCALLAB_PORT", "8818"))
FRONTEND_PORT = int(os.getenv("VOCALLAB_FRONTEND_PORT", "5188"))
DB_PORT = int(os.getenv("VOCALLAB_DB_PORT", "5447"))
URL = f"http://127.0.0.1:{FRONTEND_PORT}"
API = f"http://127.0.0.1:{PORT}"
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def pg_ctl(*args, **kwargs):
    return subprocess.run(["pg_ctl", "-D", str(DB), *args], **kwargs)


def is_running():
    return pg_ctl("status", capture_output=True).returncode == 0


def password():
    if not PASSWORD.exists():
        fd = os.open(PASSWORD, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w") as file:
            file.write(secrets.token_urlsafe(24) + "\n")
    return PASSWORD.read_text().strip()


def start_database():
    secret = password()
    if not (DB / "PG_VERSION").exists():
        subprocess.run(["initdb", "-D", str(DB), "--username=vocallab", "--auth=scram-sha-256",
                        f"--pwfile={PASSWORD}", "--no-locale", "--encoding=UTF8"], check=True)
    if not is_running():
        pg_ctl("-l", str(LOCAL / "postgres.log"), "-o", f"-p {DB_PORT} -h 127.0.0.1 -k ''", "-w", "start", check=True)
    env = {**os.environ, "PGPASSWORD": secret}
    destination = ["-h", "127.0.0.1", "-p", str(DB_PORT), "-U", "vocallab"]
    result = subprocess.run(["psql", *destination, "-d", "postgres", "-Atc",
                             "SELECT 1 FROM pg_database WHERE datname='vocallab'"],
                            capture_output=True, text=True, env=env, check=True)
    if result.stdout.strip() != "1":
        subprocess.run(["createdb", *destination, "vocallab"], env=env, check=True)
    return dict(VOCALLAB_DB_URL=f"jdbc:postgresql://127.0.0.1:{DB_PORT}/vocallab",
                VOCALLAB_DB_USER="vocallab", VOCALLAB_DB_PASSWORD=secret)


def port_available(port):
    with socket.socket() as client:
        client.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            client.bind(("127.0.0.1", port))
        except OSError as error:
            raise RuntimeError(f"端口 {port} 已被占用，请停止旧服务或配置其他端口。") from error


def read_state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}


def ours(pid):
    if not pid:
        return False
    result = subprocess.run(["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True)
    return result.returncode == 0 and str(ROOT) in result.stdout


def write_state(state):
    pending = STATE.with_suffix(".tmp")
    pending.write_text(json.dumps(state))
    pending.replace(STATE)


def spawn(service, args, directory, env, state):
    log = LOCAL / f"{service}.log"
    with log.open("wb") as output:
        child = subprocess.Popen(args, cwd=directory, env=env, stdin=subprocess.DEVNULL, stdout=output,
                                 stderr=subprocess.STDOUT, start_new_session=True)
    state[service] = child.pid
    write_state(state)
    return child, log


def healthy(url):
    try:
        with OPENER.open(url, timeout=2) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


def wait(url, child, log):
    for _ in range(150):
        if child.poll() is not None:
            break
        if healthy(url):
            return
        time.sleep(.2)
    raise RuntimeError(f"服务未能启动，请查看 {log}")


def stop_app(state):
    for name in ("frontend", "backend"):
        pid = state.get(name)
        if ours(pid):
            try:
                os.killpg(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    for _ in range(30):
        if not any(ours(state.get(name)) for name in ("frontend", "backend")):
            break
        time.sleep(.15)
    for name in ("frontend", "backend"):
        pid = state.get(name)
        if ours(pid):
            try:
                os.killpg(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    STATE.unlink(missing_ok=True)


def coach_environment():
    """Read optional backend-only provider settings for Start.command."""
    path = LOCAL / "coach.env"
    allowed = {
        "VOCALLAB_AI_KEY", "VOCALLAB_AI_KEY_FILE", "VOCALLAB_AI_BASE_URL", "VOCALLAB_AI_MODEL",
        "VOCALLAB_AI_TIMEOUT_SECONDS", "VOCALLAB_AI_MAX_TOKENS", "VOCALLAB_AI_JSON_MODE",
        "VOCALLAB_SEARCH_KEY", "VOCALLAB_SEARCH_URL", "VOCALLAB_DEEPSEEK_KEY", "VOCALLAB_DEEPSEEK_BASE_URL", "VOCALLAB_DEEPSEEK_TEXT_URL",
    }
    file_settings = {}
    if path.is_file():
        for line in path.read_text().splitlines():
            key, separator, value = line.partition("=")
            key = key.strip()
            if separator and key in allowed and value.strip():
                file_settings[key] = value.strip()
    inherited = {key: os.environ[key] for key in allowed if key in os.environ}
    settings = {**file_settings, **inherited}
    key_file = settings.pop("VOCALLAB_AI_KEY_FILE", None)
    if key_file and "VOCALLAB_AI_KEY" not in settings:
        try:
            value = json.loads(Path(key_file).expanduser().read_text())["api_key"]
            if isinstance(value, str) and value.strip():
                settings["VOCALLAB_AI_KEY"] = value.strip()
        except (OSError, ValueError, TypeError, KeyError):
            print("无法读取 AI 凭证文件，继续以本地模式启动。")
    return settings, allowed


def start():
    state = read_state()
    if all(ours(state.get(name)) for name in ("frontend", "backend")) and healthy(URL) and healthy(API + "/api/getmedialimitsapi"):
        print(f"VocalLab 已在运行 · {URL}")
        return
    if not (ROOT / ".venv/bin/python").is_file() or not (ROOT / "frontend/node_modules/vite/bin/vite.js").is_file():
        raise RuntimeError("请先运行 ./scripts/setup.sh 安装依赖。")
    stop_app(state)
    port_available(PORT)
    port_available(FRONTEND_PORT)
    env = {**os.environ, "VOCALLAB_ROOT": str(ROOT), "VOCALLAB_PYTHON": str(ROOT / ".venv/bin/python"),
           "VOCALLAB_API_URL": API, "VOCALLAB_FRONTEND_PORT": str(FRONTEND_PORT), "CI": "true"}
    providers, provider_keys = coach_environment()
    frontend_env = {key: value for key, value in env.items() if key not in provider_keys}
    config = start_database() if "VOCALLAB_DB_URL" not in env else {}
    backend = ROOT / "backend"
    frontend = ROOT / "frontend"
    print("正在编译 VocalLab。")
    build = subprocess.run(["sbt", "-batch", "-Dsbt.log.noformat=true", "compile",
                            "export Runtime / fullClasspath"], cwd=backend, text=True, capture_output=True)
    (LOCAL / "build.log").write_text(build.stdout + build.stderr)
    if build.returncode:
        raise RuntimeError("Scala 编译失败，请查看 .local/build.log。")
    classpath = build.stdout.strip().splitlines()[-1]
    if "target/scala-" not in classpath:
        raise RuntimeError("无法读取 Scala 运行路径，请查看 .local/build.log。")
    subprocess.run(["npm", "run", "build"], cwd=frontend, env=frontend_env, check=True)
    state = {}
    try:
        child, log = spawn("backend", ["java", f"-Dvocallab.root={ROOT}", "-cp", classpath,
                                       "services.system.utils.Main"], backend, {**env, **config, **providers}, state)
        wait(API + "/api/getmedialimitsapi", child, log)
        child, log = spawn("frontend", [shutil.which("node"), str(frontend / "node_modules/vite/bin/vite.js"),
                                        "preview", "--host", "127.0.0.1"], frontend, frontend_env, state)
        wait(URL, child, log)
    except BaseException:
        stop_app(state)
        raise
    print(f"VocalLab 已启动 · {URL}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["start", "stop"])
    options = parser.parse_args()
    os.umask(0o077)
    LOCAL.mkdir(exist_ok=True)
    with (LOCAL / "launcher.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if options.action == "start":
            start()
        else:
            stop_app(read_state())
            if is_running():
                pg_ctl("-w", "-m", "fast", "stop", check=True)
            print("VocalLab 已停止。")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Regression: a real Vite process must survive its launcher's terminal closing."""
from pathlib import Path
import os
import pty
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def reachable(url):
    try:
        with urllib.request.urlopen(url, timeout=1) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


def launch_child(state, port):
    sys.path.insert(0, str(ROOT / 'scripts'))
    import dev
    dev.STATE = Path(state)
    dev.spawn('frontend', ['npm', 'run', 'dev', '--', '--port', port],
              ROOT / 'frontend', dev.environment())


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--child':
        launch_child(sys.argv[2], sys.argv[3])
        return
    if not (ROOT / 'frontend/node_modules/vite').exists():
        raise SystemExit('请先按 README 安装前端依赖。')
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    url = 'http://127.0.0.1:' + str(port)
    with tempfile.TemporaryDirectory(prefix='heroes-launcher-') as state:
        master, slave = pty.openpty()
        env = dict(os.environ)
        env.pop('CI', None)
        pid = None
        launcher = None
        try:
            # Like Finder/Terminal: the launcher starts with a real terminal,
            # starts a detached service, then exits before the window closes.
            launcher = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), '--child', state, str(port)],
                cwd=ROOT, env=env, stdin=slave, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, start_new_session=True,
            )
            os.close(slave)
            slave = None
            output, _ = launcher.communicate(timeout=15)
            if launcher.returncode:
                raise RuntimeError(output.decode(errors='replace'))
            pid = int((Path(state) / 'frontend.pid').read_text())
            deadline = time.monotonic() + 30
            while not reachable(url):
                if time.monotonic() > deadline:
                    raise RuntimeError('隔离端口上的前端未能启动；测试日志：' +
                                       (Path(state) / 'frontend.log').read_text(errors='replace'))
                time.sleep(.2)
            print('PASS: launcher exited, frontend serves HTTP 200.', flush=True)
            os.close(master)
            master = None
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                if not reachable(url):
                    raise AssertionError('Frontend stopped when the terminal closed.')
                time.sleep(.2)
            print('PASS: terminal closed, frontend remains reachable for 5 seconds.', flush=True)
        finally:
            if slave is not None:
                os.close(slave)
            if master is not None:
                os.close(master)
            if pid is None and (Path(state) / 'frontend.pid').exists():
                pid = int((Path(state) / 'frontend.pid').read_text())
            if pid is not None:
                try:
                    os.killpg(pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            if launcher is not None and launcher.poll() is None:
                launcher.kill()
                launcher.wait(timeout=5)
            deadline = time.monotonic() + 5
            while pid is not None and reachable(url) and time.monotonic() < deadline:
                time.sleep(.1)
            if pid is not None and reachable(url):
                os.killpg(pid, signal.SIGKILL)
                raise AssertionError('Regression test process failed to stop.')
    print('PASS: isolated test service stopped; project services and data untouched.')


if __name__ == '__main__':
    main()

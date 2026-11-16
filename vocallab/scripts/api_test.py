"""Exercise the running http4s backend and real Python worker."""
import http.client
import io
import json
import math
import os
import struct
import tempfile
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import wave
from pathlib import Path

from fixtures import ffmpeg, prepare

BASE = os.getenv("VOCALLAB_API_URL", "http://127.0.0.1:8818")
MARKER = {"X-VocalLab": "1"}


def fetch(path, body=None, headers=None):
    req = urllib.request.Request(f"{BASE}/api/{path}", data=body, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=150) as res:
            data = res.read()
            return res.status, (json.loads(data) if res.headers.get_content_type() == "application/json" else data), res.headers
    except urllib.error.HTTPError as res:
        data = res.read()
        return res.code, (json.loads(data) if res.headers.get_content_type() == "application/json" else data), res.headers


def call(path, body):
    return fetch(path, json.dumps(body).encode(), {**MARKER, "Content-Type": "application/json"})


def upload(path, name=None):
    return fetch("uploadmediaapi", path.read_bytes(), {**MARKER, "Content-Type": "application/octet-stream",
                 "X-File-Name": urllib.parse.quote(name or path.name, safe="")})


def wait_for(id, deadline=120):
    stages = set()
    started = time.monotonic()
    while time.monotonic() - started < deadline:
        status, job, _ = call("getanalysisapi", {"analysisId": id})
        assert status == 200, job
        stages.add(job["stage"])
        if job["status"] in {"completed", "failed"}:
            return job, stages
        time.sleep(.25)
    raise AssertionError("Analysis did not complete")


class Backend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.folder = Path(cls.tmp.name)
        prepare(cls.folder)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def uploaded(self, path, name=None):
        status, result, _ = upload(path, name)
        self.assertEqual(status, 201, result)
        return result

    def test_upload_decoding_and_errors(self):
        for file in ["reference.wav", "reference.mp3", "reference.m4a", "delayed.mp4", "delayed.mov"]:
            with self.subTest(file=file):
                info = self.uploaded(self.folder / file)
                self.assertGreater(info["duration"], 6)
                self.assertEqual(info["hasVideo"], file.startswith("delayed"))
                self.assertEqual(info["sizeBytes"], (self.folder / file).stat().st_size)
        multi = self.uploaded(self.folder / "multi-offset.mov")
        self.assertEqual(multi["audioStreams"], 2)
        self.assertEqual(multi["audioStream"], 2)
        self.assertGreater(multi["audioStart"], .4)
        for file in ["without-audio.mp4", "broken.mov", "renamed.wav"]:
            with self.subTest(file=file):
                status, info, _ = upload(self.folder / file)
                self.assertEqual(status, 422, info)
                self.assertTrue(info["error"])
        status, info, _ = upload(self.folder / "reference.wav", "reference.zip")
        self.assertEqual(status, 415, info)
        limits = fetch("getmedialimitsapi")[1]
        if limits["maxDuration"] <= 950:
            long_media = self.folder / "too-long.wav"
            ffmpeg("-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", limits["maxDuration"] + 2,
                   "-c:a", "pcm_u8", long_media)
            status, info, _ = upload(long_media)
            self.assertEqual(status, 422, info)
            self.assertIn("时长", info["error"])

    def test_body_limit_and_local_origin(self):
        maximum = fetch("getmedialimitsapi")[1]["maxBytes"]
        url = urllib.parse.urlparse(BASE)
        connection = http.client.HTTPConnection(url.hostname, url.port, timeout=8)
        try:
            connection.putrequest("POST", "/api/uploadmediaapi")
            connection.putheader("Content-Length", str(maximum + 1))
            connection.putheader("X-VocalLab", "1")
            connection.putheader("X-File-Name", "big.wav")
            connection.endheaders()
            self.assertEqual(connection.getresponse().status, 413)
        finally:
            connection.close()
        status, _, _ = fetch("getmedialimitsapi", headers={"Origin": "https://example.org"})
        self.assertEqual(status, 403)

    def test_real_worker_report_audio_and_manual_alignment(self):
        reference = self.uploaded(self.folder / "reference.mp3", "原唱 + clip.mp3")
        user = self.uploaded(self.folder / "delayed.mov")
        self.assertEqual(reference["name"], "原唱 + clip.mp3")
        status, data, headers = fetch(f"getmediaaudioapi/{user['id']}", headers={"Range":"bytes=0-63"})
        self.assertEqual((status, len(data)), (206, 64))
        self.assertEqual(data[:4], b"fLaC")
        self.assertTrue(headers["Content-Range"].startswith("bytes 0-63/"))
        clip = dict(reference=dict(mediaId=reference["id"], start=.30, end=5.30, separate=False),
                    user=dict(mediaId=user["id"], start=.30, end=6.30, separate=False), manualOffset=None)
        status, _, _ = call("createanalysisapi", {**clip, "reference": {**clip["reference"], "end": 900}})
        self.assertEqual(status, 400)
        status, job, _ = call("createanalysisapi", clip)
        self.assertEqual(status, 200, job)
        self.assertEqual(job["status"], "pending")
        id = job["analysisId"]
        self.assertIn(call("getanalysisresultapi", {"analysisId": id})[0], [409, 200])
        job, stages = wait_for(id)
        self.assertEqual(job["status"], "completed", job)
        self.assertTrue(stages.intersection({"queued", "decode", "pitch_reference", "pitch_user", "alignment", "metrics", "report"}))
        status, result, _ = call("getanalysisresultapi", {"analysisId": id})
        self.assertEqual(status, 200, result)
        self.assertEqual(result["analysisId"], id)
        self.assertEqual(result["pitchTracks"]["reference"]["originalStart"], .30)
        self.assertTrue(result["alignment"]["reliable"], result["alignment"])
        self.assertAlmostEqual(result["alignment"]["offset"], 1, delta=.35)
        self.assertGreater(next(m["value"] for m in result["metrics"] if m["name"] == "pitchHitRate"), .82)
        for role, expected in [("reference", 5), ("user", 6)]:
            status, audio, _ = fetch(f"getanalyzedaudioapi/{id}/{role}/original")
            self.assertEqual(status, 200)
            with wave.open(io.BytesIO(audio)) as wav:
                self.assertAlmostEqual(wav.getnframes()/wav.getframerate(), expected, delta=.02)
                if role == "user":
                    samples = struct.unpack(f"<{round(.52*wav.getframerate())}h", wav.readframes(round(.52*wav.getframerate())))
                    self.assertLess(math.sqrt(sum(value**2 for value in samples) / len(samples)), 300)
        self.assertEqual(fetch(f"getanalyzedaudioapi/{id}/user/vocals")[0], 404)
        self.assertEqual(fetch(f"getanalyzedaudioapi/{id}/user/original", headers={"Range":"bytes=99999999-"})[0], 416)
        status, adjusted, _ = call("adjustalignmentapi", {"analysisId": id, "manualOffset": 1.0})
        self.assertEqual(status, 200)
        self.assertNotEqual(id, adjusted["analysisId"])
        adjusted_job, _ = wait_for(adjusted["analysisId"])
        self.assertEqual(adjusted_job["status"], "completed", adjusted_job)
        adjusted_result = call("getanalysisresultapi", {"analysisId": adjusted["analysisId"]})[1]
        self.assertEqual(adjusted_result["alignment"]["manualOffset"], 1.0)

    @unittest.skipUnless(os.getenv("VOCALLAB_PHONE_FIXTURE"), "Optional original phone video")
    def test_original_phone_video(self):
        recording = Path(os.environ["VOCALLAB_PHONE_FIXTURE"])
        media = self.uploaded(recording)
        self.assertTrue(media["hasVideo"])
        self.assertGreater(media["audioStreams"], 0)
        self.assertGreater(media["duration"], 1)
        self.assertEqual(fetch(f"getmediaaudioapi/{media['id']}", headers={"Range":"bytes=0-63"})[0], 206)

    @unittest.skipUnless(os.getenv("VOCALLAB_REAL_API_FIXTURES"), "Optional real-song API test")
    def test_real_music_separation_and_cache(self):
        root = Path(os.environ["VOCALLAB_REAL_API_FIXTURES"])
        ref_file = root / os.getenv("VOCALLAB_REAL_MIX", "mix.wav")
        user_file = root / os.getenv("VOCALLAB_REAL_VOICE", "clean.wav")
        reference = self.uploaded(ref_file)
        user = self.uploaded(user_file)
        mode = os.getenv("VOCALLAB_TEST_MODE", "precise")
        clip = dict(reference=dict(mediaId=reference["id"], start=0, end=min(reference["duration"], 36),
                                   separate=True, separationMode=mode),
                    user=dict(mediaId=user["id"], start=0, end=min(user["duration"], 36), separate=False), manualOffset=None)
        status, job, _ = call("createanalysisapi", clip)
        self.assertEqual(status, 200, job)
        id = job["analysisId"]
        finished, _ = wait_for(id, deadline=1200)
        self.assertEqual(finished["status"], "completed", finished)
        status, result, _ = call("getanalysisresultapi", {"analysisId": id})
        self.assertEqual(status, 200, result)
        self.assertEqual(result["separation"]["reference"]["status"], "completed")
        self.assertIn(result["separation"]["reference"]["device"], {"mps", "cpu", "Core ML / CPU"})
        self.assertEqual(result["separation"]["reference"]["model"],
                         "MDX-Net Kim Vocal 2" if mode == "fast" else "BS-RoFormer Viperx 1297")
        self.assertTrue(result["alignment"]["reliable"], result["alignment"]["warnings"])
        for track in ["original", "vocals", "instrumental"]:
            self.assertEqual(fetch(f"getanalyzedaudioapi/{id}/reference/{track}", headers={"Range":"bytes=0-31"})[0], 206)
        print("Song metrics:", {metric["name"]: metric["value"] for metric in result["metrics"]})
        status, repeat, _ = call("adjustalignmentapi", {"analysisId": id, "manualOffset": 0})
        self.assertEqual(status, 200, repeat)
        finished, _ = wait_for(repeat["analysisId"], deadline=180)
        self.assertEqual(finished["status"], "completed", finished)
        result = call("getanalysisresultapi", {"analysisId": repeat["analysisId"]})[1]
        self.assertTrue(result["separation"]["reference"]["cached"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

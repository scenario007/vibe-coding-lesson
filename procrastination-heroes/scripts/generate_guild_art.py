#!/usr/bin/env python3
"""Opt-in, metered TokenHub asset generation. Default is a free dry run."""
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
import argparse
import base64
import json
import os
import subprocess
from contextlib import contextmanager
import urllib.request
import urllib.error
from dev import ROOT, environment

MODEL = 'seedream-image-v5.0-flash'
PRICE_DATE = '2026-10-25'
PRICE = Decimal('0.12')
OUT = ROOT / 'frontend/public/assets/guild-v2'
MANIFEST = OUT / 'manifest.json'
PROMPTS = {
    'hero': ('transparent', '制作透明背景角色图集，2048×2048，严格2列3行六个等大格，每格四周留足透明间隔，无格线。六格是同一成年中性小勇者：豆形圆脸、半睁黑眼、一撮乱卷发、皱暗红披风、灰橄榄短衫、棕短靴、凹锅盖盾牌和折纸稿剑。按行依次：站立发呆、挠头犹豫、提剑开工、举盾庆祝、趴地休息、抱卷轴认真读。各姿态完整不越格，比例一致。炭黑粗细统一的微抖手绘墨线、少量排线、哑光平涂，暖羊皮色与暗红橄榄配色，笨拙困倦但可爱。无字、无数字、无标签、无界面、无水印、无阴影底板，无3D和渐变。'),
    'slime': ('transparent', '制作透明背景史莱姆图集，2048×2048，严格2列2行四个等大格，每格四周留足透明间隔，无格线。四格是同一灰橄榄史莱姆：不对称软团、一根垂卷头尖、半睁黑眼、短直嘴和一侧脸颊小鼓包。按行依次：困倦清醒、努力睁眼专注、压扁闭眼休息、弹起微笑庆祝。身份和比例一致，动作完整不越格。炭黑粗细统一的微抖手绘墨线、稀疏排线、哑光平涂，少量暗红和赭黄点缀，干涩幽默。无字、无数字、无标签、无界面、无水印、无地面和场景，无3D、渐变和玻璃质感。'),
    'room': ('opaque', '绘制2048×2048不透明公会小屋背景，正面浅透视舞台。旧木梁和暖羊皮纸色墙，远左角小旧工作台放空白卷纸和小锅，远右角矮架挂暗红破布。中央六成墙面和大部分木地板空白，留给网页叠加家具，不预画灯、画框或盾牌。主体放在高度20%至80%之间，便于横向裁切。炭黑粗细统一的微抖手绘墨线、少量交叉排线、哑光平涂，羊皮色、暗红、灰橄榄和暖棕，破旧但友善，有漫画幽默。无人物、无字、无数字、无标牌、无界面、无边框、无水印，无森林风景、写实水彩、3D和渐变。'),
}


def stamp():
    return datetime.now(timezone.utc).isoformat()


def save(value):
    OUT.mkdir(parents=True, exist_ok=True)
    temp = MANIFEST.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(MANIFEST)


@contextmanager
def budget_guard(env):
    """Use the same PostgreSQL transaction lock as live text requests."""
    args = ['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1',
            '-h', env.get('DB_HOST', '127.0.0.1'), '-p', env.get('DB_PORT', '54329'),
            '-U', env.get('DB_USER', 'heroes'), '-d', env.get('DB_NAME', 'heroes')]
    proc = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, env={**os.environ, 'PGCONNECT_TIMEOUT': '5',
                                            'PGPASSWORD': env.get('DB_PASSWORD', '')})
    try:
        proc.stdin.write("BEGIN; SET LOCAL lock_timeout='15s'; SELECT pg_advisory_xact_lock(7320182); "
                         "SELECT 'PROJECT:' || COALESCE(SUM(COALESCE(estimated_cny,reserved_cny)),0)::text FROM ai_usage_events;\n")
        proc.stdin.flush()
        while True:
            line = proc.stdout.readline()
            if not line:
                raise RuntimeError('费用账本不可用；请先启动应用初始化数据库，未发起生图。')
            if line.startswith('PROJECT:'):
                spent = Decimal(line.strip().split(':', 1)[1])
                break
        yield spent
        proc.stdin.write('COMMIT;\n\\q\n')
        proc.stdin.flush()
        proc.communicate(timeout=5)
        if proc.returncode:
            raise RuntimeError('费用账本事务未确认；未自动重试。')
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.communicate(timeout=5)


def settle_entry(env, entry):
    with budget_guard(env):
        current = json.loads(MANIFEST.read_text())
        found = next(v for v in current['assets'] if v['startedAt'] == entry['startedAt'])
        found.update(entry)
        save(current)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--retry-unconfirmed', action='store_true', help='Explicit operator retry; earlier reservation is retained.')
    parser.add_argument('--only', choices=[*PROMPTS, 'all'], default='all')
    parser.add_argument('--budget-cny', type=Decimal, default=Decimal('10'))
    args = parser.parse_args()
    if not Decimal('0') < args.budget_cny <= Decimal('10'):
        raise SystemExit('本轮授权上限为 10 元，预算必须在 0–10 元之间。')
    names = list(PROMPTS) if args.only == 'all' else [args.only]
    if not args.generate:
        print(f'DRY RUN: {MODEL}; {len(names)} requests; reference estimate CNY {PRICE * len(names)}; no API request.')
        return
    # Prices must be re-verified before reusing this operator script on a later day.
    from zoneinfo import ZoneInfo
    if datetime.now(ZoneInfo('Asia/Shanghai')).date().isoformat() != PRICE_DATE:
        raise SystemExit('价格快照已过期，请先核对官方在线模型和单价并更新 PRICE_DATE。')
    env = environment()
    if env.get('TOKENHUB_IMAGE_GENERATION_ENABLED', 'false').lower() != 'true':
        raise SystemExit('本轮用户选择不启用图像付费；图像调用默认关闭。重新获得明确授权后才可启用。')
    key = env.get('TOKENHUB_API_KEY') or json.loads(Path(env['TOKENHUB_CONFIG_FILE']).read_text())['api_key']
    ledger = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {
        'version': '0.2.0', 'model': MODEL, 'currency': 'CNY', 'priceVerifiedAt': PRICE_DATE,
        'priceSource': 'https://cloud.tencent.com/document/product/1823/130055',
        'billingNote': '按平台返回用量与官方费率估算，非平台实扣；不包含账本启用前调用。', 'assets': [],
    }
    for name in names:
        with budget_guard(env) as text_spent:
            ledger = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else ledger
            existing = next((v for v in ledger['assets'] if v['name'] == name), None)
            if existing:
                if existing['status'] == 'succeeded' and (OUT / existing['file']).exists():
                    print(f'REUSE: {name}; no new request.', flush=True)
                    continue
                if args.retry_unconfirmed and existing['status'] == 'unconfirmed':
                    existing['name'] = name + '-prior-' + str(len(ledger['assets']))
                    save(ledger)
                else:
                    raise SystemExit(f'{name} 已有未确认记录；为避免重复扣费，不自动重试。')
            spent = text_spent + sum(Decimal(str(v['estimatedCny'])) for v in ledger['assets'])
            if spent + PRICE > args.budget_cny:
                raise SystemExit('达到本轮预算，未发起新请求。')
            background, prompt = PROMPTS[name]
            entry = {'name': name, 'file': name + '.png', 'model': MODEL, 'prompt': prompt,
                     'status': 'pending', 'startedAt': stamp(), 'estimatedCny': float(PRICE),
                     'tokens': None, 'requestId': None, 'pricePerMillionTokens': 10}
            ledger['assets'].append(entry)
            save(ledger)  # Reserve before network; a timeout must never erase potential cost.
        payload = {'model': MODEL, 'prompt': prompt, 'size': '2048x2048',
                   'background': background, 'output_format': 'png', 'response_format': 'b64_json',
                   'watermark': False}
        req = urllib.request.Request('https://tokenhub.tencentmaas.com/v1/wand/si-image/generation',
            data=json.dumps(payload, ensure_ascii=False).encode(), method='POST',
            headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
        print(f'GENERATE: {name}; reserved CNY {PRICE}; round total <= {spent + PRICE}.', flush=True)
        try:
            with urllib.request.urlopen(req, timeout=180) as response:
                result = json.load(response)
            tokens = result.get('tokenhub_usage', {}).get('total_tokens')
            entry['tokens'] = tokens
            if isinstance(tokens, int):
                entry['estimatedCny'] = float(Decimal(tokens) * Decimal('10') / Decimal('1000000'))
            entry['requestId'] = result.get('request_id')
            data = result.get('data') or []
            if len(data) != 1:
                raise ValueError('Unexpected image count; stop and reconcile before retry.')
            raw = base64.b64decode(data[0]['b64_json'], validate=True)
            if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValueError('Response image is not PNG.')
            (OUT / entry['file']).write_bytes(raw)
            entry['status'] = 'succeeded'
            entry['completedAt'] = stamp()
            settle_entry(env, entry)
            total = sum(Decimal(str(v['estimatedCny'])) for v in ledger['assets'])
            print(f'SAVED: {name}; tokens={tokens}; estimate CNY {entry["estimatedCny"]}; total CNY {total}.', flush=True)
        except Exception as error:
            entry['status'] = 'unconfirmed'
            entry['errorType'] = type(error).__name__
            entry['completedAt'] = stamp()
            if isinstance(error, urllib.error.HTTPError):
                entry['httpStatus'] = error.code
                try:
                    detail = json.loads(error.read(4096).decode(errors='replace'))
                    safe = detail.get('error', detail)
                    if isinstance(safe, dict):
                        entry['errorCode'] = str(safe.get('code', ''))[:100]
                        entry['errorMessage'] = str(safe.get('message', '')).replace(key, '[redacted]')[:300]
                    print('HTTP diagnostic: ' + json.dumps({k:entry.get(k) for k in ['httpStatus','errorCode','errorMessage']},ensure_ascii=False),flush=True)
                except (ValueError, OSError):
                    pass
            settle_entry(env, entry)
            print(f'STOP: {name}; {type(error).__name__}; reserved cost retained, no automatic retry.', flush=True)
            raise SystemExit(1) from None


if __name__ == '__main__':
    main()

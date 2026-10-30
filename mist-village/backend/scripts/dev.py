#!/usr/bin/env python3
"""Start the standalone local backend. No credentials are copied into this project."""
from pathlib import Path
import argparse
import os
import shutil
import subprocess
import sys

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
STATE = ROOT / '.local'
PGDATA = STATE / 'postgres'
PORT = '54349'
COURSE = Path('/Users/maziqi/Desktop/大三上/无代码零基础软件制作')
HEROES = ROOT.parent / 'procrastination-heroes'

def run(args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)

def db():
    STATE.mkdir(exist_ok=True)
    if not (PGDATA / 'PG_VERSION').exists():
        if subprocess.run(['pg_isready','-h','127.0.0.1','-p',PORT],capture_output=True).returncode == 0:
            raise RuntimeError('54349 已被其他数据库占用；未修改已有数据库。')
        run(['initdb','-D',PGDATA,'-U','mist_village','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8'])
    status=subprocess.run(['pg_ctl','-D',str(PGDATA),'status'],capture_output=True).returncode
    if status != 0:
        if subprocess.run(['pg_isready','-h','127.0.0.1','-p',PORT],capture_output=True).returncode == 0:
            raise RuntimeError('54349 已被其他数据库占用；未连接该服务。')
        run(['pg_ctl','-D',PGDATA,'-l',STATE/'postgres.log','-o',f'-h 127.0.0.1 -p {PORT} -k /private/tmp','-w','start'])
    result=run(['psql','-h','127.0.0.1','-p',PORT,'-U','mist_village','-d','postgres','-tAc',"SELECT 1 FROM pg_database WHERE datname='mist_village'"],capture_output=True,text=True)
    if result.stdout.strip() != '1':
        run(['createdb','-h','127.0.0.1','-p',PORT,'-U','mist_village','mist_village'])

def ledger_id():
    nickname=os.environ.get('MIST_LEDGER_USER','littlehero')
    command=['psql','-h','127.0.0.1','-p','54329','-U','heroes','-d','heroes','-tA','-v',f'ledger_user={nickname}','-f','-']
    try:
        result=run(command,input="SELECT id FROM users WHERE username=:'ledger_user' OR nickname=:'ledger_user';\n",capture_output=True,text=True)
    except subprocess.CalledProcessError:
        return None
    ids=[s for s in result.stdout.splitlines() if s]
    return ids[0] if len(ids)==1 else None

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['serve','check'],nargs='?',default='serve')
    args=parser.parse_args()
    if args.command=='check':
        for program in ['java','sbt','psql','initdb','pg_ctl']:
            print(f'{program}: {shutil.which(program) or "未找到"}')
        print('课程凭据文件:', '存在' if (COURSE/'099-2024011160-马子奇.json').is_file() else '未找到')
        return
    db()
    env=os.environ.copy()
    env.setdefault('MIST_DATABASE_URL',f'jdbc:postgresql://127.0.0.1:{PORT}/mist_village')
    env.setdefault('MIST_DATABASE_USER','mist_village')
    env.setdefault('MIST_HTTP_PORT','8089')
    env.setdefault('TOKENHUB_CONFIG_FILE',str(COURSE/'099-2024011160-马子奇.json'))
    env.setdefault('TOKENHUB_ART_MANIFEST',str(HEROES/'frontend/public/assets/guild-v2/manifest.json'))
    env.setdefault('TOKENHUB_ROUND_BUDGET_CNY','10')
    env.setdefault('MIST_LEDGER_JDBC_URL','jdbc:postgresql://127.0.0.1:54329/heroes')
    env.setdefault('MIST_LEDGER_DB_USER','heroes')
    account=ledger_id()
    if account:
        env.setdefault('MIST_LEDGER_USER_ID',account)
        print('共享用量账本账户已匹配。',flush=True)
    else:
        print('共享账本不可用或账户不唯一：后端可启动，但 AI 请求会被拒绝。',flush=True)
    print('启动雾谷后端；按 Ctrl+C 停止服务。',flush=True)
    os.chdir(BACKEND)
    os.execvpe('sbt',['sbt','run'],env)
if __name__=='__main__':
    try: main()
    except (RuntimeError,subprocess.CalledProcessError,OSError) as e:
        print(f'启动失败：{e}',file=sys.stderr)
        raise SystemExit(1)

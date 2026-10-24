#!/usr/bin/env python3
"""Local development launcher; external model credentials stay outside the repository."""
from pathlib import Path
import argparse, os, shutil, signal, socket, subprocess, sys, time, urllib.request
ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.local'
STATE.mkdir(exist_ok=True)
def environment():
    env=dict(os.environ)
    for path in [ROOT/'.env',ROOT/'.env.local']:
        if path.exists():
            for line in path.read_text().splitlines():
                text=line.strip()
                if text and not text.startswith('#') and '=' in text:
                    key,value=text.split('=',1)
                    env.setdefault(key.strip(),value.strip().strip('\"\''))
    return env
def run(args,**kwargs):
    return subprocess.run([str(v) for v in args],check=True,**kwargs)
def database(env):
    data=STATE/'postgres'
    port=env.get('DB_PORT','54329')
    host=env.get('DB_HOST','127.0.0.1')
    if host!='127.0.0.1':
        print('使用配置的外部数据库；跳过本地初始化。');return
    ready=subprocess.run(['pg_isready','-h',host,'-p',port],capture_output=True).returncode==0
    if not ready:
        if not (data/'PG_VERSION').exists():
            run(['initdb','-D',data,'-U','heroes','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8'],stdout=subprocess.DEVNULL)
        run(['pg_ctl','-D',data,'-l',STATE/'postgres.log','-o',f'-h 127.0.0.1 -p {port} -k /private/tmp','-w','start'],stdout=subprocess.DEVNULL)
    base=['psql','-h',host,'-p',port,'-U',env.get('DB_USER','heroes'),'-d','postgres','-tAc']
    exists=subprocess.run(base+["SELECT 1 FROM pg_database WHERE datname='heroes'"],capture_output=True,text=True,check=True).stdout.strip()
    if exists!='1':run(['createdb','-h',host,'-p',port,'-U',env.get('DB_USER','heroes'),'heroes'])
    print('本地 PostgreSQL 已就绪。')
def owned(pid,name):
    expected=str(ROOT/name) if name in ['backend','frontend'] else str(ROOT)
    try:
        output=subprocess.run(['lsof','-a','-p',str(pid),'-d','cwd','-Fn'],capture_output=True,text=True,timeout=3).stdout
        return any(line=='n'+expected for line in output.splitlines())
    except (OSError,subprocess.SubprocessError):
        try:return os.readlink('/proc/'+str(pid)+'/cwd')==expected
        except OSError:return False

def alive(pid):
    try:os.kill(pid,0);return True
    except OSError:return False
def spawn(name,args,cwd,env):
    pidfile=STATE/(name+'.pid')
    if pidfile.exists() and alive(int(pidfile.read_text())) and owned(int(pidfile.read_text()),name):
        print(name+' 已在运行。');return
    log=(STATE/(name+'.log')).open('ab')
    proc=subprocess.Popen(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    pidfile.write_text(str(proc.pid));log.close()
    print(name+' 启动中；日志位于 .local/'+name+'.log')
def main():
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['start','stop','database','check'],default='start',nargs='?');args=parser.parse_args();env=environment()
    if args.command=='check':
        for name in ['node','npm','java','sbt','psql','initdb','pg_ctl']:print(name,shutil.which(name) or '未找到')
        return
    if args.command=='stop':
        for name in ['frontend','backend']:
            pidfile=STATE/(name+'.pid')
            if pidfile.exists():
                pid=int(pidfile.read_text())
                if alive(pid) and owned(pid,name):os.killpg(pid,signal.SIGTERM)
                pidfile.unlink()
        data=STATE/'postgres'
        if (data/'PG_VERSION').exists():subprocess.run(['pg_ctl','-D',str(data),'-w','stop','-m','fast'],capture_output=True)
        print('本项目服务已停止；数据保留。');return
    database(env)
    if args.command=='database':return
    spawn('backend',['sbt','-batch','run'],ROOT/'backend',env)
    spawn('frontend',['npm','run','dev'],ROOT/'frontend',env)
    print('正在等待应用就绪（首次编译会稍久）…')
    for _ in range(180):
        try:
            with urllib.request.urlopen('http://127.0.0.1:8088/api/health',timeout=1) as response:pass
            with urllib.request.urlopen('http://127.0.0.1:5173',timeout=1) as response:pass
            print('准备好了：http://127.0.0.1:5173');return
        except Exception:time.sleep(1)
    print('启动尚未完成，请查看 .local/backend.log 和 .local/frontend.log。');sys.exit(1)
if __name__=='__main__':main()

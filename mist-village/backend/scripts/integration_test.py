#!/usr/bin/env python3
"""Run backend smoke tests against a disposable PostgreSQL cluster, without cloud calls."""
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

BACKEND=Path(__file__).resolve().parents[1]

def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        return sock.getsockname()[1]

def run(args,**kwargs):
    return subprocess.run([str(v) for v in args],check=True,**kwargs)

def request(url,body):
    q=urllib.request.Request(url,json.dumps(body).encode(),{'Content-Type':'application/json'})
    with urllib.request.urlopen(q,timeout=2) as response:
        return json.load(response)

def main():
    pg_port,api_port=free_port(),free_port()
    if pg_port==api_port: api_port=free_port()
    with tempfile.TemporaryDirectory(prefix='mist-integration-',dir='/private/tmp') as directory:
        temp=Path(directory); pg=temp/'postgres'; server=None; started=False
        log=(temp/'backend.log').open('w+')
        try:
            run(['initdb','-D',pg,'-U','mist_test','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8'],stdout=subprocess.DEVNULL)
            run(['pg_ctl','-D',pg,'-l',temp/'postgres.log','-o',f'-h 127.0.0.1 -p {pg_port} -k /private/tmp','-w','start'],stdout=subprocess.DEVNULL)
            started=True
            run(['createdb','-h','127.0.0.1','-p',str(pg_port),'-U','mist_test','mist_test'])
            env={k:v for k,v in os.environ.items() if not (k.startswith('TOKENHUB_') or k.startswith('MIST_LEDGER_'))}
            env.update({'MIST_DATABASE_URL':f'jdbc:postgresql://127.0.0.1:{pg_port}/mist_test','MIST_DATABASE_USER':'mist_test','MIST_HTTP_PORT':str(api_port),'MIST_TEST_API_URL':f'http://127.0.0.1:{api_port}/api/'})
            server=subprocess.Popen(['sbt','run'],cwd=BACKEND,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            deadline=time.monotonic()+100
            while time.monotonic()<deadline:
                if server.poll() is not None: raise RuntimeError('后端提前退出')
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{api_port}/api/health',timeout=1) as r:
                        if json.load(r).get('status')=='ok': break
                except (OSError,urllib.error.URLError): pass
                time.sleep(.25)
            else: raise RuntimeError('后端启动超时')
            roles=request(f'http://127.0.0.1:{api_port}/api/listrolesapi',{})
            assert not next(x for x in roles if x['name']=='商队向导')['unlocked']
            run(['python3',BACKEND/'scripts/smoke.py'],env=env)
            progress=request(f'http://127.0.0.1:{api_port}/api/liststoryprogressapi',{})
            assert sum(bool(x['cleared']) for x in progress)==1
            assert all(x['revealedTitle'] is None for x in progress)
            outcomes=request(f'http://127.0.0.1:{api_port}/api/listoutcomesapi',{})
            assert any(x['kind']=='success' for x in outcomes)
            archives=request(f'http://127.0.0.1:{api_port}/api/listadventuresapi',{})
            old=archives[0]['id']
            new=request(f'http://127.0.0.1:{api_port}/api/createadventureapi',{'name':'抽取验证','role':'调查员','difficulty':'标准','replaceId':old,'confirmReplace':True})
            query="SELECT COALESCE(p.experienced,false) FROM mist_adventures a LEFT JOIN mist_story_progress p ON p.truth=a.state->>'truth' WHERE a.id='"+new['id']+"'"
            result=run(['psql','-h','127.0.0.1','-p',str(pg_port),'-U','mist_test','-d','mist_test','-tAc',query],capture_output=True,text=True)
            assert result.stdout.strip()=='f', '新局没有优先选取未体验剧情'
            patch="UPDATE mist_adventures SET state=state || '{\"hour\":80,\"place\":\"gate\"}'::jsonb WHERE id='"+new['id']+"'"
            run(['psql','-h','127.0.0.1','-p',str(pg_port),'-U','mist_test','-d','mist_test','-c',patch],stdout=subprocess.DEVNULL)
            end=request(f'http://127.0.0.1:{api_port}/api/performactionapi',{'id':new['id'],'action':'move:clinic'})
            assert end['adventure']['sealedEnding']
            progress=request(f'http://127.0.0.1:{api_port}/api/liststoryprogressapi',{})
            assert all(x['experienced'] for x in progress) and sum(x['cleared'] for x in progress)==1
            uncleared=next(x['storyId'] for x in progress if not x['cleared'])
            try:
                request(f'http://127.0.0.1:{api_port}/api/createadventureapi',{'name':'回滚验证','role':'调查员','difficulty':'标准','storyId':uncleared,'replaceId':new['id'],'confirmReplace':True})
                raise AssertionError('未通关剧情不应允许指定')
            except urllib.error.HTTPError as error: assert error.code==409
            request(f'http://127.0.0.1:{api_port}/api/getadventureapi',{'id':new['id']})
            retry=request(f'http://127.0.0.1:{api_port}/api/createadventureapi',{'name':'未通关优先','role':'调查员','difficulty':'标准','replaceId':new['id'],'confirmReplace':True})
            check="SELECT NOT p.cleared FROM mist_adventures a JOIN mist_story_progress p ON p.truth=a.state->>'truth' WHERE a.id='"+retry['id']+"'"
            result=run(['psql','-h','127.0.0.1','-p',str(pg_port),'-U','mist_test','-d','mist_test','-tAc',check],capture_output=True,text=True)
            assert result.stdout.strip()=='t', '未通关剧情没有被优先抽取'
            ai_game=request(f'http://127.0.0.1:{api_port}/api/createadventureapi',{'name':'动态事件验证','role':'调查员','difficulty':'标准','aiEnabled':True,'replaceId':retry['id'],'confirmReplace':True})
            ai_id=ai_game['id']
            for step in ['talk:guard','join:guard','inspect_gate','move:clinic']:
                request(f'http://127.0.0.1:{api_port}/api/performactionapi',{'id':ai_id,'action':step})
            action=request(f'http://127.0.0.1:{api_port}/api/performactionapi',{'id':ai_id,'action':'ask_clinic'})
            assert action['adventure']['aiPause']['kind']=='quest', '动态事件失败应等待手动重试'
            assert action['adventure']['stage']==1 and any(c.startswith('药师证词') for c in action['adventure']['clues']), '生成失败不能撤销玩家刚才的行动'
            snapshot="SELECT state->'aiPause'->>'kind' FROM mist_saves WHERE adventure_id='"+ai_id+"' AND slot=0"
            saved=run(['psql','-h','127.0.0.1','-p',str(pg_port),'-U','mist_test','-d','mist_test','-tAc',snapshot],capture_output=True,text=True)
            assert saved.stdout.strip()=='quest', '阶段存档应记录待重试的动态事件'
            assert request(f'http://127.0.0.1:{api_port}/api/getadventureapi',{'id':ai_id})['aiPause']['kind']=='quest'
            game_map=request(f'http://127.0.0.1:{api_port}/api/getmapapi',{'id':ai_id})
            assert len(game_map)==7 and next(p for p in game_map if p['current'])['id']=='clinic'
            assert not next(p for p in game_map if p['id']=='mine')['routeOpen']
            clock=request(f'http://127.0.0.1:{api_port}/api/getworldclockapi',{'id':ai_id})
            assert clock['day']==1 and clock['absoluteHour']==action['adventure']['hour'] and clock['period']=='上午'
            scene=request(f'http://127.0.0.1:{api_port}/api/getsceneapi',{'id':ai_id})
            assert scene['locationId']=='clinic' and any(p['id']=='guard' for p in scene['peoplePresent'])
            assert 'mine_accident' not in json.dumps(scene) and 'chemical_accident' not in json.dumps(scene)
            assert request(f'http://127.0.0.1:{api_port}/api/listactionsapi',{'id':ai_id})==[], '暂停时不应展示可执行行动'
            try:
                request(f'http://127.0.0.1:{api_port}/api/performactionapi',{'id':ai_id,'action':'move:clinic'})
                raise AssertionError('生成失败时世界不应继续推进')
            except urllib.error.HTTPError as error: assert error.code==409
            assert request(f'http://127.0.0.1:{api_port}/api/generatequestapi',{'id':ai_id})['status']=='failed'
            print('PASS: automatic AI event preserves player action and pauses safely when unavailable')
            late=request(f'http://127.0.0.1:{api_port}/api/createadventureapi',{'name':'过晚撤离','role':'调查员','difficulty':'标准','replaceId':ai_id,'confirmReplace':True})
            late_id=late['id']
            patch="UPDATE mist_adventures SET state=state || '{\"stage\":1,\"hour\":80}'::jsonb WHERE id='"+late_id+"'"
            run(['psql','-h','127.0.0.1','-p',str(pg_port),'-U','mist_test','-d','mist_test','-c',patch],stdout=subprocess.DEVNULL)
            cleared_before=request(f'http://127.0.0.1:{api_port}/api/liststoryprogressapi',{})
            ending=request(f'http://127.0.0.1:{api_port}/api/performactionapi',{'id':late_id,'action':'resolve:evacuate','confirmed':True})
            assert ending['adventure']['sealedEnding'] and '黑雾失控' in ending['message']
            cleared_after=request(f'http://127.0.0.1:{api_port}/api/liststoryprogressapi',{})
            assert [x['cleared'] for x in cleared_before]==[x['cleared'] for x in cleared_after], '过晚撤离不能算通关'
            outcomes=request(f'http://127.0.0.1:{api_port}/api/listoutcomesapi',{})
            assert any(x['characterName']=='过晚撤离' and x['kind']=='failure' for x in outcomes)
            print('PASS: ending actions consume time and a missed deadline records failure')
            print('PASS: isolated startup, role unlock, unexperienced and uncleared priority, replacement rollback, outcome record')
        except Exception:
            log.flush();log.seek(0);print(log.read()[-8000:])
            raise
        finally:
            if server and server.poll() is None:
                os.killpg(server.pid,signal.SIGTERM)
                try: server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(server.pid,signal.SIGKILL);server.wait()
            if started: subprocess.run(['pg_ctl','-D',str(pg),'-w','stop','-m','fast'],stdout=subprocess.DEVNULL,check=True)
            log.close()
if __name__=='__main__': main()

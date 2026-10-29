#!/usr/bin/env python3
"""Real PostgreSQL concurrent-budget checks in a disposable DB; no paid API calls."""
from pathlib import Path
import json,os,subprocess,tempfile,uuid
from dev import ROOT, environment

def main():
    env=environment()
    db='heroes_meter_test_'+uuid.uuid4().hex[:10]
    base=['-h',env.get('DB_HOST','127.0.0.1'),'-p',env.get('DB_PORT','54329'),'-U',env.get('DB_USER','heroes')]
    subprocess.run(['createdb',*base,db],check=True)
    try:
        with tempfile.TemporaryDirectory(prefix='heroes-meter-check-') as directory:
            manifest=Path(directory)/'manifest.json'
            manifest.write_text(json.dumps({'assets':[{'name':'budget-fixture','model':'fixture','status':'succeeded','tokens':995000,'estimatedCny':9.95}]}))
            test_env={**env,'DB_NAME':db,'TOKENHUB_ART_MANIFEST':str(manifest),'TOKENHUB_ROUND_BUDGET_CNY':'10'}
            # No real key reaches this process; these checks never invoke TokenHub.
            test_env.pop('TOKENHUB_API_KEY',None)
            test_env.pop('TOKENHUB_CONFIG_FILE',None)
            test_env.pop('ALIYUN_DASHSCOPE_API_KEY',None)
            test_env.pop('DASHSCOPE_API_KEY',None)
            subprocess.run(['sbt','-batch','Test / runMain services.ai.UsageMeterChecks'],cwd=ROOT/'backend',env=test_env,check=True)
    finally:
        subprocess.run(['dropdb',*base,db],check=True)
    print('PASS: disposable budget-test database removed; no model request made.')

if __name__=='__main__':main()

#!/usr/bin/env python3
"""Live usage-report authorization/accuracy checks. No paid requests."""
import json,uuid
from integration_test import call,check,checks
from dev import ROOT,environment
from pathlib import Path

def main():
    call('GetUsageReportAPI',expect=401)
    check(True,'费用账本拒绝未登录访问')
    suffix=uuid.uuid4().hex[:10]
    a=call('RegisterUserAPI',{'username':'ma_'+suffix,'password':'LocalTest2026!','nickname':'账本测试'})
    b=call('RegisterUserAPI',{'username':'mb_'+suffix,'password':'LocalTest2026!','nickname':'另一位账本测试'})
    report=call('GetUsageReportAPI',token=a['token'])
    check(report['billingConnected'] is False and report['budgetCny']==10,'账本明确未连接平台实扣，并保留10元限额')
    check(report['textEstimatedCny']>=0 and report['textHeldCny']>=0 and 0<=report['remainingCny']<=10,'费用与剩余预算为有效范围')
    manifest=json.loads((ROOT/'frontend/public/assets/guild-v2/manifest.json').read_text())
    expected=sum(v['estimatedCny'] for v in manifest['assets'])
    check(abs(report['assetEstimatedCny']+report['assetHeldCny']-expected)<1e-8,'素材预留与实际manifest一致，不把失败调用记0')
    forged=call('GetUsageReportAPI',{'userId':b['user']['id']},a['token'])
    check(forged['events']==[],'新账户和伪造userId都无法读取已有用户的调用明细')
    env=environment()
    key=env.get('TOKENHUB_API_KEY') or json.loads(Path(env['TOKENHUB_CONFIG_FILE']).read_text())['api_key']
    check(key not in json.dumps(report),'费用响应不泄漏真实API密钥')
    print(json.dumps({'passed':len(checks),'paid_model_calls':0},ensure_ascii=False))

if __name__=='__main__':main()

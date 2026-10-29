#!/usr/bin/env python3
"""Exercise real local HTTP/DB behavior. Creates isolated qa_* accounts, never prints tokens."""
import argparse, concurrent.futures, json, time, urllib.request, urllib.error, uuid
BASE='http://127.0.0.1:8088/api/'
checks=[]
def check(condition,label):
    if not condition:raise AssertionError(label)
    checks.append(label);print('PASS '+label,flush=True)
def call(name,body=None,token=None,expect=200):
    data=dict(body or {})
    if token:data['userToken']=token
    request=urllib.request.Request(BASE+name.lower(),data=json.dumps(data).encode(),headers={'Content-Type':'application/json'},method='POST')
    try:
        with urllib.request.urlopen(request,timeout=15) as response:status=response.status;result=json.loads(response.read())
    except urllib.error.HTTPError as error:status=error.code;result=json.loads(error.read())
    if status!=expect:raise AssertionError(f'{name}: expected HTTP {expect}, got {status}; {result.get("message","") if isinstance(result,dict) else ""}')
    return result
def stages():
    return [{'title':'清空桌面','description':'把物品按用途分组','checklist':['归拢书本','整理杂物'],'minutes':10,'criterion':'桌面清空并完成分类','dependsOn':[]},{'title':'清洁并归位','description':'擦拭后放回常用物品','checklist':['擦拭桌面','有序摆放'],'minutes':10,'criterion':'桌面清洁且物品归位','dependsOn':[0]}]
def draft(token,tier='normal',label='整理书桌',parts=None,job=None,reward=None):
    return call('CreateQuestDraftAPI',{'title':label,'category':'life','description':'本机集成测试创建的数据','dueDate':None,'tier':tier,'stages':parts or stages(),'reward':reward or {'name':'作业书本','story':'固定模式测试奖励，不调用图片模型。','symbol':'book','palette':'sage'},'jobId':job},token)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--ai',action='store_true');args=parser.parse_args()
    suffix=uuid.uuid4().hex[:10]
    a=call('RegisterUserAPI',{'username':'qa_'+suffix,'password':'LocalTest2026!','nickname':'测试勇者'})
    b=call('RegisterUserAPI',{'username':'qb_'+suffix,'password':'LocalTest2026!','nickname':'另一位测试勇者'})
    token=a['token'];other=b['token'];check(a['user']['id']!=b['user']['id'],'注册账户相互独立')
    call('LoginUserAPI',{'username':'qa_'+suffix,'password':'WrongPassword'},expect=401)
    call('GetCurrentUserAPI',{},expect=401);check(True,'未登录与错误密码被拒绝')
    logged=call('LoginUserAPI',{'username':'qa_'+suffix,'password':'LocalTest2026!'});check(logged['user']['id']==a['user']['id'],'登录返回正确账户')
    generated=None;jobid=None
    if args.ai:
        job=call('RequestPlanGenerationAPI',{'goal':'整理书桌，分成两个能立即开始的小阶段','dueDate':None,'dailyMinutes':20,'preference':'温暖手账','feedback':'每个阶段都要有具体完成标准，并设计一个整理主题纪念画。','requestKey':str(uuid.uuid4()),'generateRewardImage':False},token)
        jobid=job['id']
        for _ in range(100):
            job=call('GetGenerationJobAPI',{'jobId':jobid},token)
            if job['status'] in ['succeeded','failed']:break
            time.sleep(1)
        check(job['status']=='succeeded','真实 TokenHub 后台生成成功（未使用模拟结果）')
        generated=job['result'];check(1<=len(generated['stages'])<=5 and bool(generated['reward']['name']),'AI 计划与专属奖励结构有效')
        call('GetGenerationJobAPI',{'jobId':jobid},other,404);check(True,'AI 草案只允许本人读取')
    q=draft(token);qid=q['quest']['id'];s1,s2=[s['id'] for s in q['steps']]
    call('CompleteQuestStepAPI',{'questId':qid,'stepId':s1},token,409);check(True,'草稿不能提前领取奖励')
    call('GetQuestAPI',{'questId':qid,'userId':a['user']['id']},other,404);check(True,'伪造 userId 无法读取他人任务')
    q=call('StartQuestAPI',{'questId':qid},token)
    call('CompleteQuestStepAPI',{'questId':qid,'stepId':s2},token,409);check(True,'前置步骤必须先完成')
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(lambda _:call('CompleteQuestStepAPI',{'questId':qid,'stepId':s1},token),range(6)))
    check(sum(not r['alreadyCompleted'] for r in results)==1,'并发完成同一步骤只记录一次')
    final=call('CompleteQuestStepAPI',{'questId':qid,'stepId':s2},token)
    check(final['detail']['quest']['status']=='completed' and final['rewardUnlocked'] and 'awardedCoins' not in final and 'progress' not in final,'任务通关解锁纪念物，不发放金币或经验')
    dashboard=call('GetDashboardAPI',{},token);check(len(dashboard['rewards'])==1 and 'progress' not in dashboard,'整任务只解锁一件专属纪念物')
    replay=call('CompleteQuestStepAPI',{'questId':qid,'stepId':s2},token);check(replay['alreadyCompleted'] and not replay['rewardUnlocked'],'通关重放不重复解锁')
    for endpoint in ['GetBaseAPI','PurchaseStoreItemAPI','CreateFurniturePreviewAPI','GetPlayerProgressAPI']:
        call(endpoint,{},token,404)
    check(True,'旧的据点、商店、家具及金币接口已关闭')
    for n in range(3):
        d=draft(token,'main','纪念物测试'+str(n),[stages()[0]])
        call('StartQuestAPI',{'questId':d['quest']['id']},token)
        call('CompleteQuestStepAPI',{'questId':d['quest']['id'],'stepId':d['steps'][0]['id']},token)
    check(len(call('GetDashboardAPI',{},token)['rewards'])==4,'多次完成任务均解锁纪念物')
    call('ArchiveQuestAPI',{'questId':qid},token)
    restored=call('RestoreQuestAPI',{'questId':qid},token);check(restored['quest']['status']=='completed' and all(s['completedAt'] for s in restored['steps']),'归档恢复保留通关记录')
    f=draft(token,label='专注测试');call('StartQuestAPI',{'questId':f['quest']['id']},token)
    focus=call('StartFocusAPI',{'stepId':f['steps'][0]['id'],'minutes':10},token)
    check(focus['session']['status']=='running','专注会话由服务端创建')
    call('StartFocusAPI',{'stepId':None,'minutes':10},token,409)
    call('FinishFocusAPI',{'elapsedSeconds':999999999},token,409);check(True,'不能开多个专注或通过伪造时间提前完成')
    paused=call('PauseFocusAPI',{},token);check(paused['session']['status']=='paused' and paused['session']['runningSince'] is None,'暂停结算时间并停止计时')
    resumed=call('ResumeFocusAPI',{},token);check(resumed['session']['status']=='running','专注可恢复')
    abandoned=call('AbandonFocusAPI',{},token);check(abandoned['session']['status']=='abandoned' and abandoned['session']['endedAt'] is not None,'提前结束仍保留实际专注记录')
    dashboard=call('GetDashboardAPI',{},token);check(dashboard['completedCount']==4 and len(dashboard['week'])==7,'成长统计来自真实完成记录')
    updated=call('UpdateProfileAPI',{'nickname':'慢慢前进的勇者','avatar':'star','dailyGoal':4,'focusMinutes':10},token);check(updated['dailyGoal']==4,'个人偏好保存成功')
    new_login=call('LoginUserAPI',{'username':'qa_'+suffix,'password':'LocalTest2026!'})
    persisted=call('GetDashboardAPI',{},new_login['token']);check(len(persisted['rewards'])==4,'重新登录后纪念物保留')
    call('LogoutUserAPI',{},token);call('GetCurrentUserAPI',{},new_login['token'],401);check(True,'退出登录后已有会话令牌失效')
    print(json.dumps({'passed':len(checks),'ai_tested':bool(generated),'account_prefix':'qa_'+suffix,'note':'隔离测试账户保留在本项目开发数据库，不影响其他数据库。'},ensure_ascii=False),flush=True)
if __name__=='__main__':main()

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
    return call('CreateQuestDraftAPI',{'title':label,'category':'life','description':'本机集成测试创建的数据','dueDate':None,'tier':tier,'stages':parts or stages(),'reward':reward or {'name':'小小整理家','story':'纪念你给生活留出一点整洁的空间。','symbol':'leaf','palette':'sage'},'jobId':job},token)
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
        job=call('RequestPlanGenerationAPI',{'goal':'整理书桌，分成两个能立即开始的小阶段','dueDate':None,'dailyMinutes':20,'preference':'温暖手账','feedback':'每个阶段都要有具体完成标准，并设计一个整理主题纪念画。','requestKey':str(uuid.uuid4())},token)
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
    check(sum(r['awardedCoins'] for r in results)==10 and sum(not r['alreadyCompleted'] for r in results)==1,'并发完成同一步骤只结算一次')
    final=call('CompleteQuestStepAPI',{'questId':qid,'stepId':s2},token)
    check(final['detail']['quest']['status']=='completed' and final['progress']['coins']==20 and final['progress']['experience']==40,'任务通关与经验/金币同一事务到账')
    base=call('GetBaseAPI',{},token);check(len(base['rewards'])==1,'整任务只解锁一件专属纪念物')
    call('PurchaseStoreItemAPI',{'itemId':'desk'},token,409);check(call('GetPlayerProgressAPI',{},token)['coins']==20,'余额不足时不扣款')
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        purchases=list(pool.map(lambda _:call('PurchaseStoreItemAPI',{'itemId':'lamp'},token),range(6)))
    base=call('GetBaseAPI',{},token);check(base['progress']['coins']==5 and len(base['owned'])==1,'并发重复购买只扣一次款并持有一件物品')
    own=base['owned'][0]['id'];reward_id=base['rewards'][0]['id']
    call('PlaceItemAPI',{'slot':'wall','itemId':own,'rewardId':None},token)
    call('PlaceItemAPI',{'slot':'other-placement','itemId':own,'rewardId':None},other,403)
    call('PlaceItemAPI',{'slot':'wall','itemId':own,'rewardId':None},token)
    call('PlaceItemAPI',{'slot':'free-reward','itemId':None,'rewardId':reward_id},token)
    base=call('GetBaseAPI',{},token);check(len(base['placements'])==2,'自由画布校验素材归属并持久化布置')
    replay=call('CompleteQuestStepAPI',{'questId':qid,'stepId':s2},token);check(replay['alreadyCompleted'] and replay['progress']['coins']==5,'通关重放不重复领奖')
    for n in range(3):
        d=draft(token,'main','每日奖励测试'+str(n),[stages()[0]])
        call('StartQuestAPI',{'questId':d['quest']['id']},token)
        call('CompleteQuestStepAPI',{'questId':d['quest']['id'],'stepId':d['steps'][0]['id']},token)
    progress=call('GetPlayerProgressAPI',{},token);check(progress['todayCoins']==60 and progress['experience']==120 and progress['coins']==45,'每日奖励上限由服务端执行，消费不重置上限')
    check(len(call('GetBaseAPI',{},token)['rewards'])==4,'达到货币上限仍解锁任务纪念物')
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
    persisted=call('GetBaseAPI',{},new_login['token']);check(persisted['progress']['coins']==45 and len(persisted['placements'])==2,'重新登录后余额和房间存档保留')
    call('LogoutUserAPI',{},token);call('GetCurrentUserAPI',{},new_login['token'],401);check(True,'退出登录后已有会话令牌失效')
    print(json.dumps({'passed':len(checks),'ai_tested':bool(generated),'account_prefix':'qa_'+suffix,'note':'隔离测试账户保留在本项目开发数据库，不影响其他数据库。'},ensure_ascii=False),flush=True)
if __name__=='__main__':main()

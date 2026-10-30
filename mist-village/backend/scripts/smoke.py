import json
import os
import urllib.request
import urllib.error
BASE=os.environ.get('MIST_TEST_API_URL','http://127.0.0.1:8089/api/')
def post(endpoint, data, status=200):
    request=urllib.request.Request(BASE+endpoint, json.dumps(data,ensure_ascii=False).encode(), {'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=10) as response:
            assert response.status==status
            return json.load(response)
    except urllib.error.HTTPError as error:
        assert error.code==status, (error.code,error.read())
        return json.load(error)
a=post('createadventureapi',{'name':'测试旅人','role':'调查员','difficulty':'标准'})
assert 'truth' not in a and 'seed' not in a
id=a['id']
post('performactionapi',{'id':id,'action':'move:forest'})
post('saveadventureapi',{'id':id,'slot':1},409)
post('loadadventureapi',{'id':id,'slot':0})
post('saveadventureapi',{'id':id,'slot':1})
post('performactionapi',{'id':id,'action':'move:forest'})
first=post('performactionapi',{'id':id,'action':'search_forest'})
post('loadadventureapi',{'id':id,'slot':1})
post('performactionapi',{'id':id,'action':'move:forest'})
second=post('performactionapi',{'id':id,'action':'search_forest'})
assert first['die']==second['die'] and first['adventure']==second['adventure']
print('PASS: secret fields hidden, safe-place save, restore, deterministic dice')
b=post('createadventureapi',{'name':'调查者','role':'前矿工','difficulty':'标准'})
id=b['id']
def act(action):
    return post('performactionapi',{'id':id,'action':action,'confirmed':action.startswith('resolve:')})
act('inspect_gate'); act('move:clinic')
r=act('ask_clinic'); assert r['adventure']['stage']==1
saved=post('loadadventureapi',{'id':id,'slot':0}); assert saved['stage']==1
options=post('listgrowthoptionsapi',{'id':id})
assert next(x for x in options if x['id']=='agility')['available'] and not next(x for x in options if x['id']=='mediator')['available']
grown=post('spendgrowthapi',{'id':id,'choice':'agility'}); assert grown['stats']['agility']==1 and grown['stats']['growthPoints']==0
act('move:hall'); act('buy:oil'); act('read_report'); act('move:gate'); act('secure_permit'); act('move:mine')
r=act('inspect_mine'); assert r['adventure']['stage']==2
act('prepare:careful')
r=act('resolve:contain'); assert r['adventure']['stage']==3 and r['adventure']['sealedEnding']
post('loadadventureapi',{'id':id,'slot':0},409)
post('performactionapi',{'id':id,'action':'rest'},409)
print('PASS: clue gating, phase autosave, ending and seal')
c=post('createadventureapi',{'name':'药师朋友','role':'流浪医师','difficulty':'故事','aiEnabled':True})
id=c['id']
def cact(action): return post('performactionapi',{'id':id,'action':action})['adventure']
cact('move:clinic'); c=cact('talk:healer')
assert c['npcs'][0]['name']=='药师林婆' and c['npcs'][0]['attitude']=='中立' and 'trust' not in c['npcs'][0]
c=cact('accept:herbs'); assert c['quests'][0]['status']=='active'
c=cact('pause:herbs'); assert c['quests'][0]['status']=='paused'
c=cact('resume:herbs'); assert c['quests'][0]['status']=='active'
cact('move:forest'); c=cact('gather:herbs'); cact('move:clinic'); c=cact('deliver:herbs')
assert c['quests'][0]['status']=='completed' and c['npcs'][0]['attitude']=='友善' and any(x['id']=='filter' and x['quantity']==1 for x in c['items'])
post('performactionapi',{'id':id,'action':'deliver:herbs'},400)
print('PASS: NPC interaction, quest, pause, delivery, AI missing configuration fails closed')

failed=post('proposeactionapi',{'id':id,'input':'查看告示'})
assert failed['status']=='failed'
after=post('getadventureapi',{'id':id})
assert after['aiPause']['kind']=='action'
post('performactionapi',{'id':id,'action':'move:gate'},409)
post('generatequestapi',{'id':id},409)
failed_again=post('proposeactionapi',{'id':id,'input':'查看告示'})
assert failed_again['status']=='failed'
assert post('getadventureapi',{'id':id})['hour']==after['hour']
print('PASS: AI failure pauses world, allows reading and same-request retry without advancing time')

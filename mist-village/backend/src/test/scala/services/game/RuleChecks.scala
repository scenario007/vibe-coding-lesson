package services.game
import cats.effect.{IO,IOApp}
import services.game.objects.*
import services.game.utils.{Rules,OutcomeSummary}
object RuleChecks extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val npc=NpcState.initial.map(n => if n.id=="healer" then n.copy(met=true,lastKnownPlace="clinic") else n)
    val q=Quest("q1","调查请求",QuestStatus.offered,Some(30),"查看告示",Some("inspect_gate"),Some("healer"),Some("trust"))
    val a=Adventure("a","旅人","调查员","标准","mine_accident",1,9,"clinic",100,0,Nil,Nil,0,false,npc,List(q),true)
    val accepted=Rules.perform(a,"accept:q1").toOption.get._1
    assert(accepted.quests.head.status==QuestStatus.active)
    val atGate=Rules.perform(accepted,"move:gate").toOption.get._1
    val outcome=Rules.perform(atGate,"inspect_gate").toOption.get
    val result=Rules.applyQuestRewards(atGate,outcome._1,"inspect_gate",outcome._3,outcome._4,outcome._5)
    assert(result.quests.head.status==QuestStatus.completed)
    assert(result.npcs.find(_.id=="healer").get.trust==55)
    val filterQuest=q.copy(id="filter-test",status=QuestStatus.active,reward=Some("filter"))
    val before=atGate.copy(quests=List(filterQuest))
    val next=Rules.perform(before,"inspect_gate").toOption.get
    val filtered=Rules.applyQuestRewards(before,next._1,"inspect_gate",next._3,next._4,next._5)
    assert(filtered.items.exists(i=>i.id=="filter" && i.quantity==1))
    val conclusion=Rules.perform(filtered.copy(stage=1),"resolve:water").toOption.get._1
    assert(conclusion.sealedEnding && conclusion.hour==filtered.hour+2 && !conclusion.items.exists(_.id=="filter"))
    val tooLate=Rules.perform(filtered.copy(stage=1,hour=80),"resolve:water").toOption.get._1
    assert(tooLate.sealedEnding && tooLate.events.last.contains("黑雾扩散失控"))
    val wrongPlace=Rules.perform(a.copy(place="forest"),"accept:q1")
    assert(wrongPlace.isLeft)
    assert(!AdventureView.from(a).toString.contains("mine_accident"))
    val search=a.copy(place="forest")
    assert(Rules.roll(search,"search_forest")==Rules.roll(search.copy(hour=17,clues=List("无关线索")),"search_forest"))
    val possible=(1L to 100L).map(seed=>a.copy(seed=seed,place="mine",health=1,hour=80)).find(v => Rules.roll(v,"hazard:cross")<14).get
    val pending=Rules.perform(possible.copy(hour=70),"hazard:cross").toOption.get._1
    assert(pending.pendingRecovery.nonEmpty && Rules.perform(pending,"move:gate").isLeft)
    val death=Rules.perform(pending,"recover:accept").toOption.get._1
    assert(death.dead && !death.sealedEnding && Rules.perform(death,"rest").isLeft)
    assert(death.stage != 3)
    val visitor=NpcState("visitor:courier","货运员林","gate",50,true,Nil,"gate",contacts=List("guard"))
    val visited=a.copy(place="gate",clues=List("村口告示"),npcs=NpcState.initial :+ visitor)
    assert(Rules.perform(visited,"share:visitor:courier:0").toOption.get._1.npcs.last.facts.exists(_.text=="村口告示"))
    val both=NpcState.initial.map(n=>if Set("smith","guard").contains(n.id) then n.copy(met=true,lastKnownPlace="gate",knownTrust=Some(50)) else n)
    val factStart=a.copy(place="gate",clues=List("封锁告示：矿洞因安全事故关闭。"),npcs=both)
    val shared=Rules.perform(factStart,"share:smith:0").toOption.get._1
    val later=Rules.perform(shared,"move:clinic").toOption.get._1
    assert(later.npcs.find(_.id=="guard").get.facts.exists(_.source=="铁匠阿岚"))
    assert(!AdventureView.from(later).npcs.find(_.id=="guard").get.knownMemories.exists(_.contains("封锁告示")))
    val returned=Rules.perform(later,"move:gate").toOption.get._1
    val conversation=Rules.perform(returned,"ask:knowledge:guard").toOption.get
    assert(conversation._2.contains("铁匠阿岚"))
    val guardWithRumor=NpcState.initial.map(n=>if n.id=="guard" then n.copy(met=true,facts=List(NpcFact("玩家攻击了铁匠阿岚","药师林婆"))) else n)
    val hiddenFactor=a.copy(place="gate",npcs=guardWithRumor)
    assert(Rules.unknownFactor(hiddenFactor,"persuade:guard"))
    assert(Rules.perform(hiddenFactor.copy(stage=1,clues=List("矿洞报告：事故前曾出现异常警报。")),"secure_permit").isLeft)
    val candidate=(1L to 1000L).map(seed=>hiddenFactor.copy(seed=seed)).find(v=>Rules.roll(v,"persuade:guard")==14).get
    val hiddenAttempt=Rules.perform(candidate,"persuade:guard").toOption.get
    assert(hiddenAttempt._3.contains(14) && hiddenAttempt._4.contains(0) && !hiddenAttempt._1.events.contains("获得矿洞通行许可"))
    val disclosed=Rules.perform(candidate,"ask:knowledge:guard").toOption.get._1
    assert(!Rules.unknownFactor(disclosed,"persuade:guard"))
    assert(Rules.perform(disclosed,"persuade:guard").toOption.get._4.contains(-2))
    val known=NpcState.initial.map(n => if n.id=="smith" then n.copy(met=true,place="mine",lastKnownPlace="gate",trust=20,knownTrust=Some(50),condition=NpcCondition.injured,knownCondition=Some(NpcCondition.healthy)) else n)
    val publicNpc=AdventureView.from(a.copy(npcs=known)).npcs.find(_.id=="smith").get
    assert(publicNpc.lastKnownPlace=="gate" && publicNpc.attitude=="中立" && publicNpc.knownCondition.contains(NpcCondition.healthy))
    val recap=OutcomeSummary.describe(a.copy(npcs=known,events=List("村民撤离。")))
    assert(recap.startsWith("村民撤离。") && recap.contains("铁匠阿岚（中立）") && !recap.contains("受伤"))
    val promise=Quest("late","采集药草",QuestStatus.paused,Some(10),"寻找药草",issuer=Some("healer"))
    val awareHealer=npc.map(n=>if n.id=="healer" then n.copy(trust=45,knownTrust=Some(45)) else n)
    val delayed=Rules.perform(a.copy(quests=List(promise),hour=10,npcs=awareHealer),"move:gate").toOption.get._1
    assert(delayed.quests.head.status==QuestStatus.expired && delayed.npcs.find(_.id=="healer").exists(n=>n.trust==35 && n.knownTrust.contains(45)))
    val heard=Rules.perform(delayed.copy(place="clinic"),"talk:healer").toOption.get
    assert(heard._2.contains("未能按期完成") && AdventureView.from(heard._1).npcs.find(_.id=="healer").exists(_.attitude=="戒备"))
    assert(!Rules.perform(heard._1,"talk:healer").toOption.get._2.contains("未能按期完成"))
    val offered=promise.copy(status=QuestStatus.offered)
    assert(Rules.perform(a.copy(quests=List(offered),hour=10),"move:gate").toOption.get._1.npcs.find(_.id=="healer").exists(_.trust==50))
    val metSmith=a.copy(place="gate",npcs=NpcState.initial.map(n => if n.id=="smith" then n.copy(met=true,lastKnownPlace="gate") else n))
    val joined=Rules.perform(metSmith,"join:smith").toOption.get._1
    assert(joined.companion.contains("smith"))
    val away=Rules.perform(joined,"move:forest").toOption.get._1
    assert(away.npcs.find(_.id=="smith").get.place=="forest")
    assert(Rules.perform(away,"leave_companion").isLeft)
    assert(Rules.perform(away,"join:guard").isLeft)
    val critical=(1L to 1000L).map(seed=>a.copy(seed=seed,place="forest")).find(v=>Rules.roll(v,"search_forest")==20).get
    val lucky=Rules.perform(critical,"search_forest").toOption.get._1
    assert(lucky.items.find(_.id=="food").get.quantity==3)
    val repeat=Rules.perform(lucky,"search_forest").toOption.get._1
    assert(repeat.items.find(_.id=="food").get.quantity==3)
    val early=Rules.perform(a.copy(place="gate",hour=20),"move:forest").toOption.get._1
    val foggy=Rules.perform(a.copy(place="gate",hour=40),"move:forest").toOption.get._1
    assert(early.hour==22 && foggy.hour==43)
    val forest=a.copy(place="forest")
    val begun=Rules.perform(forest,"start:beast").toOption.get._1
    assert(begun.battle.nonEmpty && Rules.perform(begun,"move:gate").isLeft)
    val fledSeed=(1L to 1000L).map(seed=>begun.copy(seed=seed)).find(v=>Rules.roll(v,"combat:flee:1")+PlayerStats.forRole(v.role).agility>=12).get
    val fled=Rules.perform(fledSeed,"combat:flee").toOption.get._1
    assert(fled.battle.isEmpty && fled.hour==begun.hour+1)
    val winSeed=(1L to 1000L).map(seed=>begun.copy(seed=seed,battle=Some(Battle("野兽",1,20,1)))).find(v=>Rules.roll(v,"combat:attack:1")+PlayerStats.forRole(v.role).body>=11).get
    val win=Rules.perform(winSeed,"combat:attack").toOption.get._1
    assert(win.battle.isEmpty && win.clues.exists(_.startsWith("矿工布条")))
    val luckyStrike=(1L to 1000L).map(seed=>begun.copy(seed=seed,battle=Some(Battle("野兽",20,20,1)))).find(v=>Rules.roll(v,"combat:attack:1")==20).get
    val criticalHit=Rules.perform(luckyStrike,"combat:attack").toOption.get
    assert(criticalHit._1.battle.isEmpty && criticalHit._2.contains("双倍伤害"))
    val unluckyStrike=(1L to 1000L).map(seed=>begun.copy(seed=seed)).find(v=>Rules.roll(v,"combat:attack:1")==1).get
    val criticalMiss=Rules.perform(unluckyStrike,"combat:attack").toOption.get
    assert(criticalMiss._1.health<unluckyStrike.health && criticalMiss._2.contains("破绽"))
    val camp=a.copy(place="camp",hour=50,campSafeUntil=57)
    assert(Rules.perform(camp,"rest").isRight)
    val unsafe=camp.copy(hour=57)
    assert(Rules.perform(unsafe,"rest").isLeft)
    val tested=(1L to 100L).map(seed=>unsafe.copy(seed=seed)).find(v => Rules.roll(v,"clear:camp")>=11).get
    val cleared=Rules.perform(tested,"clear:camp").toOption.get._1
    assert(Rules.perform(cleared,"rest").isRight)
    val unattended=a.copy(place="gate",hour=35,npcs=NpcState.initial)
    val departure=Rules.perform(unattended,"move:forge").toOption.get._1
    assert(departure.npcs.find(_.id=="smith").exists(_.expeditionStarted.nonEmpty))
    val lateExpedition=Rules.perform(departure.copy(hour=72),"rest").toOption.get._1
    assert(lateExpedition.npcs.find(_.id=="smith").exists(_.condition==NpcCondition.deceased))
    assert(!AdventureView.from(lateExpedition).npcs.exists(_.id=="smith"))
    val inspect=Rules.perform(lateExpedition.copy(place="mine"),"inspect:smith").toOption.get._1
    assert(inspect.clues.exists(_.startsWith("矿灯与记录仍在")))
    val minerStart=a.copy(place="mine",stage=1,hour=50,events=List("你在矿洞深处听到微弱的求救声。"))
    val rescuedMiner=Rules.perform(minerStart,"rescue:miner").toOption.get._1
    assert(rescuedMiner.minerStatus==MinerStatus.rescued && rescuedMiner.knownMinerStatus==MinerStatus.rescued)
    assert(!rescuedMiner.items.exists(_.id=="medicine"))
    val clinicRescue=rescuedMiner.copy(place="clinic",npcs=npc)
    val rescueIndex=clinicRescue.clues.indexOf("救援记录：失踪矿工已获救。")
    val toldHealer=Rules.perform(clinicRescue,s"share:healer:$rescueIndex").toOption.get._1
    val aid=Rules.perform(toldHealer,"ask:aid:healer").toOption.get._1
    assert(aid.items.find(_.id=="medicine").exists(_.quantity==1) && Rules.perform(aid,"ask:aid:healer").isLeft)
    val lateMiner=minerStart.copy(hour=68)
    val lostMiner=Rules.perform(lateMiner,"rescue:miner").toOption.get._1
    assert(lostMiner.minerStatus==MinerStatus.lost && lostMiner.knownMinerStatus==MinerStatus.lost)
    val hiddenLoss=lateMiner.copy(hour=70,minerStatus=MinerStatus.lost,knownMinerStatus=MinerStatus.missing)
    assert(AdventureView.from(hiddenLoss).knownMinerStatus==MinerStatus.missing)
    val injuredSmith=NpcState.initial.map(n=>if n.id=="smith" then n.copy(place="mine",condition=NpcCondition.injured,expeditionStarted=Some(36)) else n)
    val rescueStart=a.copy(place="mine",hour=49,npcs=injuredSmith)
    val rescued=Rules.perform(rescueStart,"rescue:smith").toOption.get._1
    assert(rescued.place=="forge" && rescued.npcs.find(_.id=="smith").exists(n=>n.place=="forge" && n.condition==NpcCondition.healthy))
    val deadSmith=NpcState.initial.map(n=>if n.id=="smith" then n.copy(condition=NpcCondition.deceased,place="gate") else n)
    val afterDeath=Rules.perform(a.copy(place="clinic",hour=40,npcs=deadSmith),"move:gate").toOption.get._1
    assert(afterDeath.npcs.find(_.id=="smith").exists(n=>n.condition==NpcCondition.deceased && n.place=="gate"))
    val noHealer=NpcState.initial.map(n=>if n.id=="healer" then n.copy(condition=NpcCondition.deceased) else n)
    val records=Rules.perform(a.copy(place="clinic",npcs=noHealer),"inspect:clinic_records").toOption.get._1
    assert(records.clues.exists(_.startsWith("诊所记录")))
    for (truth,expected) <- List(("mine_accident","档案残页"),("chemical_accident","药剂账册")) do
      val archive=Rules.perform(a.copy(place="hall",stage=1,truth=truth,clues=Nil),"inspect:archive").toOption.get._1
      assert(archive.clues.exists(_.startsWith(expected)) && Evidence.fromText(archive.clues.last,Some(archive.hour)).kind==EvidenceKind.document)
      val gate=Rules.perform(archive,"move:gate").toOption.get._1
      val permitted=Rules.perform(gate,"secure_permit").toOption.get._1
      val mine=Rules.perform(permitted,"move:mine").toOption.get._1
      val investigated=Rules.perform(mine,"inspect_mine").toOption.get._1
      assert(investigated.stage==2 && !investigated.clues.exists(_.startsWith("矿洞报告")))
      assert(Rules.perform(investigated,"resolve:contain").isLeft)
      val prepared=Rules.perform(investigated,"prepare:careful").toOption.get._1
      assert(prepared.hour==investigated.hour+4 && prepared.events.contains("已准备控制污染源"))
      assert(Rules.perform(prepared,"prepare:careful").isLeft)
      val risky=(1L to 100L).map(seed=>investigated.copy(seed=seed)).find(v=>Rules.roll(v,"prepare:quick")+PlayerStats.forRole(v.role).body<13).get
      val failedPrep=Rules.perform(risky,"prepare:quick").toOption.get._1
      assert(failedPrep.pendingRecovery.nonEmpty && !failedPrep.events.contains("已准备控制污染源"))
    val deadGuard=NpcState.initial.map(n=>if n.id=="guard" then n.copy(condition=NpcCondition.deceased) else n)
    val open=Rules.perform(a.copy(place="gate",stage=1,npcs=deadGuard),"open_gate").toOption.get._1
    assert(Rules.perform(open,"move:mine").isRight)
    val smithTalk=Rules.perform(a.copy(place="gate",quests=Nil),"talk:smith").toOption.get._1
    assert(smithTalk.quests.exists(q=>q.id=="smith_map" && q.status==QuestStatus.offered))
    val crowded=smithTalk.copy(place="clinic")
    assert(!Rules.perform(crowded,"talk:healer").toOption.get._1.quests.exists(_.id=="herbs"))
    assert(Rules.perform(crowded,"accept:herbs").isLeft)
    val declined=Rules.perform(crowded,"decline:smith_map").toOption.get._1
    assert(declined.quests.find(_.id=="smith_map").exists(_.status==QuestStatus.declined))
    assert(Rules.perform(declined,"talk:healer").toOption.get._1.quests.exists(q=>q.id=="herbs" && q.status==QuestStatus.offered))
    val full=List.tabulate(3)(i=>q.copy(id=s"active-$i",status=QuestStatus.active))
    assert(!Rules.perform(a.copy(place="clinic",quests=full),"talk:healer").toOption.get._1.quests.exists(_.id=="herbs"))
    val smithAccept=Rules.perform(smithTalk,"accept:smith_map").toOption.get._1
    val smithForge=Rules.perform(smithAccept,"move:forge").toOption.get._1
    val foundMap=Rules.perform(smithForge,"find:smith_map").toOption.get._1
    val backGate=Rules.perform(foundMap,"move:gate").toOption.get._1
    val doneMap=Rules.perform(backGate,"deliver:smith_map").toOption.get._1
    assert(doneMap.quests.exists(q=>q.id=="smith_map" && q.status==QuestStatus.completed))
    assert(doneMap.items.find(_.id=="oil").exists(_.quantity==2))
    val bypass=Rules.perform(doneMap.copy(place="forest",stage=1),"move:mine_via_map").toOption.get._1
    assert(bypass.place=="mine" && !bypass.events.contains("获得矿洞通行许可"))
    val miaTalk=Rules.perform(a.copy(place="forge",quests=Nil),"talk:mia").toOption.get._1
    val miaAccept=Rules.perform(miaTalk,"accept:mia_letter").toOption.get._1
    val miaForest=Rules.perform(miaAccept,"move:forest").toOption.get._1
    val letter=Rules.perform(miaForest,"find:mia_letter").toOption.get._1
    val miaBack=Rules.perform(letter,"move:forge").toOption.get._1
    assert(Rules.perform(miaBack,"deliver:mia_letter").toOption.get._1.quests.exists(q=>q.id=="mia_letter" && q.status==QuestStatus.completed))
    val merchantTalk=Rules.perform(a.copy(place="hall",quests=Nil),"talk:merchant").toOption.get._1
    val merchantAccept=Rules.perform(merchantTalk,"accept:merchant_supply").toOption.get._1
    val campTrip=Rules.perform(merchantAccept,"move:camp").toOption.get._1
    val parcel=Rules.perform(campTrip,"find:merchant_supply").toOption.get._1
    val merchantBack=Rules.perform(parcel,"move:hall").toOption.get._1
    val delivered=Rules.perform(merchantBack,"deliver:merchant_supply").toOption.get._1
    assert(delivered.money==a.money+3 && delivered.items.find(_.id=="oil").exists(_.quantity==2))
    val shop=a.copy(place="hall",money=10)
    val deceasedMerchant=shop.copy(npcs=shop.npcs.map(n=>if n.id=="merchant" then n.copy(condition=NpcCondition.deceased) else n))
    assert(Rules.perform(deceasedMerchant,"buy:medicine").isLeft)
    val first=Rules.perform(shop,"buy:medicine").toOption.get._1
    assert(first.money==5 && first.items.find(_.id=="medicine").exists(_.quantity==2))
    val second=Rules.perform(first,"buy:medicine").toOption.get._1
    assert(second.money==0 && second.merchantStock.find(_.id=="medicine").exists(_.quantity==0))
    assert(Rules.perform(second.copy(money=10),"buy:medicine").isLeft)
    println("PASS: dynamic request, place check, reward, hidden truth, fixed stock")
  }

package services.game.utils
import services.game.objects.*
import services.system.objects.AppError
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

private[game] object Rules:
  private[game] val prices=Map("medicine" -> 5,"food" -> 2,"oil" -> 3,"rare_medicine" -> 8)
  private def quantity(a: Adventure, id: String): Int = a.items.find(_.id==id).fold(0)(_.quantity)
  private def adjust(a: Adventure, id: String, delta: Int): Adventure =
    val n=quantity(a,id)+delta
    a.copy(items=a.items.filterNot(_.id==id) ++ (if n>0 then List(ItemStack(id,n)) else Nil))
  private val places = Locations.all
  private val safe = Locations.village
  private val gateClue = "封锁告示：矿洞因安全事故关闭。"
  private val clinicClue = "药师证词：症状在矿洞事故后出现，净化水暂时有用。"
  private val clinicRecordClue = "诊所记录：药师记载症状在矿洞事故后出现，净化水暂时有用。"
  private val rescueClue = "救援记录：失踪矿工已获救。"
  private val reportClue = "矿洞报告：事故前曾出现异常警报。"
  private val forestClue = "森林足迹：有人近期从森林走向矿洞。"
  private val mineClue = "矿洞记录：近期安全报告被人压下，地下气体正在泄漏。"
  private val chemicalClue = "矿洞记录：污染处理药剂曾流入地下，随后出现刺激性黑雾。"
  private val mineArchive = "档案残页：事故前，矿洞通风维修申请曾被搁置。"
  private val chemicalArchive = "药剂账册：事故前，一批污染处理药剂被运往地下。"
  private[game] def hasInquiryRecord(a: Adventure): Boolean =
    a.clues.exists(c=>c==reportClue || c==mineArchive || c==chemicalArchive)

  private[game] def roll(a: Adventure, action: String): Int =
    val state = s"${a.seed}|${a.place}|${a.health}|${a.fatigue}|$action"
    val hash = MessageDigest.getInstance("SHA-256").digest(state.getBytes(StandardCharsets.UTF_8))
    (BigInt(1,hash) % 20).toInt + 1

  private[game] def advance(a: Adventure): Adventure =
    val nextStage = if a.stage == 0 && a.clues.contains(gateClue) && (a.clues.contains(clinicClue) || a.clues.contains(clinicRecordClue)) then 1
      else if a.stage == 1 && hasInquiryRecord(a) && a.clues.exists(c => c == mineClue || c == chemicalClue) then 2
      else a.stage
    val expired = a.quests.map(q => if Set(QuestStatus.offered,QuestStatus.active,QuestStatus.paused).contains(q.status) && q.deadline.exists(a.hour > _) then q.copy(status=QuestStatus.expired) else q)
    val missed=a.quests.filter(q=>Set(QuestStatus.active,QuestStatus.paused).contains(q.status) && q.deadline.exists(a.hour > _))
    val disappointed=a.npcs.map { n =>
      val promises=missed.filter(_.issuer.contains(n.id))
      if promises.isEmpty || n.condition==NpcCondition.deceased then n
      else n.copy(trust=math.max(0,n.trust-10*promises.size),facts=n.facts ++ promises.map(q=>NpcFact(s"玩家未能按期完成请求：${q.title}。","亲身经历")))
    }
    val moved = disappointed.map { n =>
      if n.id != "smith" || a.companion.contains(n.id) || n.condition==NpcCondition.deceased then n
      else
        val returned=if n.condition==NpcCondition.healthy && n.expeditionStarted.isEmpty && a.hour>=24 && a.hour<36 then n.copy(place="forge") else n
        val leaving=if returned.condition==NpcCondition.healthy && returned.expeditionStarted.isEmpty && a.hour>=36 && !returned.memories.contains("玩家救助了我") && !returned.facts.exists(_.text==rescueClue) then returned.copy(place="mine",expeditionStarted=Some(a.hour)) else returned
        val elapsed=leaving.expeditionStarted.map(a.hour-_).getOrElse(0)
        if elapsed>=36 then leaving.copy(condition=NpcCondition.deceased)
        else if elapsed>=12 then leaving.copy(condition=NpcCondition.injured)
        else leaving
    }
    val relationships=Set(("smith","guard"),("guard","mayor"),("healer","mayor"),("mia","smith"),("merchant","guard"))
    val informed=moved.map { listener =>
      val learned=moved.filter(speaker=>speaker.id!=listener.id && speaker.place==listener.place && speaker.condition!=NpcCondition.deceased && listener.condition!=NpcCondition.deceased && (relationships.contains((speaker.id,listener.id)) || speaker.contacts.contains(listener.id) || listener.contacts.contains(speaker.id)))
        .flatMap(speaker=>speaker.facts.map(f=>NpcFact(f.text,speaker.name)))
        .filterNot(f=>listener.facts.exists(_.text==f.text))
        .groupBy(_.text).values.map(_.head).toList.sortBy(_.text)
      listener.copy(facts=listener.facts ++ learned)
    }
    val warning1="雾开始蔓延到村庄外围，空气里的刺激气味更重了。"
    val warning2="雾已逼近村庄，留给大家行动的时间正在减少。"
    val visibleWarnings=List((33,warning1),(57,warning2)).filter((at,message)=>a.hour>=at && !a.events.contains(message)).map(_._2)
    val miner=if a.hour>=69 && a.minerStatus==MinerStatus.missing then MinerStatus.lost else a.minerStatus
    val prepared = a.copy(stage=nextStage, quests=expired, npcs=informed, events=a.events ++ visibleWarnings,minerStatus=miner)
    if a.dead then prepared
    else if a.hour >= 81 && !a.sealedEnding then prepared.copy(stage=3,sealedEnding=true,events=prepared.events :+ "黑雾扩散失控，村庄被迫撤离。")
    else prepared

  private def guardFact(a: Adventure): Option[NpcFact] = a.npcs.find(_.id=="guard").flatMap(_.facts.find(_.text.startsWith("玩家攻击")))
  private def guardFactKnown(a: Adventure, fact: NpcFact): Boolean = fact.source=="玩家" || a.dialogue.exists(d=>d.speaker=="守卫罗恩" && d.text.contains(fact.text))
  private[game] def unknownFactor(a: Adventure, action: String): Boolean = action=="persuade:guard" && guardFact(a).exists(f=> !guardFactKnown(a,f))
  private def addClue(a: Adventure, clue: String, hours: Int): (Adventure,String,Option[Int],Option[Int],Option[Int]) =
    if a.clues.contains(clue) then (a,"你已经记录了这条线索。",None,None,None)
    else (advance(a.copy(hour=a.hour+hours,clues=a.clues :+ clue,events=a.events :+ clue)),clue,None,None,None)

  private[game] def perform(a: Adventure, action: String): Either[AppError,(Adventure,String,Option[Int],Option[Int],Option[Int])] =
    if a.sealedEnding then Left(AppError(409,"故事已结束，此档案已封存"))
    else if a.dead then Left(AppError(409,"角色已死亡，请读取存档"))
    else if a.battle.nonEmpty && !action.startsWith("combat:") then Left(AppError(409,"请先完成当前遭遇"))
    else if action.startsWith("combat:") then
      a.battle match
        case None => Left(AppError(409,"当前没有战斗"))
        case Some(battle) =>
          val choice=action.stripPrefix("combat:")
          if !Set("attack","defend","flee","medicine").contains(choice) then Left(AppError(400,"未知战斗行动"))
          else if choice=="medicine" && (quantity(a,"medicine")<1 || a.health>=100) then Left(AppError(409,"当前无法使用药品"))
          else
            val stats=a.stats.getOrElse(PlayerStats.forRole(a.role))
            val die=roll(a,s"combat:$choice:${battle.round}")
            val modifier=if choice=="flee" then stats.agility else if choice=="attack" then stats.body else 0
            val target=if choice=="flee" then 12 else 11
            val hit=choice=="attack" && die+modifier>=target
            val escaped=choice=="flee" && die+modifier>=target
            val critical=hit && die==20
            val fumble=choice=="attack" && die==1 && !hit
            val remainingEnemy=math.max(0,battle.health-(if hit then (10+stats.body)*(if critical then 2 else 1) else 0))
            val healed=if choice=="medicine" then adjust(a,"medicine",-1).copy(health=math.min(100,a.health+25)) else a
            val ended=escaped || remainingEnemy==0
            val enemyDie=roll(a,s"enemy:${battle.round}")
            val enemyHits= !ended && (fumble || enemyDie >= (if choice=="defend" then 14 else 10))
            val damage=if enemyHits then (if a.difficulty=="故事" then 5 else if a.difficulty=="艰难" then 15 else 10) else 0
            val remaining=math.max(0,healed.health-damage)
            val detail=if critical then "你抓住机会造成了双倍伤害。" else if fumble then "你攻击落空、露出了破绽。" else ""
            val result=detail+(if escaped then "你成功撤离了遭遇。" else if remainingEnemy==0 then "野兽退入森林，你在附近发现了矿工布条。" else if remaining==0 then "你在遭遇中伤重倒下。" else if fumble then s"野兽抓住破绽，造成 $damage 点伤害。" else s"本回合结束；野兽反击骰为 $enemyDie，造成 $damage 点伤害。")
            val next=healed.copy(health=remaining,dead=remaining==0,battle=if ended || remaining==0 then None else Some(battle.copy(health=remainingEnemy,round=battle.round+1)),clues=if remainingEnemy==0 then (a.clues :+ "矿工布条：野兽附近有矿工留下的布条。").distinct else a.clues,events=a.events :+ result)
            val settled=if ended || remaining==0 then advance(next.copy(hour=next.hour+1)) else next
            Right((settled,result,if choice=="attack" || choice=="flee" then Some(die) else None,if choice=="attack" || choice=="flee" then Some(modifier) else None,if choice=="attack" || choice=="flee" then Some(target) else None))
    else if a.pendingRecovery.nonEmpty && !action.startsWith("recover:") then Left(AppError(409,"请先处理当前危险的后果"))
    else if action.startsWith("recover:") then
      val choice=action.stripPrefix("recover:")
      a.pendingRecovery match
        case None => Left(AppError(409,"当前没有待处理的危险"))
        case Some(_) if !Set("accept","food","delay").contains(choice) => Left(AppError(400,"未知补救方式"))
        case Some(_) if choice=="food" && quantity(a,"food")<1 => Left(AppError(409,"没有可消耗的食物"))
        case Some(pending) =>
          val damage=math.max(0,pending.damage-(if choice=="food" then 10 else if choice=="delay" then 5 else 0))
          val remaining=math.max(0,a.health-damage)
          val consumed=if choice=="food" then adjust(a,"food",-1) else a
          val next=advance(consumed.copy(hour=a.hour+(if choice=="delay" then 1 else 0),health=remaining,dead=remaining==0,injury=if damage>=20 && remaining>0 then Some("leg") else a.injury,pendingRecovery=None,events=a.events :+ (if remaining==0 then "矿洞中受伤过重，旅程在此结束。" else s"处理危险后损失 $damage 点生命。")))
          Right((next,if remaining==0 then "角色在矿洞中死亡，可以读取存档。" else s"危险已处理，损失 $damage 点生命。",None,None,None))
    else if QuestRules.perform(a,action).nonEmpty then QuestRules.perform(a,action).get
    else if action == "move:mine_via_map" && a.place=="forest" && a.stage>=1 && a.clues.contains("铁匠旧图：矿道侧线通往森林一侧。") then
      val hours=Locations.travelHours(a,"mine")+1
      val companions=a.npcs.map(n=>if a.companion.contains(n.id) then n.copy(place="mine",lastKnownPlace="mine",lastSeenHour=Some(a.hour+hours)) else n)
      val next=advance(a.copy(place="mine",hour=a.hour+hours,fatigue=math.min(100,a.fatigue+5),npcs=companions,events=a.events :+ "沿旧矿图侧线进入矿洞"))
      Right((next,s"你沿旧矿图侧线进入矿洞，耗费 $hours 小时。",None,None,None))
    else if action.startsWith("move:") then
      val dest = action.stripPrefix("move:")
      if !places.contains(dest) || dest == a.place then Left(AppError(400,"目的地无效"))
      else if dest=="mine" && !(a.events.contains("获得矿洞通行许可") || a.events.contains("矿洞封锁已解除")) then Left(AppError(409,"矿洞被封锁；需要许可或寻找其他路径"))
      else
        val duration=Locations.travelHours(a,dest)
        val tired=math.min(100,a.fatigue+5)
        val companions=a.npcs.map(n => if a.companion.contains(n.id) then n.copy(place=dest,lastKnownPlace=dest,lastSeenHour=Some(a.hour+duration)) else n)
        Right((advance(a.copy(place=dest,hour=a.hour+duration,fatigue=tired,npcs=companions,events=a.events :+ s"前往 $dest")),s"行程耗费 $duration 小时。",None,None,None))
    else if action == "open_gate" && a.place=="gate" && a.stage>=1 && a.npcs.exists(n=>n.id=="guard" && n.condition==NpcCondition.deceased) then
      Right((a.copy(events=(a.events :+ "矿洞封锁已解除").distinct),"守卫已不在，玩家移开了封锁。",None,None,None))
    else if action.startsWith("harm:") || action.startsWith("kill:") then
      val lethal=action.startsWith("kill:"); val id=action.dropWhile(_ != ':').drop(1)
      a.npcs.find(n=>n.id==id && n.place==a.place && n.condition!=NpcCondition.deceased) match
        case None => Left(AppError(400,"此处没有可互动的人物"))
        case Some(n) if a.companion.contains(n.id) => Left(AppError(409,"同行期间不能伤害同行者"))
        case Some(n) if lethal && n.condition!=NpcCondition.injured => Left(AppError(409,"此人物当前未受重伤"))
        case Some(n) =>
          val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val mod=stats.body; val target=12
          val success=die+mod>=target
          val condition=if !success then n.condition else if lethal then NpcCondition.deceased else NpcCondition.injured
          val notice=s"玩家攻击了${n.name}"
          val npcs=a.npcs.map { other =>
            if other.id==id then other.copy(condition=condition,met=true,lastKnownPlace=other.place,lastSeenHour=Some(a.hour+1),trust=math.max(0,other.trust-30),knownTrust=Some(math.max(0,other.trust-30)),knownCondition=Some(condition),facts=(other.facts :+ NpcFact(notice,"亲身经历")).distinct)
            else if other.place==a.place && other.condition!=NpcCondition.deceased then other.copy(facts=(other.facts :+ NpcFact(notice,"亲眼所见")).distinct)
            else other
          }
          val next=advance(a.copy(hour=a.hour+1,npcs=npcs,events=a.events :+ notice))
          val message=if !success then "行动没有造成伤害，但在场的人可能记住了冲突。" else if lethal then s"${n.name}死亡；在场人物可能记住这件事。" else s"${n.name}受伤；在场人物可能记住这件事。"
          Right((next,message,Some(die),Some(mod),Some(target)))
    else if action == "secure_permit" && a.place=="gate" && a.stage>=1 && hasInquiryRecord(a) && a.npcs.exists(n=>n.id=="guard" && n.place=="gate" && n.condition==NpcCondition.healthy) then
      if a.events.contains("获得矿洞通行许可") then Right((a,"你已经获得通行许可。",None,None,None))
      else if guardFact(a).nonEmpty || a.npcs.exists(n=>n.id=="guard" && n.trust<40) then Left(AppError(409,"守卫暂时拒绝放行；你可以向他询问原因或寻找其他路线。"))
      else Right((a.copy(events=a.events :+ "获得矿洞通行许可"),"守卫核对你带来的记录后同意你进入矿洞。",None,None,None))
    else if action == "persuade:guard" && a.place=="gate" && a.npcs.exists(n=>n.id=="guard" && n.place==a.place && n.met && n.condition==NpcCondition.healthy) then
      val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val fact=guardFact(a)
      val knownPenalty=if fact.exists(f=>guardFactKnown(a,f)) then 2 else 0
      val hiddenPenalty=if fact.exists(f=> !guardFactKnown(a,f)) then 2 else 0
      val mod=stats.social + (if a.clues.contains(reportClue) then 2 else 0)-knownPenalty; val target=14
      val success=die+mod-hiddenPenalty>=target
      val next=advance(a.copy(hour=a.hour+1,events=if success then (a.events :+ "获得矿洞通行许可").distinct else a.events :+ "尝试说服守卫未果"))
      Right((next,if success then "守卫同意你进入矿洞。" else "守卫没有同意；也许新的证据能改变他的决定。",Some(die),Some(mod),Some(target)))
    else if action == "sneak:mine" && a.place=="gate" && a.stage>=1 then
      val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val mod=stats.agility - (if a.fatigue>=60 then 2 else 0); val target=14
      val success=die+mod>=target
      val arrived=if success then "mine" else a.place
      val others=a.npcs.map(n=>if success && a.companion.contains(n.id) then n.copy(place="mine",lastKnownPlace="mine",lastSeenHour=Some(a.hour+2)) else n)
      val next=advance(a.copy(place=arrived,hour=a.hour+2,fatigue=math.min(100,a.fatigue+5),npcs=others,events=a.events :+ (if success then "绕过守卫进入矿洞" else "潜入矿洞未果")))
      Right((next,if success then "你绕过封锁进入矿洞。" else "守卫发现了你的行动，你没有进入矿洞。",Some(die),Some(mod),Some(target)))
    else if action.startsWith("join:") then
      val id=action.stripPrefix("join:")
      if !safe.contains(a.place) then Left(AppError(409,"只能在村庄邀请同行者"))
      else if a.companion.nonEmpty then Left(AppError(409,"已有同行者，请先在村庄结束同行"))
      else a.npcs.find(n => n.id==id && n.place==a.place && n.met && n.condition==NpcCondition.healthy) match
        case None => Left(AppError(400,"此人不在场或尚未认识"))
        case Some(n) if n.trust < 40 => Left(AppError(409,"对方目前不愿意同行"))
        case Some(n) if !(Set("smith","guard","merchant").contains(n.id) || (n.id=="healer" && a.quests.exists(q=>q.id=="herbs" && q.status==QuestStatus.active))) => Left(AppError(409,"对方目前有职责在身，不能自由同行"))
        case Some(n) => Right((a.copy(companion=Some(id),events=a.events :+ s"邀请${n.name}同行"),s"${n.name}同意同行。",None,None,None))
    else if action == "leave_companion" then
      if !safe.contains(a.place) then Left(AppError(409,"请返回村庄结束同行"))
      else if a.companion.isEmpty then Left(AppError(409,"当前没有同行者"))
      else Right((a.copy(companion=None,events=a.events :+ "结束同行"),"同行结束。",None,None,None))
    else if action.startsWith("talk:") then
      val id = action.stripPrefix("talk:")
      a.npcs.find(n => n.id == id && n.place == a.place && n.condition != NpcCondition.deceased) match
        case None => Left(AppError(400,"此处没有这位人物"))
        case Some(person) =>
          val memory = "与玩家初次交谈"
          val updated = a.npcs.map(n => if n.id == id then n.copy(met=true,lastKnownPlace=n.place,lastSeenHour=Some(a.hour),knownTrust=Some(n.trust),knownCondition=Some(n.condition),memories=(n.memories :+ memory).distinct) else n)
          val missedPromise=person.facts.find(f=>f.source=="亲身经历" && f.text.startsWith("玩家未能按期完成请求：") && !a.dialogue.exists(d=>d.speaker==person.name && d.text.contains(f.text.replaceFirst("玩家", "你"))))
          val line = if person.condition==NpcCondition.injured then "我在矿洞受了伤，恐怕不能独自返回村庄。" else if missedPromise.nonEmpty then s"${missedPromise.get.text.replaceFirst("玩家", "你")} 我原以为你会按时回来。" else id match
            case "smith" if person.facts.exists(_.text==rescueClue) => "我听说人已经获救了，谢谢你告诉我。"
            case "smith" if a.hour>=24 => "我准备去矿洞寻找弟弟，不能再等下去了。"
            case "smith" => "我的弟弟进了矿洞，还没有回来。"
            case "healer" => "病人出现咳嗽，需要干净的水和休息。"
            case "guard" => "村长要求封锁矿洞，我不能让人擅自进去。"
            case "mayor" => "我们正努力保护村庄，请小心行事。"
            case "mia" => "我父亲是矿工，我想知道他在哪里。"
            case "visitor:courier" => "我负责运送物资，封路让补给变得困难。"
            case "visitor:apprentice" => "我是来帮忙的学徒，知道的事情并不多。"
            case "visitor:woodcutter" => "我常走森林小路，最近雾让道路很危险。"
            case _ => "道路封锁后，补充物资变得困难。"
          val roomForRequest=a.quests.count(_.status==QuestStatus.active)<3 && !a.quests.exists(_.status==QuestStatus.offered)
          val offer=if roomForRequest then QuestRules.offer(id,a.hour).filterNot(q=>a.quests.exists(_.id==q.id)).toList else Nil
          val next = a.copy(npcs=updated,quests=a.quests ++ offer,events=a.events :+ s"与${person.name}交谈",dialogue=a.dialogue :+ DialogueEntry(person.name,line,a.hour,a.place))
          Right((next,line,None,None,None))
    else if action == "inspect:smith" then
      a.npcs.find(n => n.id=="smith" && n.place==a.place && n.condition==NpcCondition.deceased) match
        case None => Left(AppError(400,"此处没有可调查的人物"))
        case Some(person) =>
          val updated=a.npcs.map(n => if n.id=="smith" then n.copy(met=true,lastKnownPlace=n.place,lastSeenHour=Some(a.hour),knownTrust=Some(n.trust),knownCondition=Some(n.condition)) else n)
          val clue="矿灯与记录仍在：铁匠携带的物品留在矿洞。"
          val next=a.copy(npcs=updated,clues=(a.clues :+ clue).distinct,events=a.events :+ "发现铁匠在矿洞遇难")
          Right((next,"你发现了铁匠留下的物品与记录。",None,None,None))
    else if action == "rescue:smith" then
      a.npcs.find(n => n.id=="smith" && n.place==a.place && n.condition==NpcCondition.injured) match
        case None => Left(AppError(400,"此处没有需要救援的铁匠"))
        case Some(_) if quantity(a,"medicine")<=0 => Left(AppError(409,"救援需要一份药品"))
        case Some(_) =>
          val updated=a.npcs.map(n => if n.id=="smith" then n.copy(place="forge",condition=NpcCondition.healthy,expeditionStarted=None,met=true,lastKnownPlace="forge",lastSeenHour=Some(a.hour+2),trust=math.min(100,n.trust+10),knownTrust=Some(math.min(100,n.trust+10)),knownCondition=Some(NpcCondition.healthy),memories=n.memories :+ "玩家救助了我") else if a.companion.contains(n.id) then n.copy(place="forge",lastKnownPlace="forge",lastSeenHour=Some(a.hour+2)) else n)
          val next=advance(adjust(a,"medicine",-1).copy(hour=a.hour+2,npcs=updated,place="forge",events=a.events :+ "救助铁匠并返回村庄"))
          Right((next,"你使用药品，护送铁匠返回村庄。",None,None,None))
    else if action.startsWith("ask:knowledge:") then
      val id=action.stripPrefix("ask:knowledge:")
      a.npcs.find(n=>n.id==id && n.place==a.place && n.met && n.condition!=NpcCondition.deceased) match
        case None => Left(AppError(400,"人物不在场或尚未认识"))
        case Some(person) =>
          val line=if person.facts.isEmpty then "我暂时没有其他消息。" else person.facts.map(f=>s"我从${f.source}那里听到：${f.text}").mkString("；")
          val memory=s"${person.name}向玩家说明了自己知道的消息"
          val npcs=a.npcs.map(n=>if n.id==id then n.copy(memories=(n.memories :+ memory).distinct) else n)
          val next=a.copy(npcs=npcs,dialogue=a.dialogue :+ DialogueEntry(person.name,line,a.hour,a.place),events=a.events :+ s"向${person.name}询问消息")
          Right((next,line,None,None,None))
    else if action.startsWith("question:") then
      val id=action.stripPrefix("question:")
      a.npcs.find(n => n.id==id && n.place==a.place && n.met && n.condition != NpcCondition.deceased) match
        case None => Left(AppError(400,"请先在现场与此人交谈"))
        case Some(person) =>
          val involved=a.challengeTruth.map(_.involvedNpc).getOrElse(if a.truth=="mine_accident" then "mayor" else "healer")
          val line=if id==involved then "事故发生前，我确实参与过相关工作，但具体经过需要查阅记录。" else "我不清楚事故的全部经过，或许可以检查矿洞记录。"
          val clue=s"证词：${person.name}承认事故前参与过相关工作。"
          val found=if id==involved && !a.clues.contains(clue) then a.clues :+ clue else a.clues
          val next=a.copy(clues=found,dialogue=a.dialogue :+ DialogueEntry(person.name,line,a.hour,a.place),events=a.events :+ s"向${person.name}询问事故")
          Right((next,line,None,None,None))
    else if action.startsWith("share:") then
      val payload=action.stripPrefix("share:")
      val separator=payload.lastIndexOf(':')
      if separator<=0 then Left(AppError(400,"分享操作格式无效"))
      else
        val npcId=payload.take(separator)
        val index=scala.util.Try(payload.drop(separator+1).toInt).toOption
        val person=a.npcs.find(n => n.id==npcId && n.place==a.place && n.met && n.condition != NpcCondition.deceased)
        (person,index.flatMap(a.clues.lift)) match
          case (Some(npc),Some(clue)) =>
            val memory=s"玩家分享了线索：$clue"
            val npcs=a.npcs.map(n => if n.id==npcId then n.copy(memories=(n.memories :+ memory).distinct,facts=if n.facts.exists(_.text==clue) then n.facts else n.facts :+ NpcFact(clue,"玩家")) else n)
            Right((a.copy(npcs=npcs,events=a.events :+ s"向${npc.name}分享线索",dialogue=a.dialogue :+ DialogueEntry(a.name,clue,a.hour,a.place)),s"你向${npc.name}说明了这条线索。",None,None,None))
          case _ => Left(AppError(400,"人物不在场或线索不存在"))
    else if action == "ask:aid:healer" then
      val healer=a.npcs.find(n=>n.id=="healer" && n.place==a.place && n.met && n.condition==NpcCondition.healthy)
      if a.place!="clinic" || healer.isEmpty || !healer.exists(_.facts.exists(_.text==rescueClue)) then Left(AppError(409,"目前没有合适的救援支援"))
      else if healer.exists(_.trust<40) then Left(AppError(409,"药师目前不愿意提供额外支援"))
      else if a.events.contains("药师赠予救援药品") then Left(AppError(409,"药师已经提供过救援药品"))
      else
        val next=adjust(a,"medicine",1).copy(events=a.events :+ "药师赠予救援药品",dialogue=a.dialogue :+ DialogueEntry("药师林婆","既然有人救回来了，这份药你带上，路上可能还用得着。",a.hour,a.place))
        Right((next,"药师赠予你一份药品，用于后续救援。",None,None,None))
    else if action.startsWith("decline:") then
      val id=action.stripPrefix("decline:")
      a.quests.find(q=>q.id==id && q.status==QuestStatus.offered) match
        case None => Left(AppError(400,"没有待回应的请求"))
        case Some(q) => Right((a.copy(quests=a.quests.map(item=>if item.id==id then item.copy(status=QuestStatus.declined) else item),events=a.events :+ s"暂不接受请求：${q.title}"),"你决定暂不接受这个请求，没有作出承诺。",None,None,None))
    else if action.startsWith("accept:") then
      val id=action.stripPrefix("accept:")
      a.quests.find(q => q.id == id && q.status == QuestStatus.offered && q.issuer.exists(n => a.npcs.exists(p => p.id==n && p.place==a.place && p.condition==NpcCondition.healthy))) match
        case None => Left(AppError(400,"请求不存在或委托人不在场"))
        case Some(q) if q.deadline.exists(a.hour > _) => Left(AppError(409,"请求已过期"))
        case Some(_) if a.quests.count(_.status == QuestStatus.active) >= 3 => Left(AppError(409,"进行中的请求已达上限"))
        case Some(_) => Right((a.copy(quests=a.quests.map(q => if q.id==id then q.copy(status=QuestStatus.active) else q)),"你接受了这个请求。",None,None,None))
    else if action == "gather:herbs" && a.place == "forest" && a.quests.exists(q => q.id == "herbs" && q.status == QuestStatus.active) then
      Right(addClue(a,"获得药草：可以交给药师。",1))
    else if action == "deliver:herbs" && a.place == "clinic" && a.clues.contains("获得药草：可以交给药师。") && a.quests.exists(q => q.id == "herbs" && q.status == QuestStatus.active) && a.npcs.exists(n => n.id=="healer" && n.place==a.place && n.condition==NpcCondition.healthy) then
      val quests = a.quests.map(q => if q.id == "herbs" then q.copy(status=QuestStatus.completed) else q)
      val npcs = a.npcs.map(n => if n.id == "healer" then n.copy(trust=math.min(100,n.trust+10),knownTrust=Some(math.min(100,n.trust+10)),memories=n.memories :+ "玩家按约带回药草") else n)
      Right((a.copy(quests=quests,npcs=npcs,events=a.events :+ "将药草交给药师"),"药师收下药草，信任有所增加。",None,None,None))
    else if action.startsWith("negotiate:") || action.startsWith("abandon:") then
      val negotiating=action.startsWith("negotiate:"); val id=action.dropWhile(_ != ':').drop(1)
      a.quests.find(q=>q.id==id && Set(QuestStatus.active,QuestStatus.paused).contains(q.status)) match
        case None => Left(AppError(400,"请求不存在或已经结束"))
        case Some(q) =>
          val person=q.issuer.flatMap(i=>a.npcs.find(n=>n.id==i && n.place==a.place && n.condition==NpcCondition.healthy))
          person match
            case None => Left(AppError(409,"需要先找到委托人商量"))
            case Some(n) if negotiating && a.events.contains(s"已协商请求：$id") => Left(AppError(409,"这个请求已经协商过期限"))
            case Some(n) if negotiating && q.deadline.isEmpty => Left(AppError(409,"这个请求没有固定期限"))
            case Some(n) if negotiating =>
              val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val mod=stats.social + (if n.trust>=60 then 2 else 0); val target=12
              val success=die+mod>=target
              val quests=a.quests.map(x=>if x.id==id && success then x.copy(deadline=x.deadline.map(_+6)) else x)
              val next=advance(a.copy(hour=a.hour+1,quests=quests,events=a.events :+ s"已协商请求：$id"))
              Right((next,if success then "对方同意延长六小时。" else "对方没有同意延长，原期限仍有效。",Some(die),Some(mod),Some(target)))
            case Some(n) =>
              val next=a.copy(quests=a.quests.map(x=>if x.id==id then x.copy(status=QuestStatus.abandoned) else x),npcs=a.npcs.map(x=>if x.id==n.id then x.copy(trust=math.max(0,x.trust-5),knownTrust=Some(math.max(0,x.trust-5)),memories=x.memories :+ "玩家主动说明无法完成请求") else x),events=a.events :+ s"向${n.name}说明放弃请求")
              Right((next,"你向委托人说明无法继续完成请求。",None,None,None))
    else if action.startsWith("pause:") || action.startsWith("resume:") then
      val pausing=action.startsWith("pause:")
      val id=action.dropWhile(_ != ':').drop(1)
      val expected=if pausing then QuestStatus.active else QuestStatus.paused
      val updated=if pausing then QuestStatus.paused else QuestStatus.active
      if !a.quests.exists(q => q.id == id && q.status == expected) then Left(AppError(400,"任务状态不允许此操作"))
      else if !pausing && a.quests.count(_.status == QuestStatus.active) >= 3 then Left(AppError(409,"进行中的请求已达上限"))
      else Right((a.copy(quests=a.quests.map(q => if q.id==id then q.copy(status=updated) else q)),if pausing then "请求已搁置，期限仍然有效。" else "请求已重新关注。",None,None,None))
    else if action == "hint_time" then
      Right((advance(a.copy(hour=a.hour+1,events=a.events :+ "花一小时整理调查思路")),"整理思路耗费一小时。",None,None,None))
    else if action == "listen:mine" && a.place=="mine" && a.stage>=1 then
      val message=a.minerStatus match
        case MinerStatus.missing => "你在矿洞深处听到微弱的求救声。"
        case MinerStatus.rescued => "失踪矿工已经获救。"
        case MinerStatus.lost => "搜救线索显示，失踪矿工已无法获救。"
      val next=a.copy(knownMinerStatus=a.minerStatus,events=(a.events :+ message).distinct)
      Right((next,message,None,None,None))
    else if action == "rescue:miner" && a.place=="mine" && a.stage>=1 && a.events.contains("你在矿洞深处听到微弱的求救声。") then
      if a.minerStatus!=MinerStatus.missing then Left(AppError(409,"当前没有可救援的矿工"))
      else if quantity(a,"medicine")<1 then Left(AppError(409,"救援需要一份药品"))
      else
        val progressed=advance(adjust(a,"medicine",-1).copy(hour=a.hour+2,events=a.events :+ "尝试救援失踪矿工"))
        if progressed.sealedEnding then Right((progressed,"黑雾失控，危机进入结局。",None,None,None))
        else if progressed.minerStatus==MinerStatus.lost then Right((progressed.copy(knownMinerStatus=MinerStatus.lost,events=progressed.events :+ "赶到时矿工已无法获救。"),"赶到时矿工已无法获救。",None,None,None))
        else
          val witnesses=progressed.npcs.map(n=>if n.place=="mine" && n.condition!=NpcCondition.deceased then n.copy(facts=if n.facts.exists(_.text==rescueClue) then n.facts else n.facts :+ NpcFact(rescueClue,"亲眼所见")) else n)
          val next=progressed.copy(minerStatus=MinerStatus.rescued,knownMinerStatus=MinerStatus.rescued,clues=(progressed.clues :+ rescueClue).distinct,npcs=witnesses,events=progressed.events :+ "救出失踪矿工")
          Right((next,"你救出失踪矿工，并为其使用了一份药品。",None,None,None))
    else if action == "inspect:clinic_records" && a.place=="clinic" then Right(addClue(a,clinicRecordClue,1))
    else if action == "inspect_gate" && a.place == "gate" then Right(addClue(a,gateClue,0))
    else if action == "ask_clinic" && a.place == "clinic" && a.npcs.exists(n=>n.id=="healer" && n.place==a.place && n.condition==NpcCondition.healthy) then Right(addClue(a,clinicClue,0))
    else if action == "read_report" && a.place == "hall" then Right(addClue(a,reportClue,1))
    else if action == "inspect:archive" && a.place == "hall" && a.stage>=1 then
      Right(addClue(a,if a.truth=="mine_accident" then mineArchive else chemicalArchive,2))
    else if action == "inspect_mine" && a.place == "mine" && a.stage >= 1 then
      val clue=if a.truth == "mine_accident" then mineClue else chemicalClue
      if a.clues.contains(clue) then Right((a,"你已经记录了这条线索。",None,None,None))
      else if quantity(a,"oil")<1 then Left(AppError(409,"检查记录需要灯油；也可以尝试摸黑调查"))
      else Right(addClue(adjust(a,"oil",-1),clue,2))
    else if action == "inspect_mine_dark" && a.place == "mine" && a.stage>=1 then
      val clue=if a.truth == "mine_accident" then mineClue else chemicalClue
      if a.clues.contains(clue) then Right((a,"你已经记录了这条线索。",None,None,None))
      else
        val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val mod=stats.insight-(if a.fatigue>=60 then 2 else 0); val target=14
        val success=die+mod>=target
        val next=advance(a.copy(hour=a.hour+2,clues=if success then a.clues :+ clue else a.clues,pendingRecovery=if success then None else Some(Recovery("dark_search",10)),events=a.events :+ (if success then "摸黑查明矿洞记录" else "摸黑调查时发生危险")))
        val settled=if next.sealedEnding then next.copy(pendingRecovery=None) else next
        Right((settled,if success then clue else if settled.sealedEnding then "黑雾失控，危机已进入结局。" else "摸黑调查发生危险，可能受伤。",Some(die),Some(mod),Some(target)))
    else if (action == "prepare:quick" || action == "prepare:careful") && a.place=="mine" && a.stage==2 then
      if a.events.contains("已准备控制污染源") then Left(AppError(409,"现场准备已经完成"))
      else
        val quick=action=="prepare:quick"
        val die=if quick then Some(roll(a,action)) else None
        val stats=a.stats.getOrElse(PlayerStats.forRole(a.role))
        val modifier=stats.body+(if stats.talents.contains("mine_sense") then 2 else 0)+(if a.companion.contains("smith") then 2 else 0)-(if a.fatigue>=60 then 2 else 0)
        val success=die.forall(_+modifier>=13)
        val preparation=if a.truth=="mine_accident" then "检查通风与封堵位置" else "检查药剂阀门与隔离位置"
        val next=advance(a.copy(hour=a.hour+(if quick then 2 else 4),events=a.events ++ List(preparation) ++ (if success then List("已准备控制污染源") else Nil),pendingRecovery=if success then None else Some(Recovery("site_preparation",10))))
        val settled=if next.sealedEnding then next.copy(pendingRecovery=None) else next
        val message=if settled.sealedEnding then "准备过程中黑雾失控，村庄进入危机结局。" else if success then s"$preparation，现场已经准备就绪。" else "现场准备时发生危险，需要先处理后果。"
        Right((settled,message,die,if quick then Some(modifier) else None,if quick then Some(13) else None))
    else if action.startsWith("buy:") || action.startsWith("sell:") then
      val buying=action.startsWith("buy:"); val id=action.dropWhile(_ != ':').drop(1)
      if !a.npcs.exists(n => n.id=="merchant" && n.place==a.place && n.condition==NpcCondition.healthy) then Left(AppError(409,"旅商目前无法交易"))
      else prices.get(id) match
        case None => Left(AppError(400,"未知商品"))
        case Some(price) if buying && a.money<price => Left(AppError(409,"钱不够"))
        case Some(_) if buying && a.merchantStock.find(_.id==id).forall(_.quantity<=0) => Left(AppError(409,"商品已售罄"))
        case Some(_) if !buying && quantity(a,id)<1 => Left(AppError(409,"背包中没有此物品"))
        case Some(price) =>
          val stock=a.merchantStock.find(_.id==id).fold(0)(_.quantity)+(if buying then -1 else 1)
          val next=adjust(a,id,if buying then 1 else -1).copy(merchantStock=a.merchantStock.filterNot(_.id==id) :+ ItemStack(id,stock),money=a.money+(if buying then -price else price),events=a.events :+ s"${if buying then "购买" else "出售"} $id")
          Right((next,"交易已完成。",None,None,None))
    else if action.startsWith("use:") then
      val id=action.stripPrefix("use:")
      if quantity(a,id)<1 then Left(AppError(409,"背包中没有此物品"))
      else id match
        case "medicine" if a.health<100 => Right((adjust(a,id,-1).copy(health=math.min(100,a.health+25),events=a.events :+ "使用药品"),"使用一份药品，恢复部分生命。",None,None,None))
        case "rare_medicine" if a.injury.nonEmpty => Right((adjust(a,id,-1).copy(injury=None,events=a.events :+ "使用稀有药品治疗伤势"),"严重伤势已治疗。",None,None,None))
        case "rare_medicine" => Left(AppError(409,"当前没有需要处理的严重伤势"))
        case "food" if a.fatigue>0 => Right((adjust(a,id,-1).copy(fatigue=math.max(0,a.fatigue-10),events=a.events :+ "使用食物"),"吃了一份食物，疲劳减少。",None,None,None))
        case "medicine" | "food" => Left(AppError(409,"当前不需要使用此物品"))
        case _ => Left(AppError(400,"此物品不能这样使用"))
    else if action == "treat:healer" && a.place=="clinic" && a.npcs.exists(n=>n.id=="healer" && n.place==a.place && n.condition==NpcCondition.healthy) then
      if a.injury.isEmpty then Left(AppError(409,"当前没有需要处理的严重伤势"))
      else if a.money<3 then Left(AppError(409,"治疗需要三枚银币"))
      else Right((advance(a.copy(hour=a.hour+1,money=a.money-3,injury=None,events=a.events :+ "药师治疗了严重伤势")),"治疗耗时一小时，消耗三枚银币。",None,None,None))
    else if action == "rest" && Locations.safe(a) then
      Right((advance(a.copy(hour=a.hour+4,health=math.min(100,a.health+15),fatigue=math.max(0,a.fatigue-20),events=a.events :+ "在安全地点休息")),"休息耗费四小时。",None,None,None))
    else if action == "start:beast" && a.place == "forest" && !a.clues.exists(_.startsWith("矿工布条")) then
      val hp=if a.difficulty=="故事" then 20 else if a.difficulty=="艰难" then 40 else 30
      Right((a.copy(battle=Some(Battle("受惊的野兽",hp,hp,1)),events=a.events :+ "森林中遭遇野兽"),"遭遇开始：野兽挡在路上。",None,None,None))
    else if action == "thorough_search" && a.place == "forest" then Right(addClue(a,forestClue,4))
    else if action == "search_forest" && a.place == "forest" then
      if a.clues.contains(forestClue) then Right((a,"这条森林线索已经记录。",None,None,None))
      else
        val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val mod=stats.insight + (if stats.talents.contains("investigator") then 2 else 0) - (if a.fatigue >= 60 then 2 else 0); val target=12
        val success=die+mod>=target
        val lucky=die==20 && success
        val unlucky=die==1 && !success
        val base=a.copy(hour=a.hour+1,fatigue=math.min(100,a.fatigue+(if unlucky then 5 else 0)),clues=if success then a.clues :+ forestClue else a.clues,events=a.events :+ "搜索森林")
        val next=advance(if lucky then adjust(base,"food",1).copy(events=base.events :+ "森林中意外找到一份食物") else base)
        val message=if lucky then forestClue + "你还找到一份遗落的食物。" else if unlucky then "搜索没有结果，你在泥泞中摔了一跤，更加疲劳。" else if success then forestClue else "你没有找到可靠线索，搜索耗费了一小时。"
        Right((next,message,Some(die),Some(mod),Some(target)))
    else if action == "clear:camp" && a.place == "camp" && !Locations.safe(a) then
      val die=roll(a,action); val modifier=if a.role == "商队向导" then 2 else 0; val target=11
      val success=die+modifier>=target
      val next=advance(a.copy(hour=a.hour+1,campSafeUntil=if success then math.min(81,a.hour+9) else a.campSafeUntil,events=a.events :+ (if success then "确认营地暂时安全" else "未能确认营地安全")))
      Right((next,if success then "营地已暂时安全，可以休息和存档。" else "未能确认营地安全，请寻找其他安全地点。",Some(die),Some(modifier),Some(target)))
    else if action == "hazard:cross" && a.place == "mine" then
      val die=roll(a,action); val stats=a.stats.getOrElse(PlayerStats.forRole(a.role)); val modifier=stats.body + (if stats.talents.contains("mine_sense") then 2 else 0) + (if a.companion.contains("smith") then 2 else 0) - (if a.fatigue >= 60 then 2 else 0); val target=14
      val damage=if die+modifier >= target then 0 else a.difficulty match
        case "故事" => 10
        case "艰难" => 35
        case _ => 20
      val next=advance(a.copy(hour=a.hour+1,fatigue=math.min(100,a.fatigue+10),pendingRecovery=if damage>0 then Some(Recovery("mine_crossing",damage)) else None,events=a.events :+ (if damage>0 then "矿道坍塌，必须处理危险后果。" else "安全穿过不稳的矿道。")))
      val finalState=if next.sealedEnding then next.copy(pendingRecovery=None) else next
      val message=if damage>0 && !finalState.sealedEnding then s"矿道坍塌，可能损失 $damage 点生命；可以选择承担、消耗食物或花时间减轻伤害。" else if finalState.sealedEnding then "黑雾失控，危机已进入结局。" else "你安全穿过矿道。"
      Right((finalState,message,Some(die),Some(modifier),Some(target)))
    else if action == "resolve:evacuate" && a.stage >= 1 then
      if quantity(a,"food")<1 then Left(AppError(409,"组织撤离需要一份食物"))
      else
        val message=if a.knownMinerStatus==MinerStatus.rescued then "村民与获救矿工安全撤离，黑雾的来源仍未完全解决。" else "村民撤离，黑雾的来源与失踪矿工的情况仍有遗憾。"
        val progressed=advance(adjust(a,"food",-1).copy(hour=a.hour+2,events=a.events :+ "开始组织撤离"))
        if progressed.sealedEnding then Right((progressed,"撤离过程中黑雾失控，村庄进入危机结局。",None,None,None))
        else Right((progressed.copy(stage=3,sealedEnding=true,events=progressed.events :+ message),message,None,None,None))
    else if action == "resolve:water" && a.stage >= 1 then
      if quantity(a,"filter")<1 || quantity(a,"oil")<1 then Left(AppError(409,"保护水源需要净水滤芯和一份灯油"))
      else
        val next=adjust(adjust(a,"filter",-1),"oil",-1)
        val progressed=advance(next.copy(hour=a.hour+2,events=next.events :+ "开始保护水源"))
        if progressed.sealedEnding then Right((progressed,"保护水源时黑雾失控，村庄进入危机结局。",None,None,None))
        else Right((progressed.copy(stage=3,sealedEnding=true,events=progressed.events :+ "净化水源并组织村民避险，危机得到暂时控制。"),"水源得到保护，村庄暂时安全。",None,None,None))
    else if action == "resolve:contain" && a.stage == 2 && a.events.contains("已准备控制污染源") then
      if quantity(a,"oil")<1 then Left(AppError(409,"控制危机需要一份灯油"))
      else
        val conclusion = if a.truth == "mine_accident" then "依据矿洞记录组织封堵与通风，村庄危机得到控制。" else "依据处理记录停止药剂投放并隔离污染源，村庄危机得到控制。"
        val progressed=advance(adjust(a,"oil",-1).copy(hour=a.hour+2,events=a.events :+ "开始控制污染源"))
        if progressed.sealedEnding then Right((progressed,"控制污染源时黑雾失控，村庄进入危机结局。",None,None,None))
        else Right((progressed.copy(stage=3,sealedEnding=true,events=progressed.events :+ conclusion),conclusion,None,None,None))
    else Left(AppError(400,"当前地点或剧情阶段不支持此行动"))

  private[game] def applyQuestRewards(before: Adventure, after: Adventure, action: String, die: Option[Int], modifier: Option[Int], difficulty: Option[Int]): Adventure =
    val succeeded = die.isEmpty || die.get + modifier.getOrElse(0) >= difficulty.getOrElse(0)
    val completed = if succeeded && !after.sealedEnding then before.quests.filter(q => q.status == QuestStatus.active && (q.goal.contains(action) || (q.goal.contains("search_forest") && action=="thorough_search")) && q.deadline.forall(after.hour <= _)) else Nil
    val ids=completed.map(_.id).toSet
    val bonus=completed.count(_.reward.contains("recovery"))*10
    val trustByIssuer=completed.filter(_.reward.contains("trust")).flatMap(_.issuer).groupMapReduce(identity)(_ => 5)(_+_)
    val npcs=after.npcs.map(n => n.copy(trust=math.min(100,n.trust+trustByIssuer.getOrElse(n.id,0))))
    val filters=completed.count(_.reward.contains("filter"))
    val rewarded=if filters>0 then adjust(after,"filter",filters) else after
    rewarded.copy(health=math.min(100,rewarded.health+bonus),npcs=npcs,quests=rewarded.quests.map(q => if ids.contains(q.id) then q.copy(status=QuestStatus.completed) else q),events=rewarded.events ++ completed.map(q => s"完成请求：${q.title}"))

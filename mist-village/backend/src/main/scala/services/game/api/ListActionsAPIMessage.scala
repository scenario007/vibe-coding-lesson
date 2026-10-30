package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.ActionOption
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.{Locations,Rules}
final case class ListActionsAPIMessage(id: String) extends APIMessage[List[ActionOption]]:
  def plan(c: Connection): IO[List[ActionOption]] = for
    a <- AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.dead || a.sealedEnding then IO.raiseError(AppError(409,"当前冒险不能继续行动")) else IO.unit
    people=a.npcs.filter(n=>n.place==a.place && n.condition != services.game.objects.NpcCondition.deceased).map(n => ActionOption(s"talk:${n.id}",s"与${n.name}交谈",0,None))
    questions=a.npcs.filter(n => n.place==a.place && n.met && n.condition != services.game.objects.NpcCondition.deceased).map(n => ActionOption(s"question:${n.id}",s"询问${n.name}关于事故的情况",0,None))
    join=if Set("gate","clinic","forge","hall").contains(a.place) && a.companion.isEmpty then a.npcs.filter(n=>n.met && n.place==a.place && n.condition == services.game.objects.NpcCondition.healthy && (Set("smith","guard","merchant").contains(n.id) || (n.id=="healer" && a.quests.exists(q=>q.id=="herbs" && q.status==services.game.objects.QuestStatus.active))) && n.trust>=40).map(n=>ActionOption(s"join:${n.id}",s"邀请${n.name}同行",0,None)) else Nil
    leave=if a.companion.nonEmpty && Set("gate","clinic","forge","hall").contains(a.place) then List(ActionOption("leave_companion","结束同行",0,None)) else Nil
    rescue=a.npcs.find(n=>n.id=="smith" && n.place==a.place).toList.flatMap { n =>
      if n.condition==services.game.objects.NpcCondition.injured then List(ActionOption("rescue:smith","救助铁匠并返回村庄",2,Some("消耗一份药品")))
      else if n.condition==services.game.objects.NpcCondition.deceased then List(ActionOption("inspect:smith","查看留下的物品",0,None))
      else Nil
    }
    knowledge=a.npcs.filter(n=>n.place==a.place && n.met && n.condition!=services.game.objects.NpcCondition.deceased).map(n=>ActionOption(s"ask:knowledge:${n.id}",s"询问${n.name}听到的消息",0,None))
    conflict=a.npcs.filter(n=>n.place==a.place && n.condition!=services.game.objects.NpcCondition.deceased && !a.companion.contains(n.id)).flatMap { n =>
      val harm=ActionOption(s"harm:${n.id}",s"攻击${n.name}",1,Some("可能造成严重后果，需要确认"))
      if n.condition==services.game.objects.NpcCondition.injured then List(harm,ActionOption(s"kill:${n.id}",s"致命攻击${n.name}",1,Some("可能导致人物死亡，需要确认"))) else List(harm)
    }
    local=a.place match
      case "gate" => List(ActionOption("inspect_gate","查看封锁告示",0,None))
      case "clinic" => List(ActionOption("inspect:clinic_records","查看诊所记录",1,None)) ++ (if a.npcs.exists(n=>n.id=="healer" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) then List(ActionOption("ask_clinic","询问病情",0,None)) else Nil)
      case "hall" => List(ActionOption("read_report","检查矿洞报告",1,None)) ++ (if a.stage>=1 then List(ActionOption("inspect:archive","查找事故相关档案",2,None)) ++ (if a.mode=="challenge" then List(ActionOption("inspect:personal_archive","查阅事故会议记录",3,None)) else Nil) else Nil)
      case "forge" if a.stage>=1 => List(ActionOption("inspect:work_order","寻找设备维修工单",2,None)) ++ (if !a.clues.exists(_.startsWith("铁匠旧图")) && !a.quests.exists(q=>q.id=="smith_map" && q.status==services.game.objects.QuestStatus.active) then List(ActionOption("inspect:old_map","翻找旧矿道图",1,None)) else Nil)
      case "forest" => (if !a.clues.exists(_.startsWith("矿工布条")) then List(ActionOption("start:beast","接近林中的野兽",0,Some("可能发生危险遭遇"))) else Nil) ++ List(ActionOption("search_forest","搜索森林",1,Some("可能找不到可靠线索")),ActionOption("thorough_search","仔细搜索森林",4,Some("耗时较长，黑雾和其他事件会继续发展"))) ++ (if a.stage>=1 && !a.clues.exists(_.startsWith("矿工手绘路线")) && !(a.quests.exists(q=>q.id=="mia_letter" && q.status==services.game.objects.QuestStatus.active) && !a.clues.exists(_.startsWith("矿工来信"))) then List(ActionOption("inspect:lost_letter","寻找矿工留下的信",if a.clues.exists(_.startsWith("矿工来信")) then 0 else 2,None)) else Nil)
      case "mine" => (if a.stage>=1 then List(ActionOption("listen:mine","寻找失踪矿工",0,None)) ++ (if a.events.contains("你在矿洞深处听到微弱的求救声。") && a.knownMinerStatus==services.game.objects.MinerStatus.missing then List(ActionOption("rescue:miner","救援失踪矿工",Rules.rescueHours(a),Some("消耗一份药品；可能错过救援时机"))) else Nil) else Nil) ++ (if a.stage>=1 then (if a.items.exists(i=>i.id=="oil" && i.quantity>0) then List(ActionOption("inspect_mine","照明调查矿洞记录",2,Some("消耗一份灯油"))) else Nil) ++ List(ActionOption("inspect_mine_dark","摸黑调查矿洞记录",2,Some("可能发生危险"))) else Nil) ++ List(ActionOption("hazard:cross","穿越不稳的矿道",1,Some("可能受伤甚至死亡")))
      case "camp" if !Locations.safe(a) => List(ActionOption("clear:camp","检查营地并排除危险",1,Some("可能无法确认安全")))
      case _ => Nil
    quests=a.quests.flatMap { q =>
      if q.status == services.game.objects.QuestStatus.offered then
        val accept=if q.issuer.exists(i => a.npcs.exists(n => n.id==i && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy)) then List(ActionOption(s"accept:${q.id}",s"接受请求：${q.title}",0,None)) else Nil
        accept :+ ActionOption(s"decline:${q.id}",s"暂不接受请求：${q.title}",0,None)
      else if q.status == services.game.objects.QuestStatus.active || q.status == services.game.objects.QuestStatus.paused then
        val toggle=if q.status == services.game.objects.QuestStatus.active then ActionOption(s"pause:${q.id}",s"搁置请求：${q.title}",0,None) else ActionOption(s"resume:${q.id}",s"重新关注：${q.title}",0,None)
        val present=q.issuer.exists(id=>a.npcs.exists(n=>n.id==id && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy))
        val discussion=if present then List(ActionOption(s"abandon:${q.id}",s"向委托人说明放弃：${q.title}",0,Some("可能影响信任"))) ++ (if q.deadline.nonEmpty && !a.events.contains(s"已协商请求：${q.id}") then List(ActionOption(s"negotiate:${q.id}",s"协商延长：${q.title}",1,Some("对方可能拒绝"))) else Nil) else Nil
        val report=if present && q.status==services.game.objects.QuestStatus.active && q.goal.nonEmpty && (q.goalReached || a.events.contains(s"已达成请求目标：${q.id}")) then List(ActionOption(s"report:${q.id}",s"汇报调查结果：${q.title}",0,None)) else Nil
        toggle :: (discussion ++ report)
      else Nil
    }
    herbsProgress=if a.quests.exists(q=>q.id=="herbs" && q.status==services.game.objects.QuestStatus.active) then
      (if a.place=="forest" && !a.clues.contains("获得药草：可以交给药师。") then List(ActionOption("gather:herbs","寻找药草",1,None)) else Nil) ++
      (if a.npcs.exists(n=>n.id=="healer" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) && a.clues.contains("获得药草：可以交给药师。") then List(ActionOption("deliver:herbs","交付药草",0,None)) else Nil)
    else Nil
    access=if a.place=="gate" && a.stage>=1 then
      (if a.npcs.exists(n=>n.id=="guard" && n.condition==services.game.objects.NpcCondition.deceased) && !a.events.contains("矿洞封锁已解除") then List(ActionOption("open_gate","移开封锁",0,None)) else Nil) ++
      (if Rules.hasInquiryRecord(a) && a.npcs.exists(n=>n.id=="guard" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) && !a.events.contains("获得矿洞通行许可") then List(ActionOption("secure_permit","出示调查记录申请通行",0,None)) else Nil) ++
      (if !a.events.contains("获得矿洞通行许可") then List(ActionOption("sneak:mine","尝试绕过封锁进入矿洞",2,Some("可能被守卫发现"))) else Nil) ++
      (if a.npcs.exists(n=>n.id=="guard" && n.met && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) && !a.events.contains("获得矿洞通行许可") then List(ActionOption("persuade:guard","说服守卫放行",1,Some("守卫可能拒绝"))) else Nil)
    else Nil
    labels=Map("gate"->"村口","clinic"->"诊所","forge"->"铁匠铺","hall"->"议事厅","forest"->"森林","mine"->"矿洞","camp"->"营地")
    travel=labels.toList.filter((id,_) => id != a.place && (id != "mine" || (a.events.contains("获得矿洞通行许可") || a.events.contains("矿洞封锁已解除")))).sortBy(_._1).map { (id,label) =>
      val hours=Locations.travelHours(a,id)
      ActionOption(s"move:$id",s"前往$label",hours,if id=="mine" then Some("矿洞可能有危险") else None)
    }
    treatment=if a.place=="clinic" && a.injury.nonEmpty && a.npcs.exists(n=>n.id=="healer" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) then List(ActionOption("treat:healer","请药师治疗伤势",1,Some("消耗三枚银币"))) else Nil
    rescueClue="救援记录：失踪矿工已获救。"
    aid=if a.place=="clinic" && !a.events.contains("药师赠予救援药品") && a.npcs.exists(n=>n.id=="healer" && n.place==a.place && n.met && n.condition==services.game.objects.NpcCondition.healthy && n.facts.exists(f=>f.text==rescueClue && (f.source=="玩家" || a.dialogue.exists(d=>d.speaker==n.name && d.text.contains(f.text))))) then List(ActionOption("ask:aid:healer","向药师询问救援支援",0,None)) else Nil
    questActions=a.quests.filter(_.status==services.game.objects.QuestStatus.active).flatMap { q =>
      q.id match
        case "smith_map" if a.place=="forge" && !a.clues.exists(_.startsWith("铁匠旧图")) => List(ActionOption("find:smith_map","寻找旧矿图",1,None))
        case "smith_map" if a.clues.exists(_.startsWith("铁匠旧图")) && a.npcs.exists(n=>n.id=="smith" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) => List(ActionOption("deliver:smith_map","将旧图交给铁匠",0,None))
        case "mia_letter" if a.place=="forest" && !a.clues.exists(_.startsWith("矿工来信")) => List(ActionOption("find:mia_letter","寻找矿工来信",2,None))
        case "mia_letter" if a.clues.exists(_.startsWith("矿工来信")) && a.npcs.exists(n=>n.id=="mia" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) => List(ActionOption("deliver:mia_letter","将信交给米娅",0,None))
        case "merchant_supply" if a.place=="camp" && Locations.safe(a) && !a.clues.exists(_.startsWith("补给清单")) => List(ActionOption("find:merchant_supply","寻找补给包裹",1,None))
        case "merchant_supply" if a.clues.exists(_.startsWith("补给清单")) && a.npcs.exists(n=>n.id=="merchant" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) => List(ActionOption("deliver:merchant_supply","交付补给包裹",0,None))
        case "evac_supplies" if a.place=="clinic" && !a.events.contains("村庄已备妥撤离物资") => List(ActionOption("deliver:evac_supplies","将食物放入应急箱",1,Some("消耗一份食物")))
        case "evac_supplies" if a.events.contains("村庄已备妥撤离物资") && a.npcs.exists(n=>n.id=="mayor" && n.place==a.place && n.condition==services.game.objects.NpcCondition.healthy) => List(ActionOption("deliver:evac_report","向村长汇报物资准备",0,None))
        case _ => Nil
    }
    rest=if Locations.safe(a) then List(ActionOption("rest","休息",4,None)) else Nil
    sideRoute=if a.place=="forest" && a.stage>=1 && a.clues.contains("铁匠旧图：矿道侧线通往森林一侧。") then List(ActionOption("move:mine_via_map","沿旧矿图侧线进入矿洞",Locations.travelHours(a,"mine")+1,Some("路线较远，黑雾可能继续扩散"))) else Nil
    water=if a.stage>=1 && a.items.exists(i=>i.id=="filter" && i.quantity>0) then List(ActionOption("resolve:water","保护水源并结束本局",2,Some("消耗净水滤芯与一份灯油；行动期间黑雾继续扩散"))) else Nil
    preparation=if a.place=="mine" && a.stage==2 && !a.events.contains("已准备控制污染源") then List(ActionOption("prepare:quick","迅速准备现场",2,Some("需要检定，失败可能受伤")),ActionOption("prepare:careful","谨慎准备现场",if Rules.knowsEquipment(a) then 3 else 4,Some("黑雾和其他事件会继续发展"))) else Nil
    ending=(if a.stage>=1 then List(ActionOption("resolve:evacuate","组织撤离并结束本局",if a.events.contains("村庄已备妥撤离物资") then 1 else 2,Some(if a.events.contains("村庄已备妥撤离物资") then "使用预先准备的物资；行动期间黑雾继续扩散" else "消耗一份食物；行动期间黑雾继续扩散"))) else Nil) ++ (if a.stage==2 && a.events.contains("已准备控制污染源") then List(ActionOption("resolve:contain","控制黑雾并结束本局",2,Some("消耗一份灯油；行动期间黑雾继续扩散"))) else Nil)
    recovery=a.pendingRecovery.toList.flatMap { _ =>
      List(ActionOption("recover:accept","承担伤害",0,None),ActionOption("recover:delay","花费一小时减轻伤害",1,Some("黑雾和其他事件继续发展"))) ++ (if a.items.exists(i=>i.id=="food" && i.quantity>0) then List(ActionOption("recover:food","消耗一份食物减轻伤害",0,None)) else Nil)
    }
    combat=a.battle.toList.flatMap(_ => List(ActionOption("combat:attack","攻击",0,None),ActionOption("combat:defend","防御",0,None),ActionOption("combat:flee","尝试撤离",0,Some("可能被阻拦"))) ++ (if a.items.exists(i=>i.id=="medicine" && i.quantity>0) && a.health<100 then List(ActionOption("combat:medicine","使用药品",0,Some("野兽可能反击"))) else Nil))
  yield if a.aiPause.nonEmpty then Nil else if a.battle.nonEmpty then combat else if a.pendingRecovery.nonEmpty then recovery else people ++ questions ++ knowledge ++ join ++ leave ++ rescue ++ conflict ++ local ++ herbsProgress ++ quests ++ questActions ++ treatment ++ aid ++ rest ++ travel ++ access ++ sideRoute ++ water ++ preparation ++ ending
object ListActionsAPIMessage:
  given Encoder[ListActionsAPIMessage] = deriveEncoder
  given Decoder[ListActionsAPIMessage] = deriveDecoder

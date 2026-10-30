package services.game.utils
import services.game.objects.*
import services.system.objects.AppError
private[game] object QuestRules:
  private[game] def offer(npc: String, hour: Int): Option[Quest] = npc match
    case "smith" => Some(Quest("smith_map","寻找铁匠的旧图",QuestStatus.offered,Some(hour+18),"寻找铁匠铺中的旧矿图，再交给铁匠。",issuer=Some("smith")))
    case "mia" => Some(Quest("mia_letter","送回未寄出的信",QuestStatus.offered,Some(hour+24),"在森林寻找矿工留下的信，再交给米娅。",issuer=Some("mia")))
    case "merchant" => Some(Quest("merchant_supply","取回营地补给",QuestStatus.offered,Some(hour+18),"前往安全的营地取回补给，再交给旅商。",issuer=Some("merchant")))
    case "healer" => Some(Quest("herbs","为药师寻找药草",QuestStatus.offered,Some(hour+12),"在森林寻找药草，在期限前交给药师；她会提供一份备用净水滤芯。",issuer=Some("healer")))
    case "mayor" => Some(Quest("evac_supplies","准备应急撤离物资",QuestStatus.offered,Some(hour+18),"将一份食物送到诊所应急箱，再向村长汇报；提前准备可缩短之后的撤离时间。",issuer=Some("mayor")))
    case _ => None
  private def active(a: Adventure,id: String): Boolean = a.quests.exists(q=>q.id==id && q.status==QuestStatus.active)
  private def present(a: Adventure,id: String): Boolean = a.npcs.exists(n=>n.id==id && n.place==a.place && n.condition==NpcCondition.healthy)
  private def addClue(a: Adventure,text: String,hours: Int): Adventure =
    if a.clues.contains(text) then a else Rules.advance(a.copy(hour=a.hour+hours,clues=a.clues :+ text,events=a.events :+ text))
  private[game] def findMinerLetter(a: Adventure): (Adventure,String) =
    val clue="矿工来信：矿工提到事故前曾听到异常响声。"
    val route="矿工手绘路线：东侧检修井通向矿工休息处。"
    val found=addClue(a,clue,2)
    if found.sealedEnding then (found,"寻找来信期间黑雾失控，村庄进入危机结局。")
    else
      val next=if found.clues.contains(route) then found else found.copy(clues=found.clues :+ route,events=found.events :+ route)
      (next,s"$clue 信里还夹着一张通往休息处的路线图。")
  private def finish(a: Adventure,id: String,person: String,reward: Option[String],gold: Int): Adventure =
    val newItems=reward match
      case None => a.items
      case Some(item) =>
        val old=a.items.find(_.id==item).fold(0)(_.quantity)
        a.items.filterNot(_.id==item) :+ ItemStack(item,old+1)
    val title=a.quests.find(_.id==id).map(_.title).getOrElse("人物请求")
    val fact=s"玩家完成了请求：$title。"
    val npcs=a.npcs.map(n=>if n.id==person then n.copy(trust=math.min(100,n.trust+10),knownTrust=Some(math.min(100,n.trust+10)),memories=(n.memories :+ fact).distinct,facts=(n.facts :+ NpcFact(fact,"亲身经历")).distinct) else n)
    a.copy(quests=a.quests.map(q=>if q.id==id then q.copy(status=QuestStatus.completed) else q),npcs=npcs,items=newItems,money=a.money+gold,events=a.events :+ s"完成请求：$id")
  private[game] def perform(a: Adventure,action: String): Option[Either[AppError,(Adventure,String,Option[Int],Option[Int],Option[Int])]] =
    val result: Option[Either[AppError,(Adventure,String)]] = action match
      case "find:smith_map" if a.place=="forge" && active(a,"smith_map") =>
        val clue="铁匠旧图：矿道侧线通往森林一侧。"
        Some(Right((addClue(a,clue,1),clue)))
      case "deliver:smith_map" if active(a,"smith_map") && present(a,"smith") && a.clues.contains("铁匠旧图：矿道侧线通往森林一侧。") =>
        Some(Right((finish(a,"smith_map","smith",Some("oil"),0),"铁匠收下旧图，并给你一份灯油。")))
      case "find:mia_letter" if a.place=="forest" && active(a,"mia_letter") =>
        Some(Right(findMinerLetter(a)))
      case "deliver:mia_letter" if active(a,"mia_letter") && present(a,"mia") && a.clues.contains("矿工来信：矿工提到事故前曾听到异常响声。") =>
        Some(Right((finish(a,"mia_letter","mia",None,0),"米娅收下信，感谢你带回消息。")))
      case "find:merchant_supply" if a.place=="camp" && Locations.safe(a) && active(a,"merchant_supply") =>
        val clue="补给清单：旅商的包裹被留在营地。"
        Some(Right((addClue(a,clue,1),clue)))
      case "deliver:merchant_supply" if active(a,"merchant_supply") && present(a,"merchant") && a.clues.contains("补给清单：旅商的包裹被留在营地。") =>
        Some(Right((finish(a,"merchant_supply","merchant",Some("oil"),3),"旅商收下包裹，给你三枚银币和一份灯油。")))
      case "deliver:evac_supplies" if a.place=="clinic" && active(a,"evac_supplies") && !a.events.contains("村庄已备妥撤离物资") =>
        a.items.find(_.id=="food").filter(_.quantity>0) match
          case None => Some(Left(AppError(409,"准备撤离需要一份食物")))
          case Some(food) =>
            val remaining=food.quantity-1
            val items=a.items.filterNot(_.id=="food") ++ (if remaining>0 then List(ItemStack("food",remaining)) else Nil)
            val prepared=a.copy(items=items,events=a.events :+ "村庄已备妥撤离物资")
            Some(Right((addClue(prepared,"撤离准备：一份食物已存入诊所应急箱。",1),"你将一份食物放入应急箱，并记录了准备情况。")))
      case "deliver:evac_report" if active(a,"evac_supplies") && present(a,"mayor") && a.events.contains("村庄已备妥撤离物资") =>
        Some(Right((finish(a,"evac_supplies","mayor",None,0),"村长确认了应急物资，感谢你的准备。")))
      case x if x.startsWith("find:") || x.startsWith("deliver:") && x != "deliver:herbs" => Some(Left(AppError(409,"地点、人物或请求条件尚不满足")))
      case _ => None
    result.map(_.map((next,message)=>(next,message,None,None,None)))

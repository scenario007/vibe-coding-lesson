package services.game.utils
import services.game.objects.*
import services.system.objects.AppError
private[game] object QuestRules:
  private[game] def offer(npc: String, hour: Int): Option[Quest] = npc match
    case "smith" => Some(Quest("smith_map","寻找铁匠的旧图",QuestStatus.offered,Some(hour+18),"寻找铁匠铺中的旧矿图，再交给铁匠。",issuer=Some("smith")))
    case "mia" => Some(Quest("mia_letter","送回未寄出的信",QuestStatus.offered,Some(hour+24),"在森林寻找矿工留下的信，再交给米娅。",issuer=Some("mia")))
    case "merchant" => Some(Quest("merchant_supply","取回营地补给",QuestStatus.offered,Some(hour+18),"前往安全的营地取回补给，再交给旅商。",issuer=Some("merchant")))
    case "healer" => Some(Quest("herbs","为药师寻找药草",QuestStatus.offered,Some(hour+12),"在森林寻找药草，在期限前交给药师；她会提供一份备用净水滤芯。",issuer=Some("healer")))
    case _ => None
  private def active(a: Adventure,id: String): Boolean = a.quests.exists(q=>q.id==id && q.status==QuestStatus.active)
  private def present(a: Adventure,id: String): Boolean = a.npcs.exists(n=>n.id==id && n.place==a.place && n.condition==NpcCondition.healthy)
  private def addClue(a: Adventure,text: String,hours: Int): Adventure =
    if a.clues.contains(text) then a else Rules.advance(a.copy(hour=a.hour+hours,clues=a.clues :+ text,events=a.events :+ text))
  private def finish(a: Adventure,id: String,person: String,reward: Option[String],gold: Int): Adventure =
    val newItems=reward match
      case None => a.items
      case Some(item) =>
        val old=a.items.find(_.id==item).fold(0)(_.quantity)
        a.items.filterNot(_.id==item) :+ ItemStack(item,old+1)
    val npcs=a.npcs.map(n=>if n.id==person then n.copy(trust=math.min(100,n.trust+10),knownTrust=Some(math.min(100,n.trust+10)),memories=(n.memories :+ s"玩家完成请求：$id").distinct) else n)
    a.copy(quests=a.quests.map(q=>if q.id==id then q.copy(status=QuestStatus.completed) else q),npcs=npcs,items=newItems,money=a.money+gold,events=a.events :+ s"完成请求：$id")
  private[game] def perform(a: Adventure,action: String): Option[Either[AppError,(Adventure,String,Option[Int],Option[Int],Option[Int])]] =
    val result: Option[Either[AppError,(Adventure,String)]] = action match
      case "find:smith_map" if a.place=="forge" && active(a,"smith_map") =>
        val clue="铁匠旧图：矿道侧线通往森林一侧。"
        Some(Right((addClue(a,clue,1),clue)))
      case "deliver:smith_map" if active(a,"smith_map") && present(a,"smith") && a.clues.contains("铁匠旧图：矿道侧线通往森林一侧。") =>
        Some(Right((finish(a,"smith_map","smith",Some("oil"),0),"铁匠收下旧图，并给你一份灯油。")))
      case "find:mia_letter" if a.place=="forest" && active(a,"mia_letter") =>
        val clue="矿工来信：矿工提到事故前曾听到异常响声。"
        Some(Right((addClue(a,clue,2),clue)))
      case "deliver:mia_letter" if active(a,"mia_letter") && present(a,"mia") && a.clues.contains("矿工来信：矿工提到事故前曾听到异常响声。") =>
        Some(Right((finish(a,"mia_letter","mia",None,0),"米娅收下信，感谢你带回消息。")))
      case "find:merchant_supply" if a.place=="camp" && Locations.safe(a) && active(a,"merchant_supply") =>
        val clue="补给清单：旅商的包裹被留在营地。"
        Some(Right((addClue(a,clue,1),clue)))
      case "deliver:merchant_supply" if active(a,"merchant_supply") && present(a,"merchant") && a.clues.contains("补给清单：旅商的包裹被留在营地。") =>
        Some(Right((finish(a,"merchant_supply","merchant",Some("oil"),3),"旅商收下包裹，给你三枚银币和一份灯油。")))
      case x if x.startsWith("find:") || x.startsWith("deliver:") && x != "deliver:herbs" => Some(Left(AppError(409,"地点、人物或请求条件尚不满足")))
      case _ => None
    result.map(_.map((next,message)=>(next,message,None,None,None)))

package services.game.utils
import services.game.objects.*
import services.system.objects.AppError
private[game] object ResolutionRules:
  private def count(a: Adventure,id: String): Int = a.items.find(_.id==id).fold(0)(_.quantity)
  private def take(a: Adventure,id: String): Adventure =
    val remain=count(a,id)-1
    a.copy(items=a.items.filterNot(_.id==id) ++ (if remain>0 then List(ItemStack(id,remain)) else Nil))
  private def helper(a: Adventure, id: String): Boolean = a.npcs.exists(n => n.id==id && n.met && n.place==a.place && n.condition==NpcCondition.healthy && n.trust>=50)
  private[game] def validShape(p: ResolutionPlan): Boolean = (p.method,p.support,p.person) match
    case ("unsupported","none",None) => true
    case ("evacuate","supplies",None) | ("contain","oil",None) | ("water","oil",None) => true
    case ("evacuate","person",Some("guard")) => true
    case ("contain","person",Some(id)) if Set("guard","smith").contains(id) => true
    case ("water","person",Some(id)) if Set("healer","smith").contains(id) => true
    case _ => false
  private[game] def preview(a: Adventure, p: ResolutionPlan): Either[AppError,ResolutionPreview] =
    val available = (p.method,p.support,p.person) match
      case ("evacuate","supplies",None) if a.stage>=1 && a.events.contains("村庄已备妥撤离物资") => Some(("使用事先准备的物资组织撤离；黑雾来源可能仍未解决。",1))
      case ("evacuate","supplies",None) if a.stage>=1 && count(a,"food")>=1 => Some(("使用一份食物，组织村民撤离；黑雾来源可能仍未解决。",2))
      case ("evacuate","person",Some("guard")) if a.stage>=1 && helper(a,"guard") => Some(("与在场且信任你的守卫组织撤离；黑雾来源可能仍未解决。",4))
      case ("contain","oil",None) if a.stage==2 && a.events.contains("已准备控制污染源") && count(a,"oil")>=1 => Some(("使用一份灯油，依据已查明的矿洞记录控制污染源。",2))
      case ("contain","person",Some(id)) if a.stage==2 && a.events.contains("已准备控制污染源") && Set("guard","smith").contains(id) && helper(a,id) => Some(("与在场且信任你的村民协作，依据已查明的矿洞记录控制污染源。",4))
      case ("water","oil",None) if a.stage>=1 && count(a,"filter")>=1 && count(a,"oil")>=1 => Some(("使用净水滤芯与一份灯油保护水源，争取村庄暂时安全。",2))
      case ("water","person",Some(id)) if a.stage>=1 && count(a,"filter")>=1 && Set("healer","smith").contains(id) && helper(a,id) => Some(("与在场且信任你的村民使用净水滤芯保护水源，争取村庄暂时安全。",4))
      case _ => None
    available match
      case None if p.method=="contain" && a.stage==2 && !a.events.contains("已准备控制污染源") => Left(AppError(422,"控制污染源前需要先在矿洞准备现场"))
      case None => Left(AppError(422,"方案与已知线索、在场人物或可用资源不符"))
      case Some((description,hours)) => Right(ResolutionPreview(p,description,hours,if a.hour+hours>=81 then Some("执行期间危机可能失控") else None))
  private[game] def execute(a: Adventure, p: ResolutionPlan): Either[AppError,(Adventure,Boolean)] = preview(a,p).map { v =>
    val usedFood=if p.support=="supplies" && !a.events.contains("村庄已备妥撤离物资") then take(a,"food") else a
    val usedOil=if p.support=="oil" then take(usedFood,"oil") else usedFood
    val usedFilter=if p.method=="water" then take(usedOil,"filter") else usedOil
    val progressed=Rules.advance(usedFilter.copy(hour=usedFilter.hour+v.hours,events=usedFilter.events :+ s"实施方案：${v.description}"))
    if progressed.sealedEnding then (progressed,false)
    else
      val conclusion=p.method match
        case "evacuate" => "村民完成撤离；黑雾的来源仍未得到解决。"
        case "water" => "水源得到保护，村庄暂时安全；黑雾的来源仍需后续处理。"
        case "contain" if a.truth=="mine_accident" => "依据矿洞记录组织封堵与通风，村庄危机得到控制。"
        case "contain" => "依据处理记录停止药剂投放并隔离污染源，村庄危机得到控制。"
        case _ => "方案实施完成。"
      (progressed.copy(stage=3,sealedEnding=true,events=progressed.events :+ conclusion),true)
  }

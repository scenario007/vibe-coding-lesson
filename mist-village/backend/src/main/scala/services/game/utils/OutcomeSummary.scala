package services.game.utils

import services.game.objects.{Adventure,MinerStatus,NpcCondition,NpcView}

private[game] object OutcomeSummary:
  private[game] def describe(a: Adventure): String =
    val conclusion=a.events.lastOption.getOrElse("旅程结束。")
    val miner=if conclusion.contains("矿工") then "" else a.knownMinerStatus match
      case MinerStatus.rescued => " 你救出的失踪矿工已经脱险。"
      case MinerStatus.lost => " 你确认失踪矿工已无法获救。"
      case MinerStatus.missing => ""
    val people=a.npcs.filter(_.met).sortBy(n =>
      -(math.abs(n.knownTrust.getOrElse(50)-50) + (if a.companion.contains(n.id) then 20 else 0))
    ).take(3).map { n =>
      val state=n.knownCondition match
        case Some(NpcCondition.deceased) => "，已知遇难"
        case Some(NpcCondition.injured) => "，最后一次得知时受伤"
        case _ => ""
      s"${n.name}（${NpcView.attitudeFor(n.knownTrust.getOrElse(50))}$state）"
    }
    val peopleText=if people.isEmpty then "" else s" 你关心的人：${people.mkString("、")}。"
    conclusion+miner+peopleText

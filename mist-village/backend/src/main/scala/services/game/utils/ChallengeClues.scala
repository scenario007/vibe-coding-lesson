package services.game.utils

import services.game.objects.{Adventure,ChallengeTruth}

private[game] object ChallengeClues:
  private[game] def statements(plan: ChallengeTruth): List[String] =
    val awareness=if plan.knowledge=="aware" then "事故前我收到过风险提示。" else "事故前我没有意识到存在这样的风险。"
    val motive=plan.motive match
      case "economic" => "当时我很担心停工会影响村民的生计。"
      case "safety" => "当时我担心仓促处置会引发新的危险。"
      case _ => "当时我没有完整核查相关记录。"
    List(awareness,motive)

  private[game] def records(a: Adventure): List[String] = a.challengeTruth.toList.flatMap { plan =>
    val name=a.npcs.find(_.id==plan.involvedNpc).map(_.name).getOrElse("相关人士")
    val awareness=if plan.knowledge=="aware" then s"档案补页：${name}曾收到事故风险提示。" else s"档案补页：${name}负责的材料中没有明确的风险提示。"
    val motive=plan.motive match
      case "economic" => s"会议记录：${name}曾提出停工可能影响村民生计。"
      case "safety" => s"会议记录：${name}曾担心仓促处置引发新的危险。"
      case _ => s"会议记录：${name}当时没有完整核查相关记录。"
    List(awareness,motive)
  }

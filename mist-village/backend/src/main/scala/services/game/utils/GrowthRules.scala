package services.game.utils

import services.game.objects.{Adventure,PlayerStats}
import services.game.objects.apiTypes.GrowthOption

private[game] object GrowthRules:
  private[game] def options(a: Adventure): List[GrowthOption] =
    val s=a.stats.getOrElse(PlayerStats.forRole(a.role))
    val speakers=a.dialogue.filter(_.speaker!=a.name).map(_.speaker).distinct
    val choices=List(
      ("body","体魄 +1",Option.when(s.body>=4)("体魄已达上限")),
      ("agility","敏捷 +1",Option.when(s.agility>=4)("敏捷已达上限")),
      ("insight","洞察 +1",Option.when(s.insight>=4)("洞察已达上限")),
      ("social","交涉 +1",Option.when(s.social>=4)("交涉已达上限")),
      ("mine_sense","矿道经验",if s.talents.contains("mine_sense") then Some("已经掌握") else Option.when(!a.clues.exists(c=>c.startsWith("矿洞报告") || c.startsWith("矿洞记录") || c.startsWith("档案残页") || c.startsWith("药剂账册") || c.startsWith("铁匠铺工单")))("需要调查过矿洞相关记录")),
      ("investigator","调查直觉",if s.talents.contains("investigator") then Some("已经掌握") else Option.when(!a.events.contains("搜索森林") && !a.clues.exists(_.startsWith("森林足迹")))("需要有森林调查经历")),
      ("mediator","善于协商",if s.talents.contains("mediator") then Some("已经掌握") else Option.when(speakers.size<2)("需要与至少两位人物交谈"))
    )
    val block=if a.dead || a.sealedEnding then Some("当前档案不能成长") else if a.aiPause.nonEmpty || a.battle.nonEmpty || a.pendingRecovery.nonEmpty then Some("请先处理当前情况") else Option.when(s.growthPoints<=0)("没有可用成长机会")
    choices.map { (id,name,reason) =>
      val unavailable=block.orElse(reason)
      GrowthOption(id,name,unavailable.isEmpty,unavailable)
    }

package services.economy.api
import services.system.objects.ActionResult
import services.system.objects.AppError
import services.quests.objects.QuestId
import services.quests.objects.QuestStatus
import services.economy.objects.RewardDesign
import services.economy.objects.RewardDraft
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIMessage
import services.quests.tables.quest.QuestTable
import services.economy.tables.rewardDesign.RewardDesignTable

final case class SetQuestRewardAPIMessage(userId: UserId,questId: QuestId,reward: RewardDraft) extends APIMessage[ActionResult]:
  def plan(connection: Connection): IO[ActionResult] =
    for
      quest <- QuestTable.findById(connection,questId,userId).flatMap(v=>IO.fromOption(v)(AppError(404,"找不到任务")))
      _ <- if quest.status==QuestStatus.draft && reward.name.trim.nonEmpty && reward.name.length<=60 && reward.story.trim.nonEmpty && reward.story.length<=500 then IO.unit else IO.raiseError(AppError(400,"请检查奖励名称、文案与模板样式"))
      existing <- RewardDesignTable.find(connection,questId)
      _ <- existing match
        case Some(_) => RewardDesignTable.updateDraft(connection,questId,reward).void
        case None => IO(UUID.randomUUID().toString).flatMap(id=>RewardDesignTable.insert(connection,RewardDesign(id,questId,reward.name.trim,reward.story,reward.symbol,reward.palette))).void
    yield ActionResult(true)

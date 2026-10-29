package services.quests.api
import services.system.objects.AppError
import services.quests.objects.QuestCategory
import services.quests.objects.apiTypes.QuestDetail
import services.quests.objects.QuestId
import services.quests.objects.QuestStatus
import services.quests.objects.QuestStep
import services.economy.objects.RewardDraft
import services.quests.objects.RewardTier
import services.quests.objects.StageDraft
import services.quests.objects.StepId
import services.ai.objects.JobId
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable
import services.quests.tables.questStep.QuestStepTable

import services.quests.utils.QuestValidation
import services.economy.api.SetQuestRewardAPIMessage
final case class SaveQuestDraftAPIMessage(userId: UserId, questId: QuestId, version: Int, title: String, category: QuestCategory, description: String, dueDate: Option[String], tier: RewardTier, stages: List[StageDraft], reward: RewardDraft, jobId: Option[JobId]) extends APIWithTokenMessage[QuestDetail]:
  override def plan(connection: Connection): IO[QuestDetail] =
    for
      current <- QuestTable.lock(connection,questId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这项任务")))
      _ <- if current.status==QuestStatus.draft && current.version==version then IO.unit else IO.raiseError(AppError(409,"任务已开始或已被更新，请刷新后重试"))
      _ <- QuestValidation.validate(title,description,dueDate,stages)
      trustedReward <- QuestValidation.trustedReward(connection,userId,jobId,reward)
      _ <- QuestTable.save(connection,current.copy(title=title.trim,category=category,description=description,dueDate=dueDate,tier=tier,version=version+1))
      _ <- QuestStepTable.deleteDraftSteps(connection,questId)
      _ <- stages.zipWithIndex.traverse_ { case (s,index) => IO(UUID.randomUUID().toString).flatMap(id => QuestStepTable.insert(connection,QuestStep(StepId(id),questId,index,s.title.trim,s.description,s.checklist,s.minutes,s.criterion,s.dependsOn,None))) }
      _ <- SetQuestRewardAPIMessage(userId,questId,trustedReward,jobId.isEmpty).plan(connection)
      detail <- GetQuestAPIMessage(userId,questId).plan(connection)
    yield detail

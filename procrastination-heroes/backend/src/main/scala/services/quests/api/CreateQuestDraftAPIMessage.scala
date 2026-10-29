package services.quests.api
import services.system.objects.AppError
import services.ai.objects.JobId
import services.quests.objects.QuestCategory
import services.quests.objects.apiTypes.QuestDetail
import services.quests.objects.QuestId
import services.quests.objects.QuestRecord
import services.quests.objects.QuestStatus
import services.quests.objects.QuestStep
import services.economy.objects.RewardDraft
import services.quests.objects.RewardTier
import services.quests.objects.StageDraft
import services.quests.objects.StepId
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
final case class CreateQuestDraftAPIMessage(userId: UserId, title: String, category: QuestCategory, description: String, dueDate: Option[String], tier: RewardTier, stages: List[StageDraft], reward: RewardDraft, jobId: Option[JobId]) extends APIWithTokenMessage[QuestDetail]:
  override def plan(connection: Connection): IO[QuestDetail] =
    for
      _ <- QuestValidation.validate(title,description,dueDate,stages)
      trustedReward <- QuestValidation.trustedReward(connection,userId,jobId,reward)
      id <- IO(UUID.randomUUID().toString).map(QuestId(_))
      now <- IO.realTime.map(_.toMillis)
      quest = QuestRecord(id,userId,title.trim,category,description,dueDate,tier,QuestStatus.draft,QuestStatus.draft,1,"",now,None)
      _ <- QuestTable.insert(connection,quest)
      budget = QuestValidation.coinBudget(tier)
      _ <- stages.zipWithIndex.traverse_ { case (s,index) =>
        IO(UUID.randomUUID().toString).flatMap(stepId => QuestStepTable.insert(connection,QuestStep(StepId(stepId),id,index,s.title.trim,s.description,s.checklist,s.minutes,s.criterion,s.dependsOn,None,budget/stages.size+(if index==stages.size-1 then budget%stages.size else 0))))
      }
      _ <- SetQuestRewardAPIMessage(userId,id,trustedReward,jobId.isEmpty).plan(connection)
      detail <- GetQuestAPIMessage(userId,id).plan(connection)
    yield detail

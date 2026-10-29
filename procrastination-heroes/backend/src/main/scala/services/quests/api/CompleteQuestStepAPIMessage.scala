package services.quests.api
import services.system.objects.AppError
import services.quests.objects.QuestId
import services.quests.objects.QuestStatus
import services.economy.objects.RewardEvent
import services.quests.objects.apiTypes.StepCompletionResponse
import services.quests.objects.StepId
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import java.time.{Instant, ZoneId}
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable
import services.quests.tables.questStep.QuestStepTable
import services.users.tables.user.UserTable
import services.economy.tables.rewardEvent.RewardEventTable
import services.economy.tables.taskReward.TaskRewardTable

final case class CompleteQuestStepAPIMessage(userId: UserId, questId: QuestId, stepId: StepId) extends APIWithTokenMessage[StepCompletionResponse]:
  override def plan(connection: Connection): IO[StepCompletionResponse] =
    for
      _ <- UserTable.lock(connection,userId)
      quest <- QuestTable.lock(connection,questId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这项任务")))
      steps <- QuestStepTable.list(connection,questId)
      step <- IO.fromOption(steps.find(_.id==stepId))(AppError(404,"找不到这个步骤"))
      already = step.completedAt.nonEmpty
      _ <- if already || quest.status==QuestStatus.active then IO.unit else IO.raiseError(AppError(409,"请先开始这项任务；归档任务需先恢复"))
      _ <- if already || step.dependsOn.forall(p=>steps.exists(s=>s.position==p && s.completedAt.nonEmpty)) then IO.unit else IO.raiseError(AppError(409,"先完成前置步骤，再继续这一关"))
      now <- IO.realTime.map(_.toMillis)
      day = Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Shanghai")).toLocalDate.toString
      _ <- if already then IO.unit else
        for
          _ <- QuestStepTable.complete(connection,stepId,now)
          eventId <- IO(UUID.randomUUID().toString)
          _ <- RewardEventTable.insert(connection,userId,RewardEvent(eventId,questId,stepId,now),day)
        yield ()
      finished = steps.forall(s=>s.id==stepId || s.completedAt.nonEmpty)
      _ <- if finished && !already then
        for
          _ <- QuestTable.save(connection,quest.copy(status=QuestStatus.completed,completedAt=Some(now),version=quest.version+1))
          rewardId <- IO(UUID.randomUUID().toString)
          _ <- TaskRewardTable.unlock(connection,userId,questId,rewardId,now)
        yield ()
      else IO.unit
      detail <- GetQuestAPIMessage(userId,questId).plan(connection)
    yield StepCompletionResponse(detail,already,finished && !already)

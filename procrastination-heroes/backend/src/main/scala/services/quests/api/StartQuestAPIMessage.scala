package services.quests.api
import services.system.objects.AppError
import services.quests.objects.apiTypes.QuestDetail
import services.quests.objects.QuestId
import services.quests.objects.QuestStatus
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable


final case class StartQuestAPIMessage(userId: UserId, questId: QuestId) extends APIWithTokenMessage[QuestDetail]:
  override def plan(connection: Connection): IO[QuestDetail] =
    for
      quest <- QuestTable.lock(connection,questId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这项任务")))
      _ <- quest.status match
        case QuestStatus.draft => QuestTable.save(connection,quest.copy(status=QuestStatus.active,version=quest.version+1)).void
        case QuestStatus.active => IO.unit
        case _ => IO.raiseError(AppError(409,"该任务目前不能开始"))
      detail <- GetQuestAPIMessage(userId,questId).plan(connection)
    yield detail

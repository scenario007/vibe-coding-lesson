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


final case class ArchiveQuestAPIMessage(userId: UserId, questId: QuestId) extends APIWithTokenMessage[QuestDetail]:
  override def plan(connection: Connection): IO[QuestDetail] =
    for
      quest <- QuestTable.lock(connection,questId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这项任务")))
      next = if quest.status==QuestStatus.archived then quest else quest.copy(status=QuestStatus.archived,archivedFrom=quest.status,version=quest.version+1)
      _ <- QuestTable.save(connection,next)
      detail <- GetQuestAPIMessage(userId,questId).plan(connection)
    yield detail

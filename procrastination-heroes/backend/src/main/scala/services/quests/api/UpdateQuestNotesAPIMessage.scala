package services.quests.api
import services.system.objects.AppError
import services.quests.objects.apiTypes.QuestDetail
import services.quests.objects.QuestId
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.time.LocalDate
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable


final case class UpdateQuestNotesAPIMessage(userId: UserId, questId: QuestId, reflection: String, dueDate: Option[String]) extends APIWithTokenMessage[QuestDetail]:
  override def plan(connection: Connection): IO[QuestDetail] =
    for
      quest <- QuestTable.lock(connection,questId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这项任务")))
      _ <- if reflection.length<=3000 && dueDate.forall(d=>scala.util.Try(LocalDate.parse(d)).isSuccess) then IO.unit else IO.raiseError(AppError(400,"请检查复盘长度或截止日期"))
      _ <- QuestTable.save(connection,quest.copy(reflection=reflection,dueDate=dueDate,version=quest.version+1))
      detail <- GetQuestAPIMessage(userId,questId).plan(connection)
    yield detail

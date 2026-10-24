package services.quests.api
import services.quests.objects.apiTypes.QuestDetail
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable


final case class ListQuestsAPIMessage(userId: UserId) extends APIWithTokenMessage[List[QuestDetail]]:
  override def plan(connection: Connection): IO[List[QuestDetail]] =
    QuestTable.listForUser(connection,userId).flatMap(_.traverse(q => GetQuestAPIMessage(userId,q.id).plan(connection)))

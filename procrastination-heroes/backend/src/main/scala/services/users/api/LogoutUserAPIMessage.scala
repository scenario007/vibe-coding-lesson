package services.users.api
import services.system.objects.ActionResult
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.users.tables.session.SessionTable


final case class LogoutUserAPIMessage(userId: UserId) extends APIWithTokenMessage[ActionResult]:
  override def plan(connection: Connection): IO[ActionResult] =
    SessionTable.deleteForUser(connection,userId).as(ActionResult(true))

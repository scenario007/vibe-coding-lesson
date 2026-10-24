package services.focus.api
import services.focus.objects.FocusSession
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage

import services.focus.tables.focusSession.FocusSessionTable

final case class ListFocusHistoryAPIMessage(userId: UserId) extends APIWithTokenMessage[List[FocusSession]]:
  override def plan(connection: Connection): IO[List[FocusSession]] =
    FocusSessionTable.history(connection,userId)

package services.focus.api
import services.focus.objects.apiTypes.FocusResponse
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.users.tables.user.UserTable

import services.focus.utils.FocusTiming
final case class GetCurrentFocusAPIMessage(userId: UserId) extends APIWithTokenMessage[FocusResponse]:
  override def plan(connection: Connection): IO[FocusResponse] =
    for
      _ <- UserTable.lock(connection,userId)
      now <- IO.realTime.map(_.toMillis)
      current <- FocusTiming.current(connection,userId,now)
    yield FocusResponse(current,now)

package services.focus.api
import services.focus.objects.apiTypes.FocusResponse
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage

import services.focus.utils.FocusTiming
final case class AbandonFocusAPIMessage(userId: UserId) extends APIWithTokenMessage[FocusResponse]:
  override def plan(connection: Connection): IO[FocusResponse] =
    FocusTiming.transition(connection,userId,"abandon")

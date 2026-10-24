package services.users.api
import services.system.objects.AppError
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIMessage
import services.users.tables.session.SessionTable

import services.users.utils.Passwords
final case class ResolveUserTokenAPIMessage(token: String) extends APIMessage[UserId]:
  def plan(connection: Connection): IO[UserId] =
    for
      now <- IO.realTime.map(_.toMillis)
      user <- SessionTable.resolve(connection,Passwords.tokenHash(token),now).flatMap(v => IO.fromOption(v)(AppError(401,"登录已过期，请重新登录")))
    yield user

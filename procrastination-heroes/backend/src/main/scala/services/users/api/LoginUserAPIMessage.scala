package services.users.api
import services.system.objects.AppError
import services.users.objects.apiTypes.AuthResponse
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIMessage
import services.users.tables.user.UserTable
import services.users.tables.session.SessionTable

import services.users.utils.Passwords
final case class LoginUserAPIMessage(username: String, password: String) extends APIMessage[AuthResponse]:
  override def plan(connection: Connection): IO[AuthResponse] =
    for
      stored <- UserTable.findByUsername(connection,username.trim.toLowerCase).flatMap(v => IO.fromOption(v)(AppError(401,"账号或密码不正确")))
      valid <- IO.blocking(Passwords.matches(password,stored.salt,stored.passwordHash))
      _ <- if valid then IO.unit else IO.raiseError(AppError(401,"账号或密码不正确"))
      now <- IO.realTime.map(_.toMillis)
      token <- IO.blocking(Passwords.token())
      _ <- SessionTable.insert(connection,Passwords.tokenHash(token),stored.profile.id,now+7L*24*3600*1000)
    yield AuthResponse(token,stored.profile)

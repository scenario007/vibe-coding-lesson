package services.users.api
import services.system.objects.AppError
import services.users.objects.apiTypes.AuthResponse
import services.users.objects.StoredUser
import services.users.objects.UserAvatar
import services.users.objects.UserId
import services.users.objects.UserProfile
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIMessage
import services.users.tables.user.UserTable
import services.users.tables.session.SessionTable

import services.users.utils.Passwords
final case class RegisterUserAPIMessage(username: String, password: String, nickname: String) extends APIMessage[AuthResponse]:
  override def plan(connection: Connection): IO[AuthResponse] =
    val clean = username.trim.toLowerCase
    for
      _ <- if clean.matches("[a-z0-9_]{3,30}") && password.length>=8 && password.length<=128 && nickname.trim.nonEmpty && nickname.trim.length<=24 then IO.unit else IO.raiseError(AppError(400,"账号需为 3–30 位英文、数字或下划线；密码至少 8 位，昵称 1–24 字"))
      existing <- UserTable.findByUsername(connection,clean)
      _ <- if existing.isEmpty then IO.unit else IO.raiseError(AppError(409,"这个账号已被使用"))
      id <- IO(UUID.randomUUID().toString).map(UserId(_))
      salt <- IO.blocking(Passwords.salt())
      hash <- IO.blocking(Passwords.hash(password,salt))
      now <- IO.realTime.map(_.toMillis)
      profile = UserProfile(id,clean,nickname.trim,UserAvatar.leaf,3,25,now)
      _ <- UserTable.insert(connection,StoredUser(profile,hash,salt))
      token <- IO.blocking(Passwords.token())
      _ <- SessionTable.insert(connection,Passwords.tokenHash(token),id,now+7L*24*3600*1000)
    yield AuthResponse(token,profile)

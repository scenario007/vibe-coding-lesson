package services.users.api
import services.system.objects.AppError
import services.users.objects.UserId
import services.users.objects.UserProfile
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.users.tables.user.UserTable


final case class GetCurrentUserAPIMessage(userId: UserId) extends APIWithTokenMessage[UserProfile]:
  override def plan(connection: Connection): IO[UserProfile] =
    UserTable.findById(connection,userId).flatMap(v => IO.fromOption(v.map(_.profile))(AppError(401,"登录已过期，请重新登录")))

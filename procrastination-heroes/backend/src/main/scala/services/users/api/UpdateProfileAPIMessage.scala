package services.users.api
import services.system.objects.AppError
import services.users.objects.UserAvatar
import services.users.objects.UserId
import services.users.objects.UserProfile
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.users.tables.user.UserTable


final case class UpdateProfileAPIMessage(userId: UserId, nickname: String, avatar: UserAvatar, dailyGoal: Int, focusMinutes: Int) extends APIWithTokenMessage[UserProfile]:
  override def plan(connection: Connection): IO[UserProfile] =
    for
      _ <- if nickname.trim.nonEmpty && nickname.trim.length<=24 && Set("leaf","star","moon","flower","book","mountain").contains(avatar.toString) && dailyGoal>=1 && dailyGoal<=20 && Set(10,25,45).contains(focusMinutes) then IO.unit else IO.raiseError(AppError(400,"资料填写不完整或数值超出范围"))
      _ <- UserTable.updateProfile(connection,userId,nickname.trim,avatar,dailyGoal,focusMinutes)
      user <- GetCurrentUserAPIMessage(userId).plan(connection)
    yield user

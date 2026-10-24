package services.users.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class UserProfile(id: UserId, username: String, nickname: String, avatar: UserAvatar, dailyGoal: Int, focusMinutes: Int, createdAt: Long)
object UserProfile:
  given Encoder[UserProfile] = deriveEncoder[UserProfile]
  given Decoder[UserProfile] = deriveDecoder[UserProfile]

package services.users.objects
import io.circe.{Encoder, Decoder}
enum UserAvatar:
  case leaf, star, moon, flower, book, mountain
object UserAvatar:
  def toString(value: UserAvatar): String = value.toString
  def fromString(value: String): Either[String,UserAvatar] = UserAvatar.values.find(_.toString==value.trim.toLowerCase).toRight("不支持的 UserAvatar")
  given Encoder[UserAvatar] = Encoder.encodeString.contramap(toString)
  given Decoder[UserAvatar] = Decoder.decodeString.emap(fromString)

package services.game.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class Quest(id: String, title: String, status: QuestStatus, deadline: Option[Int], description: String, goal: Option[String] = None, issuer: Option[String] = None, reward: Option[String] = None)
object Quest:
  given Encoder[Quest] = deriveEncoder
  given Decoder[Quest] = deriveDecoder

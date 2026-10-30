package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.game.objects.AdventureView
final case class QuestReply(status: String, message: Option[String], adventure: Option[AdventureView])
object QuestReply:
  given Encoder[QuestReply] = deriveEncoder
  given Decoder[QuestReply] = deriveDecoder

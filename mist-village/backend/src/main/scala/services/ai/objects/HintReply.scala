package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.game.objects.AdventureView
final case class HintReply(status: String, message: Option[String], hint: Option[Hint], adventure: Option[AdventureView])
object HintReply:
  given Encoder[HintReply] = deriveEncoder
  given Decoder[HintReply] = deriveDecoder

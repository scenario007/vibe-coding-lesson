package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class DialogueEntry(speaker: String, text: String, hour: Int, place: String)
object DialogueEntry:
  given Encoder[DialogueEntry] = deriveEncoder
  given Decoder[DialogueEntry] = deriveDecoder

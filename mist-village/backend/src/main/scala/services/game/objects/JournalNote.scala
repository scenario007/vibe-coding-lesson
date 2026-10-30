package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class JournalNote(id: String, text: String, clueIndexes: List[Int], createdHour: Int)
object JournalNote:
  given Encoder[JournalNote] = deriveEncoder
  given Decoder[JournalNote] = deriveDecoder

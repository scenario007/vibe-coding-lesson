package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class CharacterDraft(body: Int, agility: Int, insight: Int, social: Int)
object CharacterDraft:
  given Encoder[CharacterDraft] = deriveEncoder
  given Decoder[CharacterDraft] = deriveDecoder

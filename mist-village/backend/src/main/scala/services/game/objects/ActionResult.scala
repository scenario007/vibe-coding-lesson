package services.game.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class ActionResult(adventure: AdventureView, message: String, die: Option[Int], modifier: Option[Int], difficulty: Option[Int], unknownFactor: Boolean)
object ActionResult:
  given Encoder[ActionResult] = deriveEncoder
  given Decoder[ActionResult] = deriveDecoder

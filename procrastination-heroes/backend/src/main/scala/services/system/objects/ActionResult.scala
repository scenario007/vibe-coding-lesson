package services.system.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
final case class ActionResult(ok: Boolean)
object ActionResult:
  given Encoder[ActionResult] = deriveEncoder
  given Decoder[ActionResult] = deriveDecoder

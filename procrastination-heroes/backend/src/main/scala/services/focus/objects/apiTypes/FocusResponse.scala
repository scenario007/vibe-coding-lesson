package services.focus.objects.apiTypes
import services.focus.objects.*
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class FocusResponse(session: Option[FocusSession], serverNow: Long)
object FocusResponse:
  given Encoder[FocusResponse] = deriveEncoder[FocusResponse]
  given Decoder[FocusResponse] = deriveDecoder[FocusResponse]

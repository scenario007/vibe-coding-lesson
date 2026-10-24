package services.focus.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class FocusSegment(sessionId: FocusId, startedAt: Long, endedAt: Long)
object FocusSegment:
  given Encoder[FocusSegment] = deriveEncoder[FocusSegment]
  given Decoder[FocusSegment] = deriveDecoder[FocusSegment]

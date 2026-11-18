package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import services.coach.objects.*

final case class AskCoachRequest(
  analysisId: java.util.UUID,
  question: String,
  segmentId: Option[String],
  start: Option[Double],
  end: Option[Double]
)

object AskCoachRequest:
  given Codec.AsObject[AskCoachRequest] = deriveCodec

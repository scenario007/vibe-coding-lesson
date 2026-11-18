package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import services.coach.objects.*

final case class EditDifficultyRequest(
  analysisId: java.util.UUID,
  id: Option[String],
  remove: Boolean,
  title: Option[String],
  tool: Option[String],
  start: Option[Double],
  end: Option[Double]
)

object EditDifficultyRequest:
  given Codec.AsObject[EditDifficultyRequest] = deriveCodec

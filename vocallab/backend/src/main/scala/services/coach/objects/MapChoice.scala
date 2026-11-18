package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class MapChoice(
  segmentId: String,
  title: String,
  explanation: String,
  sourceIds: Vector[String],
  analysisTools: Vector[String]
)

object MapChoice:
  given Codec.AsObject[MapChoice] = deriveCodec

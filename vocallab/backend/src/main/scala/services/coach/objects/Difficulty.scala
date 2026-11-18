package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class Difficulty(
  id: String,
  tool: String,
  start: Double,
  end: Double,
  title: String,
  explanation: String,
  sourceIds: Vector[String],
  analysisTools: Vector[String],
  manual: Boolean
)

object Difficulty:
  given Codec.AsObject[Difficulty] = deriveCodec

package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class ToolRun(
  tool: String,
  status: String,
  milliseconds: Double
)

object ToolRun:
  given Codec.AsObject[ToolRun] = deriveCodec

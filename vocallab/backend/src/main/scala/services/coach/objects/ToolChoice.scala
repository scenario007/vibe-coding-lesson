package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class ToolChoice(
  tool: String,
  reason: String
)

object ToolChoice:
  given Codec.AsObject[ToolChoice] = deriveCodec

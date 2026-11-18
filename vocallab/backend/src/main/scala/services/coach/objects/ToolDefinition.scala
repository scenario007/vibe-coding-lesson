package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class ToolDefinition(
  id: String,
  label: String,
  minimumSeconds: Double,
  description: String,
  dependencies: Vector[String],
  cost: String
)

object ToolDefinition:
  given Codec.AsObject[ToolDefinition] = deriveCodec

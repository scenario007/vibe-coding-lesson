package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import services.coach.objects.*

final case class CoachView(
  session: Option[CoachSession],
  stale: Boolean,
  aiAvailable: Boolean,
  searchAvailable: Boolean,
  tools: Vector[ToolDefinition]
)

object CoachView:
  given Codec.AsObject[CoachView] = deriveCodec

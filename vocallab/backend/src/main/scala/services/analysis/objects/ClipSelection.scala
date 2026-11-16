package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID

final case class ClipSelection(
  mediaId: UUID,
  start: Double,
  end: Double,
  separate: Boolean,
  separationMode: Option[SeparationMode]
)

object ClipSelection:
  given Encoder[ClipSelection] = deriveEncoder[ClipSelection]
  given Decoder[ClipSelection] = deriveDecoder[ClipSelection]

package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachFollowup(
  tools: Vector[String],
  reason: String,
  segmentId: Option[String]
)

object CoachFollowup:
  given Codec.AsObject[CoachFollowup] = deriveCodec

package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachSettingsStatus(
  model: Option[String],
  searchProvider: String,
  configuredKeys: Set[String],
  keyOverrides: Set[String]
)

object CoachSettingsStatus:
  given Codec.AsObject[CoachSettingsStatus] = deriveCodec

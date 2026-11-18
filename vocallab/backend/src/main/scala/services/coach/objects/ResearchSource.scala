package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class ResearchSource(
  id: String,
  title: String,
  url: String,
  summary: String
)

object ResearchSource:
  given Codec.AsObject[ResearchSource] = deriveCodec

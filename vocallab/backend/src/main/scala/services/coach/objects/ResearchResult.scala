package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class ResearchResult(
  sources: Vector[ResearchSource],
  status: String
)

object ResearchResult:
  given Codec.AsObject[ResearchResult] = deriveCodec

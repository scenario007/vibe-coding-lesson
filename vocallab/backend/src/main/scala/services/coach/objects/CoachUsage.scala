package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachUsage(kind: String, inputTokens: Long, outputTokens: Long, cachedTokens: Long, estimatedYuan: Option[BigDecimal])

object CoachUsage:
  given Codec.AsObject[CoachUsage] = deriveCodec

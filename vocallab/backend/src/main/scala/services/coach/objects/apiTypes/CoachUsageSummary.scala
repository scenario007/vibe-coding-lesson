package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachUsageSummary(
  textCalls: Int,
  inputTokens: Long,
  outputTokens: Long,
  cachedTokens: Long,
  estimatedYuan: Option[BigDecimal],
  unpricedTextCalls: Int,
  unpricedSearches: Int
)

object CoachUsageSummary:
  given Codec.AsObject[CoachUsageSummary] = deriveCodec

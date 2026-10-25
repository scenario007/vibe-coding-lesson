package services.ai.objects.apiTypes
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*
import services.ai.objects.UsageEvent
final case class UsageReport(budgetCny: BigDecimal, textEstimatedCny: BigDecimal, textHeldCny: BigDecimal, assetEstimatedCny: BigDecimal, assetHeldCny: BigDecimal, remainingCny: BigDecimal, measuredTokens: Long, events: List[UsageEvent], assets: List[AssetUsage], billingConnected: Boolean, rateVerifiedAt: String, serverNow: Long)
object UsageReport:
  given Encoder[UsageReport] = deriveEncoder
  given Decoder[UsageReport] = deriveDecoder

package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class UsageReport(requests: Long, inputTokens: Long, outputTokens: Long, estimatedCny: BigDecimal, unconfirmed: Long, reservedCny: BigDecimal)
object UsageReport:
  given Encoder[UsageReport] = deriveEncoder
  given Decoder[UsageReport] = deriveDecoder

package services.ai.objects
import services.users.objects.UserId
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*
final case class UsageEvent(id: JobId, userId: UserId, model: String, status: UsageStatus, inputTokens: Option[Long], outputTokens: Option[Long], cachedTokens: Option[Long], reservedCny: BigDecimal, estimatedCny: Option[BigDecimal], requestId: Option[String], createdAt: Long)
object UsageEvent:
  given Encoder[UsageEvent] = deriveEncoder
  given Decoder[UsageEvent] = deriveDecoder

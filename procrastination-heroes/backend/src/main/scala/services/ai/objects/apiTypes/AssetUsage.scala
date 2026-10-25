package services.ai.objects.apiTypes
import io.circe.{Encoder,Decoder}
import services.ai.objects.AssetStatus
import io.circe.generic.semiauto.*
final case class AssetUsage(name: String, model: String, status: AssetStatus, tokens: Option[Long], estimatedCny: BigDecimal)
object AssetUsage:
  given Encoder[AssetUsage] = deriveEncoder
  given Decoder[AssetUsage] = deriveDecoder

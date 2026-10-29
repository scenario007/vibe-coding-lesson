package services.economy.objects.apiTypes
import services.economy.objects.*
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class BaseResponse(items: List[StoreItem], owned: List[OwnedItem], rewards: List[TaskReward], placements: List[RoomPlacement], progress: PlayerProgress)
object BaseResponse:
  given Encoder[BaseResponse] = deriveEncoder[BaseResponse]
  given Decoder[BaseResponse] = deriveDecoder[BaseResponse]

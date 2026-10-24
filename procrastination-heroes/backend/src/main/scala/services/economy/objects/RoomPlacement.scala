package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class RoomPlacement(slot: RoomSlot, itemId: Option[String], rewardId: Option[String])
object RoomPlacement:
  given Encoder[RoomPlacement] = deriveEncoder[RoomPlacement]
  given Decoder[RoomPlacement] = deriveDecoder[RoomPlacement]

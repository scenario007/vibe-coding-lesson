package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class RoomPlacement(id: String, itemId: Option[String], rewardId: Option[String], x: Int, y: Int)
object RoomPlacement:
  given Encoder[RoomPlacement] = deriveEncoder[RoomPlacement]
  given Decoder[RoomPlacement] = deriveDecoder[RoomPlacement]

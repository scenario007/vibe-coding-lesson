package services.economy.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class FurniturePreview(id: String, prompt: String, refinedDescription: String, slot: RoomSlot, imageUrl: String, createdAt: Long, confirmed: Boolean)
object FurniturePreview:
  given Encoder[FurniturePreview] = deriveEncoder[FurniturePreview]
  given Decoder[FurniturePreview] = deriveDecoder[FurniturePreview]

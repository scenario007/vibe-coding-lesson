package services.ai.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

final case class GeneratedImage(imageUrl: Option[String], refinedDescription: String)
object GeneratedImage:
  given Encoder[GeneratedImage] = deriveEncoder[GeneratedImage]
  given Decoder[GeneratedImage] = deriveDecoder[GeneratedImage]

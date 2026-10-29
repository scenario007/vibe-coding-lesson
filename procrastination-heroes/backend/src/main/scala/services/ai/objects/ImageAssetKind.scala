package services.ai.objects

import io.circe.{Decoder, Encoder}

enum ImageAssetKind:
  case reward, furniture

object ImageAssetKind:
  def fromString(value: String): Either[String, ImageAssetKind] =
    ImageAssetKind.values.find(_.toString == value.trim.toLowerCase).toRight("无效的图片素材类型")

  given Encoder[ImageAssetKind] = Encoder.encodeString.contramap(_.toString)
  given Decoder[ImageAssetKind] = Decoder.decodeString.emap(fromString)

package services.ai.utils

import cats.effect.IO
import services.ai.objects.{GeneratedImage, ImageAssetKind}
import services.users.objects.UserId

private[ai] object ImagePipeline:
  private[ai] def generate(userId: UserId, kind: ImageAssetKind, description: String, assetId: String): IO[GeneratedImage] =
    if !AliyunImageClient.available then IO.pure(GeneratedImage(None,description))
    else
      for
        refined <- TokenHub.refineImageDescription(userId,kind,description)
        image <- AliyunImageClient.generate(kind,s"原始需求（必须遵守）：$description。整理后的视觉描述：$refined",assetId)
      yield GeneratedImage(image,refined)

package services.ai.api

import cats.effect.IO
import java.sql.Connection
import services.ai.objects.{GeneratedImage, ImageAssetKind}
import services.ai.utils.{AliyunImageAuthError, ImagePipeline}
import services.system.api.APIMessage
import services.system.objects.AppError
import services.users.objects.UserId

/** Internal cross-service boundary for the optional Aliyun image generator. */
final case class GenerateImageAPIMessage(userId: UserId, kind: ImageAssetKind, prompt: String, assetId: String)
    extends APIMessage[GeneratedImage]:
  override def plan(connection: Connection): IO[GeneratedImage] =
    ImagePipeline.generate(userId,kind,prompt,assetId).handleErrorWith {
      case error: AliyunImageAuthError => IO.raiseError(AppError(502, error.getMessage))
      case error => IO.raiseError(error)
    }

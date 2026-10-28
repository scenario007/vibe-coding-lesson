package services.ai.api

import cats.effect.IO
import java.sql.Connection
import services.ai.objects.ImageAssetKind
import services.ai.utils.AliyunImageClient
import services.system.api.APIMessage

/** Internal cross-service boundary for the optional Aliyun image generator. */
final case class GenerateImageAPIMessage(kind: ImageAssetKind, prompt: String, assetId: String)
    extends APIMessage[Option[String]]:
  override def plan(connection: Connection): IO[Option[String]] =
    AliyunImageClient.generate(kind, prompt, assetId)

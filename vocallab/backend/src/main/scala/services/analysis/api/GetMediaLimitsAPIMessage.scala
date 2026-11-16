package services.analysis.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.objects.apiTypes.MediaLimits
import services.system.api.NoRequestMessage
import services.system.objects.AppConfig

final case class GetMediaLimitsAPIMessage(config: AppConfig) extends NoRequestMessage[MediaLimits]:
  def plan(connection: Connection): IO[MediaLimits] =
    IO.pure(MediaLimits(config.maxBytes, config.maxClip))

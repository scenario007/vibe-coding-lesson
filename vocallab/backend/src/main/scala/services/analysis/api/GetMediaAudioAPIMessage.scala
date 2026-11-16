package services.analysis.api

import cats.effect.IO
import java.nio.file.Path
import java.sql.Connection
import java.util.UUID
import services.analysis.utils.{AnalysisValidation, LocalFiles}
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class GetMediaAudioAPIMessage(id: UUID, config: AppConfig) extends APIMessage[Path]:
  def plan(connection: Connection): IO[Path] =
    AnalysisValidation.media(connection, id).as(LocalFiles.media(config, id).resolve("audio.flac"))

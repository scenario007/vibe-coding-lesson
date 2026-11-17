package services.analysis.api

import cats.effect.IO
import java.nio.file.{Files, Path}
import java.sql.Connection
import java.util.UUID
import org.http4s.Status
import services.analysis.objects.{JobStatus, Role, TrackKind}
import services.analysis.utils.{AnalysisValidation, LocalFiles}
import services.system.api.APIMessage
import services.system.objects.{ApiError, AppConfig}

final case class GetAnalyzedAudioAPIMessage(id: UUID, role: Role, track: TrackKind, config: AppConfig)
    extends APIMessage[Path]:
  def plan(connection: Connection): IO[Path] =
    for
      job <- AnalysisValidation.job(connection, id)
      folder = LocalFiles.analysis(config, id).resolve(role.toString)
      clip = if role == Role.reference then job.selection.reference else job.selection.user
      previewTrack = if clip.separate then TrackKind.vocals else TrackKind.original
      previewReady <- IO.blocking(track == previewTrack && Files.isRegularFile(folder.resolve("pitch-preview.json")))
      _ <- IO.raiseUnless(job.status == JobStatus.completed || previewReady)(ApiError(Status.Conflict, "音轨尚不可用。"))
      path = folder.resolve(s"$track.wav")
      exists <- IO.blocking(Files.isRegularFile(path))
      _ <- IO.raiseUnless(exists)(ApiError(Status.NotFound, "音轨不存在。"))
    yield path

package services.analysis.api

import cats.effect.IO
import io.circe.parser.decode
import java.nio.file.Files
import java.sql.Connection
import java.util.UUID
import services.analysis.objects.*
import services.analysis.utils.{AnalysisValidation, LocalFiles}
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class GetPitchPreviewAPIMessage(id: UUID, config: AppConfig)
    extends APIMessage[TrackPair[Option[HarmonicPitch]]]:
  def plan(connection: Connection): IO[TrackPair[Option[HarmonicPitch]]] =
    val directory = LocalFiles.analysis(config, id)

    def read(role: Role, clip: ClipSelection): IO[Option[HarmonicPitch]] =
      val path = directory.resolve(role.toString).resolve("pitch-preview.json")
      IO.blocking(Option.when(Files.isRegularFile(path))(Files.readString(path))).flatMap {
        case None => IO.pure(None)
        case Some(raw) => IO.fromEither(decode[HarmonicPitch](raw)).flatMap { track =>
          val frames = track.midiPitch.size
          val measured = track.midiPitch.toVector
          val validBridges = track.bridgedFrames.forall(indices =>
            indices == indices.distinct.sorted && indices.forall(i => measured.lift(i).flatten.nonEmpty))
          val valid = validBridges && track.step == 0.02 && frames >= 2 &&
            math.abs((frames - 1) * track.step - (clip.end - clip.start)) <= 0.05 &&
            track.midiPitch.forall(_.forall(midi => midi >= 36 && midi <= 84))
          IO.raiseUnless(valid)(IllegalStateException("Invalid harmonic pitch track")).as(Some(track))
        }
      }

    for
      job <- AnalysisValidation.job(connection, id)
      reference <- read(Role.reference, job.selection.reference)
      user <- read(Role.user, job.selection.user)
    yield TrackPair(reference, user)

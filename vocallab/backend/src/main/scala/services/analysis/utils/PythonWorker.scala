package services.analysis.utils

import cats.effect.{IO, Ref, Resource}
import io.circe.parser.decode
import io.circe.syntax.*
import java.nio.file.{Files, Path, StandardCopyOption}
import scala.concurrent.duration.*
import org.http4s.Status
import services.analysis.objects.*
import services.analysis.objects.apiTypes.AdjustAlignmentRequest
import services.analysis.tables.AnalysisTable.AnalysisTable
import services.system.api.Database
import services.system.objects.{ApiError, AppConfig}

private[analysis] object PythonWorker:
  def run(db: Database, job: AnalysisJob, config: AppConfig): IO[AnalysisReport] =
    val workspace = LocalFiles.analysis(config, job.analysisId)

    def prepare(role: Role, clip: ClipSelection, media: StoredMedia): IO[TrackSettings] =
      val folder = workspace.resolve(role.toString)
      val context = if clip.separate then 3.0 else 0.0
      val start = math.max(0, clip.start - context)
      val end = math.min(media.metadata.duration, clip.end + context)
      val identity = s"${media.digest}:${media.metadata.audioStream}:$start:$end"
      IO.blocking(Files.createDirectories(folder)) *>
        MediaDecode.clip(LocalFiles.media(config, clip.mediaId).resolve("audio.flac"),
          folder.resolve("context.wav"), start, end - start, clip.separate)
          .as(TrackSettings(clip.start - start, clip.end - clip.start, clip.start, clip.separate, identity,
            clip.separationMode.getOrElse(SeparationMode.precise)))

    for
      reference <- db.use(AnalysisValidation.media(_, job.selection.reference.mediaId))
      user <- db.use(AnalysisValidation.media(_, job.selection.user.mediaId))
      a <- prepare(Role.reference, job.selection.reference, reference)
      b <- prepare(Role.user, job.selection.user, user)
      manifest = WorkerManifest(job.analysisId, workspace.toString, config.models.toString,
        config.runData.resolve("stems").toString, TrackPair(a, b), reference.metadata, user.metadata,
        job.selection.manualOffset)
      request = workspace.resolve("worker.json")
      result = workspace.resolve("result.json")
      _ <- IO.blocking(Files.writeString(request, manifest.asJson.noSpaces))
      error <- Ref.of[IO, Option[String]](None)
      exit <- Command.run(List(config.python.toString, "-m", "vocallab", "analyze", request.toString, result.toString),
        config.root.resolve("dsp"), config.workerSeconds.seconds, {
          case line if line.startsWith("STAGE ") =>
            IO.fromEither(Stage.fromString(line.stripPrefix("STAGE ")).left.map(IllegalStateException(_)))
              .flatMap(stage => db.use(AnalysisTable.update(_, job.analysisId, JobStatus.processing, stage, None)))
          case line if line.startsWith("ERROR ") => error.set(Some(line.stripPrefix("ERROR ")))
          case line if line.nonEmpty => IO.println(s"[DSP ${job.analysisId}] $line")
          case _ => IO.unit
        }, Map("PYTORCH_ENABLE_MPS_FALLBACK" -> "1", "PYTHONUNBUFFERED" -> "1",
          "NUMBA_CACHE_DIR" -> config.runData.resolve("numba").toString))
      message <- error.get
      _ <- IO.raiseUnless(exit == 0)(ApiError(Status.UnprocessableEntity,
        message.getOrElse(if exit == 137 then "分析进程内存不足，请尝试较短的片段。" else "声学分析进程异常退出，请查看本地日志。")))
      verified <- readReport(result, job)
      _ <- IO.blocking(Files.deleteIfExists(request))
    yield verified

  def realign(job: AnalysisJob, input: AdjustAlignmentRequest, config: AppConfig): IO[AnalysisReport] =
    val options = input.manualOffset.toList.flatMap(value => List("--manual", value.toString)) ++
      input.referenceRange.toList.flatMap((start, end) => List("--reference-range", start.toString, end.toString))
    rewrite(job, config, "realign", options, "重新对齐失败，请检查两条音轨。")

  def score(job: AnalysisJob, config: AppConfig): IO[AnalysisReport] =
    rewrite(job, config, "score", Nil, "评分未完成。两条原始分析音轨需要仍在本机。")

  private def rewrite(job: AnalysisJob, config: AppConfig, command: String, options: List[String],
                      failure: String): IO[AnalysisReport] =
    val workspace = LocalFiles.analysis(config, job.analysisId)
    val report = workspace.resolve("result.json")
    Resource.make(IO.blocking(Files.createTempDirectory(workspace, s"$command-")))(LocalFiles.remove).use { directory =>
      val updated = directory.resolve("result.json")
      val args = List(config.python.toString, "-m", "vocallab", command, report.toString, updated.toString)
      for
        exit <- Command.run(args ++ options, config.root.resolve("dsp"), 15.seconds,
          line => IO.println(s"[DSP ${job.analysisId}] $line"))
        _ <- IO.raiseUnless(exit == 0)(ApiError(Status.UnprocessableEntity, failure))
        verified <- readReport(updated, job)
        _ <- IO.blocking(Files.move(updated, report, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING))
      yield verified
    }

  private def readReport(path: Path, job: AnalysisJob): IO[AnalysisReport] =
    for
      size <- IO.blocking(Files.size(path))
      _ <- IO.raiseWhen(size > 16777216)(new IllegalStateException("分析结果超过大小限制。"))
      raw <- IO.blocking(Files.readString(path))
      report <- IO.fromEither(decode[AnalysisReport](raw))
      verified <- AnalysisValidation.report(report, job)
    yield verified

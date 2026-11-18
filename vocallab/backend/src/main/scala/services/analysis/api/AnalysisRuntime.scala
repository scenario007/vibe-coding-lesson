package services.analysis.api

import cats.effect.{IO, Resource}
import cats.effect.std.Semaphore
import cats.syntax.all.*
import fs2.Stream
import java.nio.file.Files
import scala.concurrent.duration.*
import services.analysis.objects.{JobStatus, Stage}
import services.analysis.tables.AlignmentWindowTable.AlignmentWindowTableInitializer
import services.analysis.tables.AnalysisTable.{AnalysisTable, AnalysisTableInitializer}
import services.analysis.tables.MediaTable.{MediaTable, MediaTableInitializer}
import services.analysis.utils.{LocalFiles, PythonWorker}
import services.system.api.Database
import services.system.objects.{ApiError, AppConfig}

object AnalysisRuntime:
  def background(db: Database, config: AppConfig): Resource[IO, Unit] =
    val prepare = IO.blocking {
      List("media", "analyses", "stems", "numba").foreach(name => Files.createDirectories(config.runData.resolve(name)))
    } *> db.use(connection => MediaTableInitializer.initialize(connection) *>
      AnalysisTableInitializer.initialize(connection) *> AlignmentWindowTableInitializer.initialize(connection) *>
      AnalysisTable.recover(connection))

    val processNext = db.use(AnalysisTable.claim).flatMap(_.traverse_ { job =>
      PythonWorker.run(db, job, config).attempt.flatMap {
        case Right(_) => db.use(AnalysisTable.update(_, job.analysisId, JobStatus.completed, Stage.completed, None))
        case Left(error) =>
          val message = error match
            case e: ApiError => e.message
            case _ => "分析未完成，请查看本地日志。"
          IO.println(s"[VocalLab ${job.analysisId}] ${error.toString}") *>
            db.use(AnalysisTable.update(_, job.analysisId, JobStatus.failed, Stage.failed, Some(message))) *>
            LocalFiles.remove(LocalFiles.analysis(config, job.analysisId))
      }
    })
    val cleanup = for
      jobs <- db.use(AnalysisTable.expire(_, config.mediaHours))
      _ <- jobs.traverse_(id => LocalFiles.remove(LocalFiles.analysis(config, id)))
      media <- db.use(MediaTable.expire(_, config.mediaHours))
      _ <- media.traverse_(id => LocalFiles.remove(LocalFiles.media(config, id)))
      _ <- LocalFiles.expireCache(config.runData.resolve("stems"), config.cacheDays)
    yield ()
    for
      _ <- Resource.eval(prepare)
      filesystem <- Resource.eval(Semaphore[IO](1))
      cycle = Stream.awakeEvery[IO](650.millis).evalMap(_ =>
        filesystem.permit.use(_ => processNext).handleErrorWith(error => IO.println(error.toString)))
      safeCleanup = filesystem.permit.use(_ => cleanup).handleErrorWith(error => IO.println(error.toString))
      expiry = Stream.eval(safeCleanup) ++ Stream.awakeEvery[IO](30.minutes).evalMap(_ => safeCleanup)
      _ <- cycle.merge(expiry).compile.drain.background
    yield ()

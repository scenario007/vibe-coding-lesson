package services.ai.utils
import cats.effect.IO
import scala.concurrent.duration.*
import services.system.api.DatabaseSession
import services.system.objects.AppError
import services.ai.tables.generationJob.GenerationJobTable
private[ai] object GenerationWorker:
  private def once: IO[Unit] =
    DatabaseSession.transaction(c=>GenerationJobTable.claimNext(c)).flatMap {
      case None => IO.sleep(750.millis)
      case Some(job) => TokenHub.generate(job).attempt.flatMap {
        case Right(plan) => DatabaseSession.transaction(c=>GenerationJobTable.succeed(c,job.id,plan)).void
        case Left(error) =>
          val message = error match
            case e: AppError => e.message
            case _ => "AI 生成暂未完成，原输入已保留，可以重试"
          DatabaseSession.transaction(c=>GenerationJobTable.fail(c,job.id,message)).void
      }
    }
  private[ai] def run: IO[Unit] = once.handleErrorWith(_=>IO.sleep(2.seconds)).foreverM

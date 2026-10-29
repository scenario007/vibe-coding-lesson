package services.ai.utils
import cats.effect.IO
import scala.concurrent.duration.*
import services.system.api.DatabaseSession
import services.system.objects.AppError
import services.ai.tables.generationJob.GenerationJobTable
import services.ai.objects.ImageAssetKind
private[ai] object GenerationWorker:
  private def once: IO[Unit] =
    DatabaseSession.transaction(c=>GenerationJobTable.claimNext(c)).flatMap {
      case None => IO.sleep(750.millis)
      case Some(job) => TokenHub.generate(job).flatMap { plan =>
        if job.generateRewardImage then
          val reward = plan.reward
          ImagePipeline.generate(
            job.userId,
            ImageAssetKind.reward,
            s"任务主题：${job.goal}。任务等级和要求：${job.feedback}。战利品名称：${reward.name}。战利品故事与外观线索：${reward.story}。根据任务和名称创造独特的物件轮廓与细节，不要默认重复锅盖盾；如果名称明确要求某种形状，就保留其形状并做出独特设计。日常任务要轻巧朴素，挑战任务要有更多装饰细节，长期任务要华丽但仍保持手绘可读性。",
            job.id.value
          ).attempt.flatMap {
            case Right(image) => IO.pure(plan.copy(reward = reward.copy(imageUrl = image.imageUrl, imageError = None)))
            case Left(error: AliyunImageAuthError) => IO.pure(plan.copy(reward = reward.copy(imageUrl = None, imageError = Some(error.getMessage))))
            case Left(error) => IO.raiseError(error)
          }
        else IO.pure(plan)
      }.attempt.flatMap {
        case Right(plan) => DatabaseSession.transaction(c=>GenerationJobTable.succeed(c,job.id,plan)).void
        case Left(error) =>
          val message = error match
            case e: AppError => e.message
            case _ => "AI 生成暂未完成，原输入已保留，可以重试"
          DatabaseSession.transaction(c=>GenerationJobTable.fail(c,job.id,message)).void
      }
    }
  private[ai] def run: IO[Unit] = once.handleErrorWith(_=>IO.sleep(2.seconds)).foreverM

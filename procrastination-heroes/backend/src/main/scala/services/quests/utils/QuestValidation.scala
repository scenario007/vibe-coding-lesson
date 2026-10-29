package services.quests.utils
import cats.effect.IO
import java.time.LocalDate
import java.sql.Connection
import scala.util.Try
import services.ai.objects.{JobId, JobStatus}
import services.ai.tables.generationJob.GenerationJobTable
import services.economy.objects.RewardDraft
import services.quests.objects.*
import services.system.objects.AppError
import services.users.objects.UserId
private[quests] object QuestValidation:
  private[quests] def validate(title: String,description: String,dueDate: Option[String],stages: List[StageDraft]): IO[Unit] =
    val valid = title.trim.nonEmpty && title.length<=100 && description.length<=3000 && dueDate.forall(d => Try(LocalDate.parse(d)).isSuccess) && stages.nonEmpty && stages.size<=5 && stages.zipWithIndex.forall { case (s,index) =>
      s.title.trim.nonEmpty && s.title.length<=120 && s.description.length<=1200 && s.minutes>=1 && s.minutes<=480 && s.checklist.size<=5 && s.checklist.forall(v=>v.nonEmpty && v.length<=200) && s.criterion.trim.nonEmpty && s.criterion.length<=300 && s.dependsOn.distinct==s.dependsOn && s.dependsOn.forall(i=>i>=0 && i<index)
    }
    if valid then IO.unit else IO.raiseError(AppError(400,"请检查标题、日期与 1–5 个步骤；前置步骤必须排在当前步骤之前"))
  /** A client may only attach the image returned by its own completed AI job. */
  private[quests] def trustedReward(connection: Connection, userId: UserId, jobId: Option[JobId], reward: RewardDraft): IO[RewardDraft] =
    jobId match
      case None => IO.pure(reward.copy(imageUrl = None))
      case Some(id) =>
        GenerationJobTable.find(connection, id, userId).flatMap { value =>
          IO.fromOption(value.filter(_.status == JobStatus.succeeded))(AppError(400, "该 AI 草案不属于你或尚未完成")).map { job =>
            val image = job.result.map(_.reward).filter { generated =>
              generated.name == reward.name && generated.story == reward.story && generated.symbol == reward.symbol && generated.palette == reward.palette
            }.flatMap(_.imageUrl).filter(url => reward.imageUrl.contains(url))
            reward.copy(imageUrl = image)
          }
        }

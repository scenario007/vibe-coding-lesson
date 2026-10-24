package services.quests.utils
import cats.effect.IO
import java.time.LocalDate
import scala.util.Try
import services.quests.objects.*
import services.system.objects.AppError
private[quests] object QuestValidation:
  private[quests] def validate(title: String,description: String,dueDate: Option[String],stages: List[StageDraft]): IO[Unit] =
    val valid = title.trim.nonEmpty && title.length<=100 && description.length<=3000 && dueDate.forall(d => Try(LocalDate.parse(d)).isSuccess) && stages.nonEmpty && stages.size<=5 && stages.zipWithIndex.forall { case (s,index) =>
      s.title.trim.nonEmpty && s.title.length<=120 && s.description.length<=1200 && s.minutes>=1 && s.minutes<=480 && s.checklist.size<=5 && s.checklist.forall(v=>v.nonEmpty && v.length<=200) && s.criterion.trim.nonEmpty && s.criterion.length<=300 && s.dependsOn.distinct==s.dependsOn && s.dependsOn.forall(i=>i>=0 && i<index)
    }
    if valid then IO.unit else IO.raiseError(AppError(400,"请检查标题、日期与 1–5 个步骤；前置步骤必须排在当前步骤之前"))
  private[quests] def coinBudget(tier: RewardTier): Int = tier match
    case RewardTier.small => 10
    case RewardTier.normal => 20
    case RewardTier.main => 30

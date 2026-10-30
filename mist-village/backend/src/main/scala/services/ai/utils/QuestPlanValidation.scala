package services.ai.utils
import io.circe.parser.decode
import services.ai.objects.DynamicQuestPlan
import services.system.objects.AppError
private[ai] object QuestPlanValidation:
  private[ai] def parse(raw: String, goals: List[String], issuers: Set[String], factCounts: Map[String,Int] = Map.empty): Either[AppError,DynamicQuestPlan] =
    decode[DynamicQuestPlan](raw).left.map(_=>AppError(502,"AI 请求格式无效")).flatMap { p =>
      if goals.contains(p.goal) && issuers.contains(p.issuer) && Set("trust","recovery","filter").contains(p.reward) && p.reasonIndex.forall(i=>i>=0 && i<factCounts.getOrElse(p.issuer,0)) then Right(p)
      else Left(AppError(502,"AI 请求未通过规则检查"))
    }

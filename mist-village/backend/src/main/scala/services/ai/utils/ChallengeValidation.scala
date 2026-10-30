package services.ai.utils
import io.circe.parser.decode
import services.game.objects.ChallengeTruth
import services.system.objects.AppError
private[ai] object ChallengeValidation:
  private[ai] def parse(raw: String): Either[AppError,ChallengeTruth] = decode[ChallengeTruth](raw).left.map(_=>AppError(502,"AI 真相格式无效")).flatMap { plan =>
    val participants=Map("mine_accident" -> Set("mayor","smith","guard"),"chemical_accident" -> Set("mayor","healer"))
    val motives=Map("aware" -> Set("economic","safety"),"unaware" -> Set("oversight"))
    if participants.get(plan.incident).exists(_.contains(plan.involvedNpc)) && motives.get(plan.knowledge).exists(_.contains(plan.motive)) then Right(plan)
    else Left(AppError(502,"AI 真相不符合可执行的事故规则"))
  }

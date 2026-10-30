package services.ai.utils
import io.circe.parser.decode
import services.ai.objects.VisitorPlan
import services.system.objects.AppError
private[ai] object VisitorValidation:
  private val anchors=Map("courier"->Set("merchant","guard"),"apprentice"->Set("healer","smith"),"woodcutter"->Set("guard","mia"))
  private[ai] def parse(raw: String, contacts: Set[String], used: Set[String]): Either[AppError,VisitorPlan] =
    decode[VisitorPlan](raw).left.map(_=>AppError(502,"新人物提议格式无效")).flatMap { p =>
      if !used.contains(p.kind) && contacts.contains(p.contact) && anchors.get(p.kind).exists(_.contains(p.contact)) then Right(p)
      else Left(AppError(502,"新人物与现有关系或人数规则不符"))
    }

package services.game.api
import services.game.objects.*
import services.game.utils.ResolutionRules
import services.system.objects.AppError
object CustomResolution:
  def validShape(p: ResolutionPlan): Boolean = ResolutionRules.validShape(p)
  def preview(a: Adventure,p: ResolutionPlan): Either[AppError,ResolutionPreview] = ResolutionRules.preview(a,p)
  def execute(a: Adventure,p: ResolutionPlan): Either[AppError,(Adventure,Boolean)] = ResolutionRules.execute(a,p)

package services.game.api
import services.game.objects.Adventure
import services.game.utils.Rules
import services.system.objects.AppError
object AdvanceHint:
  def apply(a: Adventure): Either[AppError,Adventure] = Rules.perform(a,"hint_time").map(_._1)

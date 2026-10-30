package services.game.api
import services.game.objects.Adventure
import services.game.utils.Rules
object ValidateAction:
  def isApplicable(a: Adventure, action: String): Boolean = Rules.perform(a,action).isRight

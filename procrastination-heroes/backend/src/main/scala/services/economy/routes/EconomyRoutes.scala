package services.economy.routes
import io.circe.generic.auto.*
import services.economy.objects.RewardEvent
import services.economy.api.ListRewardHistoryAPIMessage
import services.system.api.RegisteredAPIMessage
object EconomyRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[ListRewardHistoryAPIMessage,List[RewardEvent]](true)
  )

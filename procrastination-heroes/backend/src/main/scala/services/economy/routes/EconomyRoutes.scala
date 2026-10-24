package services.economy.routes
import services.economy.objects.apiTypes.BaseResponse
import services.economy.objects.PlayerProgress
import services.economy.objects.RewardEvent
import cats.syntax.all.*

import io.circe.generic.auto.*
import services.economy.api.*
import services.system.api.RegisteredAPIMessage
object EconomyRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[GetPlayerProgressAPIMessage,PlayerProgress](true),
    RegisteredAPIMessage.register[GetBaseAPIMessage,BaseResponse](true),
    RegisteredAPIMessage.register[PurchaseStoreItemAPIMessage,BaseResponse](true),
    RegisteredAPIMessage.register[PlaceItemAPIMessage,BaseResponse](true),
    RegisteredAPIMessage.register[ListRewardHistoryAPIMessage,List[RewardEvent]](true)
  )

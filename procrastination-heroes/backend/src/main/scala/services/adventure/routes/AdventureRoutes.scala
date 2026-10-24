package services.adventure.routes
import services.adventure.objects.apiTypes.DashboardResponse
import cats.syntax.all.*

import io.circe.generic.auto.*
import services.adventure.api.*
import services.system.api.RegisteredAPIMessage
object AdventureRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[GetDashboardAPIMessage,DashboardResponse](true)
  )

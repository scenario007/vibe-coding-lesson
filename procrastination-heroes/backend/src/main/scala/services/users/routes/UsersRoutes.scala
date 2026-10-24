package services.users.routes
import services.system.objects.ActionResult
import services.users.objects.apiTypes.AuthResponse
import services.users.objects.UserProfile
import cats.syntax.all.*

import io.circe.generic.auto.*
import services.users.api.*
import services.system.api.RegisteredAPIMessage
object UsersRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[RegisterUserAPIMessage,AuthResponse](false),
    RegisteredAPIMessage.register[LoginUserAPIMessage,AuthResponse](false),
    RegisteredAPIMessage.register[GetCurrentUserAPIMessage,UserProfile](true),
    RegisteredAPIMessage.register[UpdateProfileAPIMessage,UserProfile](true),
    RegisteredAPIMessage.register[LogoutUserAPIMessage,ActionResult](true)
  )

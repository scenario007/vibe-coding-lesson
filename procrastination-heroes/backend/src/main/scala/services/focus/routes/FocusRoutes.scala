package services.focus.routes
import services.focus.objects.apiTypes.FocusResponse
import services.focus.objects.FocusSession
import cats.syntax.all.*

import io.circe.generic.auto.*
import services.focus.api.*
import services.system.api.RegisteredAPIMessage
object FocusRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[StartFocusAPIMessage,FocusResponse](true),
    RegisteredAPIMessage.register[GetCurrentFocusAPIMessage,FocusResponse](true),
    RegisteredAPIMessage.register[PauseFocusAPIMessage,FocusResponse](true),
    RegisteredAPIMessage.register[ResumeFocusAPIMessage,FocusResponse](true),
    RegisteredAPIMessage.register[FinishFocusAPIMessage,FocusResponse](true),
    RegisteredAPIMessage.register[AbandonFocusAPIMessage,FocusResponse](true),
    RegisteredAPIMessage.register[ListFocusHistoryAPIMessage,List[FocusSession]](true)
  )

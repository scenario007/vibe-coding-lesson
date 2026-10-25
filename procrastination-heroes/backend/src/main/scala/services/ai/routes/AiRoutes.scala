package services.ai.routes
import services.ai.objects.GenerationJob
import cats.syntax.all.*

import io.circe.generic.auto.*
import services.ai.api.*
import services.system.api.RegisteredAPIMessage
object AiRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[GetUsageReportAPIMessage,services.ai.objects.apiTypes.UsageReport](true),
    RegisteredAPIMessage.register[ListGenerationJobsAPIMessage,List[GenerationJob]](true),
    RegisteredAPIMessage.register[RequestPlanGenerationAPIMessage,GenerationJob](true),
    RegisteredAPIMessage.register[GetGenerationJobAPIMessage,GenerationJob](true)
  )

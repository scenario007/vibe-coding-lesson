package services.coach.routes

import cats.data.OptionT
import cats.effect.IO
import cats.effect.std.Semaphore
import cats.syntax.all.*
import org.http4s.{HttpRoutes, Status}
import services.analysis.objects.apiTypes.AnalysisIdRequest
import services.coach.api.*
import services.coach.objects.apiTypes.*
import services.system.api.Database
import services.system.objects.{ApiError, AppConfig}
import services.system.routes.APIMessageRouter.{json, name}

object CoachRoutes:
  def routes(db: Database, config: AppConfig, queue: Semaphore[IO]): HttpRoutes[IO] =
    val reads = json(db, (input: AnalysisIdRequest) => GetCoachAPIMessage(input, config))
    val writes = json(db, (input: AnalyzeCoachRequest) => AnalyzeCoachAPIMessage(input, config)) <+>
      json(db, (input: EditDifficultyRequest) => EditDifficultyAPIMessage(input, config)) <+>
      json(db, (input: AskCoachRequest) => AskCoachAPIMessage(input, config))
    val operations = Set(name[AnalyzeCoachAPIMessage], name[EditDifficultyAPIMessage], name[AskCoachAPIMessage])
    reads <+> HttpRoutes[IO] { request =>
      if request.uri.path.segments.lastOption.exists(segment => operations(segment.decoded())) then
        OptionT(queue.tryPermit.use {
          case true => writes(request).value
          case false => IO.raiseError(ApiError(Status.TooManyRequests, "另一个教练操作正在运行，请稍后再试。"))
        })
      else OptionT.none
    }

package services.analysis.routes

import cats.effect.IO
import cats.effect.std.Semaphore
import cats.syntax.all.*
import io.circe.Json
import org.http4s.*
import org.http4s.circe.*
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString
import java.net.URLDecoder
import java.nio.charset.StandardCharsets.UTF_8
import java.util.UUID
import services.analysis.api.*
import services.analysis.objects.*
import services.analysis.objects.apiTypes.*
import services.analysis.utils.AudioResponse
import services.system.api.Database
import services.system.objects.{ApiError, AppConfig}
import services.system.routes.APIMessageRouter.{json, name}

object AnalysisRoutes:
  def routes(db: Database, config: AppConfig, uploads: Semaphore[IO], queue: Semaphore[IO]): HttpRoutes[IO] =
    val messages = json(db, (input: AnalysisSelection) => CreateAnalysisAPIMessage(input, config)) <+>
      json(db, (input: AnalysisIdRequest) => GetAnalysisAPIMessage(input.analysisId)) <+>
      json(db, (input: AnalysisIdRequest) => GetAnalysisResultAPIMessage(input.analysisId, config)) <+>
      json(db, (input: AnalysisIdRequest) => GetPitchPreviewAPIMessage(input.analysisId, config)) <+>
      json(db, (input: AdjustAlignmentRequest) => AdjustAlignmentAPIMessage(input, config))

    val commands = HttpRoutes.of[IO] {
      case GET -> Root / "api" / operation if operation == name[GetMediaLimitsAPIMessage] =>
        db.use(GetMediaLimitsAPIMessage(config).plan).flatMap(limits => Ok(io.circe.Encoder[MediaLimits].apply(limits)))

      case request @ POST -> Root / "api" / operation if operation == name[UploadMediaAPIMessage] =>
        val filename = request.headers.get(CIString("X-File-Name")).map(_.head.value)
        for
          _ <- IO.raiseWhen(request.contentLength.exists(_ > config.maxBytes))(
            ApiError(Status.PayloadTooLarge, s"单个文件最多 ${config.maxBytes / 1048576} MiB。"))
          raw <- IO.fromOption(filename)(ApiError(Status.BadRequest, "缺少文件名。"))
          decoded <- IO.delay(URLDecoder.decode(raw, UTF_8)).adaptError {
            case _: IllegalArgumentException => ApiError(Status.BadRequest, "文件名编码无效。")
          }
          response <- uploads.tryPermit.use {
            case true => db.use(UploadMediaAPIMessage(decoded, request.body, config).plan)
              .flatMap(metadata => Created(io.circe.Encoder[MediaMetadata].apply(metadata)))
            case false => TooManyRequests(Json.obj("error" -> Json.fromString("同时上传的文件太多，请稍后再试。")))
          }
        yield response

      case request @ GET -> Root / "api" / operation / UUIDVar(id) if operation == name[GetMediaAudioAPIMessage] =>
        db.use(GetMediaAudioAPIMessage(id, config).plan).flatMap(AudioResponse.stream(request, _, "audio/flac"))

      case request @ GET -> Root / "api" / operation / UUIDVar(id) / rawRole / rawTrack if operation == name[GetAnalyzedAudioAPIMessage] =>
        val target = for
          role <- Role.fromString(rawRole)
          track <- TrackKind.fromString(rawTrack)
        yield GetAnalyzedAudioAPIMessage(id, role, track, config)
        IO.fromEither(target.left.map(_ => ApiError(Status.NotFound, "音轨不存在。")))
          .flatMap(message => db.use(message.plan)).flatMap(AudioResponse.stream(request, _, "audio/wav"))
    }
    commands <+> HttpRoutes[IO] { request =>
      val mutating = request.uri.path.segments.lastOption.map(_.decoded()).exists(Set(
        name[CreateAnalysisAPIMessage], name[AdjustAlignmentAPIMessage]))
      if mutating then cats.data.OptionT(queue.permit.use(_ => messages(request).value))
      else messages(request)
    }

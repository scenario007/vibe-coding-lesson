package services.lyrics.routes

import cats.data.OptionT
import cats.effect.IO
import cats.effect.std.Semaphore
import cats.syntax.all.*
import io.circe.Json
import org.http4s.*
import org.http4s.circe.*
import org.http4s.dsl.io.*
import services.lyrics.api.*
import services.lyrics.objects.apiTypes.*
import services.system.api.Database
import services.system.routes.APIMessageRouter.{json, name}

object LyricsRoutes:
  def routes(database: Database, lookup: Semaphore[IO]): HttpRoutes[IO] =
    val search = name[SearchLyricsAPIMessage]
    val get = name[GetLyricsAPIMessage]
    val messages = json(database, SearchLyricsAPIMessage.apply) <+>
      json(database, (input: GetLyricsRequest) => GetLyricsAPIMessage(input.id))
    HttpRoutes[IO] { request =>
      val path = request.uri.path.segments.map(_.decoded())
      if request.method == Method.POST && (path == Vector("api", search) || path == Vector("api", get)) then
        OptionT(lookup.tryPermit.use {
          case true => messages(request).value
          case false => TooManyRequests(Json.obj("error" -> Json.fromString("已有歌词请求在处理，请稍候。"))).map(Some(_))
        })
      else OptionT.none
    }

package services.game.api

import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.apiTypes.WorldClock
import services.game.tables.AdventureTable.AdventureTable

final case class GetWorldClockAPIMessage(id: String) extends APIMessage[WorldClock]:
  def plan(c: Connection): IO[WorldClock] =
    AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在"))).map(a=>WorldClock.at(a.hour))
object GetWorldClockAPIMessage:
  given Encoder[GetWorldClockAPIMessage] = deriveEncoder
  given Decoder[GetWorldClockAPIMessage] = deriveDecoder

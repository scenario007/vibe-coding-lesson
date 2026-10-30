package services.game.api

import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.apiTypes.GrowthOption
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.GrowthRules

final case class ListGrowthOptionsAPIMessage(id: String) extends APIMessage[List[GrowthOption]]:
  def plan(c: Connection): IO[List[GrowthOption]] =
    AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在"))).map(GrowthRules.options)
object ListGrowthOptionsAPIMessage:
  given Encoder[ListGrowthOptionsAPIMessage] = deriveEncoder
  given Decoder[ListGrowthOptionsAPIMessage] = deriveDecoder

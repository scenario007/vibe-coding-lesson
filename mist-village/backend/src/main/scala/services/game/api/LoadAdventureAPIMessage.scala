package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
final case class LoadAdventureAPIMessage(id: String, slot: Int) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = for
    _ <- if slot>=0 && slot<=3 then IO.unit else IO.raiseError(AppError(400,"存档位无效"))
    current <- AdventureTable.findForUpdate(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if current.aiPause.nonEmpty then IO.raiseError(AppError(409,"请先重试失败的 AI 请求")) else IO.unit
    _ <- if current.sealedEnding then IO.raiseError(AppError(409,"档案已封存")) else IO.unit
    saved <- AdventureTable.load(c,id,slot).flatMap(v => IO.fromOption(v)(AppError(404,"存档不存在")))
    _ <- AdventureTable.update(c,saved)
  yield AdventureView.from(saved)
object LoadAdventureAPIMessage:
  given Encoder[LoadAdventureAPIMessage] = deriveEncoder
  given Decoder[LoadAdventureAPIMessage] = deriveDecoder

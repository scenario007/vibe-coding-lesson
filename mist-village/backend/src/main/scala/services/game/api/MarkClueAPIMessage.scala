package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.AdventureView
import services.game.tables.AdventureTable.AdventureTable
final case class MarkClueAPIMessage(id: String, index: Int, important: Boolean) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = for
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.aiPause.nonEmpty || a.pendingRecovery.nonEmpty || a.battle.nonEmpty || a.dead || a.sealedEnding then IO.raiseError(AppError(409,"当前不能修改手记")) else IO.unit
    _ <- if index>=0 && index<a.clues.size then IO.unit else IO.raiseError(AppError(400,"线索编号无效"))
    marked=if important then (a.importantClues :+ index).distinct.sorted else a.importantClues.filterNot(_==index)
    next=a.copy(importantClues=marked)
    _ <- AdventureTable.update(c,next)
  yield AdventureView.from(next)
object MarkClueAPIMessage:
  given Encoder[MarkClueAPIMessage] = deriveEncoder
  given Decoder[MarkClueAPIMessage] = deriveDecoder

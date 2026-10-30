package services.game.api
import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.{AdventureView,JournalNote}
import services.game.tables.AdventureTable.AdventureTable
final case class AddJournalNoteAPIMessage(id: String, text: String, clueIndexes: List[Int]) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = for
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.aiPause.nonEmpty then IO.raiseError(AppError(409,"请先重试失败的 AI 请求")) else IO.unit
    _ <- if a.battle.nonEmpty then IO.raiseError(AppError(409,"请先完成当前遭遇")) else IO.unit
    _ <- if a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"请先处理当前危险的后果")) else IO.unit
    _ <- if a.sealedEnding || a.dead then IO.raiseError(AppError(409,"当前档案不能编辑")) else IO.unit
    _ <- if text.trim.nonEmpty && text.length<=500 && clueIndexes.size<=10 && clueIndexes.distinct.size==clueIndexes.size && clueIndexes.forall(i=>i>=0 && i<a.clues.size) then IO.unit else IO.raiseError(AppError(400,"笔记或线索关联无效"))
    noteId <- IO(UUID.randomUUID().toString)
    note=JournalNote(noteId,text.trim,clueIndexes,a.hour)
    next=a.copy(notes=a.notes :+ note)
    _ <- AdventureTable.update(c,next)
  yield AdventureView.from(next)
object AddJournalNoteAPIMessage:
  given Encoder[AddJournalNoteAPIMessage] = deriveEncoder
  given Decoder[AddJournalNoteAPIMessage] = deriveDecoder

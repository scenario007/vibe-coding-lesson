package services.lyrics.api

import cats.effect.IO
import java.sql.Connection
import org.http4s.Status
import services.lyrics.objects.apiTypes.GetLyricsResponse
import services.lyrics.utils.Lrclib
import services.system.api.APIMessage
import services.system.objects.ApiError

final case class GetLyricsAPIMessage(id: Long) extends APIMessage[GetLyricsResponse]:
  def plan(connection: Connection): IO[GetLyricsResponse] =
    IO.raiseUnless(id > 0)(ApiError(Status.BadRequest, "歌词记录编号无效。")) *> Lrclib.lyrics(id)

package services.lyrics.api

import cats.effect.IO
import java.sql.Connection
import org.http4s.Status
import services.lyrics.objects.LyricsTrack
import services.lyrics.objects.apiTypes.SearchLyricsRequest
import services.lyrics.utils.Lrclib
import services.system.api.APIMessage
import services.system.objects.ApiError

final case class SearchLyricsAPIMessage(input: SearchLyricsRequest) extends APIMessage[Vector[LyricsTrack]]:
  def plan(connection: Connection): IO[Vector[LyricsTrack]] =
    val title = input.title.trim
    val artist = input.artist.trim
    IO.raiseUnless(title.nonEmpty && title.length <= 120 && artist.length <= 120)(
      ApiError(Status.BadRequest, "请输入歌名，歌名和歌手各最多 120 个字符。")) *>
      Lrclib.search(title, artist)

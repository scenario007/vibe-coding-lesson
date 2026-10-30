package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.NoRequestMessage
import services.game.objects.StoryProgress
import services.game.tables.StoryProgressTable.StoryProgressTable
final case class ListStoryProgressAPIMessage() extends NoRequestMessage[List[StoryProgress]]:
  def plan(c: Connection): IO[List[StoryProgress]] = StoryProgressTable.list(c).map { rows =>
    List(("case_a","灰色矿道","mine_accident"),("case_b","沉默水源","chemical_accident")).map { (id,title,truth) =>
      val entry=rows.find(_._1==truth)
      StoryProgress(id,title,entry.exists(_._2),entry.exists(_._3),if entry.exists(_._4) then Some(if truth=="mine_accident" then "矿难隐瞒" else "药剂事故") else None)
    }
  }
object ListStoryProgressAPIMessage:
  given Encoder[ListStoryProgressAPIMessage] = deriveEncoder
  given Decoder[ListStoryProgressAPIMessage] = deriveDecoder

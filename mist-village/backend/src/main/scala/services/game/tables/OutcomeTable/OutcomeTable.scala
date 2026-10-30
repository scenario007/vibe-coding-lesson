package services.game.tables.OutcomeTable
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
import services.game.objects.OutcomeRecord
object OutcomeTable:
  private val insertSql="INSERT INTO mist_outcomes(id,character_name,kind,hour,summary) VALUES(?,?,?,?,?)"
  def insert(c: Connection,id: String,name: String,kind: String,hour: Int,summary: String): IO[Int] = Jdbc.update(c,insertSql,List(id,name,kind,Int.box(hour),summary))
  private val listSql="SELECT id,character_name,kind,hour,summary,recorded_at FROM mist_outcomes ORDER BY recorded_at DESC"
  def list(c: Connection): IO[List[OutcomeRecord]] = Jdbc.query(c,listSql)(r=>OutcomeRecord(r.getString("id"),r.getString("character_name"),r.getString("kind"),r.getInt("hour"),r.getString("summary"),r.getTimestamp("recorded_at").toInstant.toString))

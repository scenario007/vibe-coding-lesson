package services.game.tables.AdventureTable
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import io.circe.parser.decode
import services.game.objects.{Adventure,SaveSummary}
import services.system.tables.Jdbc
object AdventureTable:
  private val countSql = "SELECT count(*) AS n FROM mist_adventures"
  def count(c: Connection): IO[Long] = Jdbc.query(c,countSql)(_.getLong("n")).map(_.head)
  private val lockSql = "SELECT pg_advisory_xact_lock(18297701)"
  def lock(c: Connection): IO[Unit] = Jdbc.query(c,lockSql)(_ => ()).map(_ => ())
  private val deleteSql = "DELETE FROM mist_adventures WHERE id=?"
  def delete(c: Connection, id: String): IO[Int] = Jdbc.update(c,deleteSql,List(id))
  private val insertSql = "INSERT INTO mist_adventures(id,state) VALUES (?,?::jsonb)"
  def insert(c: Connection, a: Adventure): IO[Int] = Jdbc.update(c,insertSql,List(a.id,a.asJson.noSpaces))
  private val listSql = "SELECT state::text AS state FROM mist_adventures ORDER BY updated_at DESC"
  def list(c: Connection): IO[List[Adventure]] = Jdbc.query(c,listSql)(r => decode[Adventure](r.getString("state")).fold(throw _,identity))
  private val findSql = "SELECT state::text AS state FROM mist_adventures WHERE id=?"
  def find(c: Connection, id: String): IO[Option[Adventure]] = Jdbc.query(c,findSql,List(id))(r => decode[Adventure](r.getString("state")).fold(throw _,identity)).map(_.headOption)
  private val findForUpdateSql = "SELECT state::text AS state FROM mist_adventures WHERE id=? FOR UPDATE"
  def findForUpdate(c: Connection, id: String): IO[Option[Adventure]] = Jdbc.query(c,findForUpdateSql,List(id))(r => decode[Adventure](r.getString("state")).fold(throw _,identity)).map(_.headOption)
  private val updateSql = "UPDATE mist_adventures SET state=?::jsonb,updated_at=now() WHERE id=?"
  def update(c: Connection, a: Adventure): IO[Int] = Jdbc.update(c,updateSql,List(a.asJson.noSpaces,a.id))
  private val saveSql = "INSERT INTO mist_saves(adventure_id,slot,state) VALUES (?,?,?::jsonb) ON CONFLICT(adventure_id,slot) DO UPDATE SET state=excluded.state,updated_at=now()"
  def save(c: Connection, a: Adventure, slot: Int): IO[Int] = Jdbc.update(c,saveSql,List(a.id,slot,a.asJson.noSpaces))
  private val loadSql = "SELECT state::text AS state FROM mist_saves WHERE adventure_id=? AND slot=?"
  def load(c: Connection, id: String, slot: Int): IO[Option[Adventure]] = Jdbc.query(c,loadSql,List(id,slot))(r => decode[Adventure](r.getString("state")).fold(throw _,identity)).map(_.headOption)

  private val listSavesSql = "SELECT slot,updated_at,state::text AS state FROM mist_saves WHERE adventure_id=? ORDER BY slot"
  def listSaves(c: Connection,id: String): IO[List[SaveSummary]] = Jdbc.query(c,listSavesSql,List(id)) { r =>
    val a=decode[Adventure](r.getString("state")).fold(throw _,identity)
    SaveSummary(r.getInt("slot"),r.getTimestamp("updated_at").toInstant.toString,a.hour,a.place,a.stage)
  }

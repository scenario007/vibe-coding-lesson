package services.focus.tables.focusSegment
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.focus.objects.*
import services.users.objects.UserId

object FocusSegmentTable:
  private val insertSql = """INSERT INTO focus_segments(session_id,started_at,ended_at) VALUES(?,?,?) ON CONFLICT DO NOTHING"""
  def insert(connection: Connection, id: FocusId, start: Long, end: Long): IO[Int] =
    Jdbc.update(connection,insertSql,List(id.value,start,end))

  private val listSql = """SELECT g.* FROM focus_segments g JOIN focus_sessions s ON s.id=g.session_id WHERE s.user_id=?"""
  def list(connection: Connection, userId: UserId): IO[List[FocusSegment]] =
    Jdbc.query(connection,listSql,List(userId.value))(r => FocusSegment(FocusId(r.getString("session_id")),r.getLong("started_at"),r.getLong("ended_at")))

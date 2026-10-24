package services.focus.tables.focusSession
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.focus.objects.*
import services.users.objects.UserId
import services.quests.objects.StepId

object FocusSessionTable:
  private val currentSql = """SELECT * FROM focus_sessions WHERE user_id=? AND status IN ('running','paused')"""
  def current(connection: Connection, userId: UserId): IO[Option[FocusSession]] =
    Jdbc.query(connection,currentSql,List(userId.value))(read).map(_.headOption)

  private val historySql = """SELECT * FROM focus_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 100"""
  def history(connection: Connection, userId: UserId): IO[List[FocusSession]] =
    Jdbc.query(connection,historySql,List(userId.value))(read)

  private val insertSql = """INSERT INTO focus_sessions VALUES(?,?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, v: FocusSession): IO[Int] =
    Jdbc.update(connection,insertSql,List(v.id.value,v.userId.value,v.stepId.map(_.value).orNull,v.targetSeconds,v.status.toString,v.elapsedSeconds,v.runningSince.map(Long.box).orNull,v.createdAt,v.endedAt.map(Long.box).orNull))

  private val saveSql = """UPDATE focus_sessions SET status=?,elapsed_seconds=?,running_since=?,ended_at=? WHERE id=? AND user_id=?"""
  def save(connection: Connection, v: FocusSession): IO[Int] =
    Jdbc.update(connection,saveSql,List(v.status.toString,v.elapsedSeconds,v.runningSince.map(Long.box).orNull,v.endedAt.map(Long.box).orNull,v.id.value,v.userId.value))

  private def read(r: ResultSet): FocusSession = FocusSession(FocusId(r.getString("id")),UserId(r.getString("user_id")),Option(r.getString("step_id")).map(StepId(_)),r.getInt("target_seconds"),FocusStatus.fromString(r.getString("status")).toOption.get,r.getInt("elapsed_seconds"),Option(r.getObject("running_since")).map(_ => r.getLong("running_since")),r.getLong("created_at"),Option(r.getObject("ended_at")).map(_ => r.getLong("ended_at")))

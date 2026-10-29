package services.adventure.tables.progress
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.adventure.objects.*
import services.users.objects.UserId

object ProgressTable:
  private val initializeForUserSql = """INSERT INTO player_progress(user_id) VALUES(?) ON CONFLICT DO NOTHING"""
  def initializeForUser(connection: Connection, userId: UserId): IO[Int] =
    Jdbc.update(connection,initializeForUserSql,List(userId.value))

  private val getSql = """SELECT experience FROM player_progress WHERE user_id=?"""
  def get(connection: Connection, userId: UserId): IO[List[Int]] =
    Jdbc.query(connection,getSql,List(userId.value))(r => r.getInt("experience"))

  private val addSql = """UPDATE player_progress SET experience=experience+? WHERE user_id=?"""
  def add(connection: Connection, userId: UserId, amount: Int): IO[Int] =
    Jdbc.update(connection,addSql,List(amount,userId.value))

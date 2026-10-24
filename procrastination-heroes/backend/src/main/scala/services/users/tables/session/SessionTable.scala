package services.users.tables.session
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.users.objects.*
import services.users.objects.UserId

object SessionTable:
  private val insertSql = """INSERT INTO user_sessions VALUES(?,?,?)"""
  def insert(connection: Connection, hash: String, userId: UserId, expiresAt: Long): IO[Int] =
    Jdbc.update(connection,insertSql,List(hash,userId.value,expiresAt))

  private val resolveSql = """SELECT user_id FROM user_sessions WHERE token_hash=? AND expires_at>?"""
  def resolve(connection: Connection, hash: String, now: Long): IO[Option[UserId]] =
    Jdbc.query(connection,resolveSql,List(hash,now))(r => UserId(r.getString("user_id"))).map(_.headOption)

  private val deleteForUserSql = """DELETE FROM user_sessions WHERE user_id=?"""
  def deleteForUser(connection: Connection, userId: UserId): IO[Int] =
    Jdbc.update(connection,deleteForUserSql,List(userId.value))

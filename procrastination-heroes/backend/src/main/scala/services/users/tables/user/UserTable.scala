package services.users.tables.user
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.users.objects.*
import services.users.objects.UserId

object UserTable:
  private val findByIdSql = """SELECT * FROM users WHERE id=?"""
  def findById(connection: Connection, id: UserId): IO[Option[StoredUser]] =
    Jdbc.query(connection,findByIdSql,List(id.value))(read).map(_.headOption)

  // Serialize per-user operations that must not run concurrently.
  private val lockSql = """SELECT * FROM users WHERE id=? FOR UPDATE"""
  def lock(connection: Connection, id: UserId): IO[Option[StoredUser]] =
    Jdbc.query(connection,lockSql,List(id.value))(read).map(_.headOption)

  private val findByUsernameSql = """SELECT * FROM users WHERE username=?"""
  def findByUsername(connection: Connection, username: String): IO[Option[StoredUser]] =
    Jdbc.query(connection,findByUsernameSql,List(username))(read).map(_.headOption)

  private val insertSql = """INSERT INTO users(id,username,password_hash,salt,nickname,avatar,created_at) VALUES(?,?,?,?,?,?,?)"""
  def insert(connection: Connection, user: StoredUser): IO[Int] =
    Jdbc.update(connection,insertSql,List(user.profile.id.value,user.profile.username,user.passwordHash,user.salt,user.profile.nickname,user.profile.avatar.toString,user.profile.createdAt))

  private val updateProfileSql = """UPDATE users SET nickname=?,avatar=?,daily_goal=?,focus_minutes=? WHERE id=?"""
  def updateProfile(connection: Connection, id: UserId, nickname: String, avatar: UserAvatar, goal: Int, minutes: Int): IO[Int] =
    Jdbc.update(connection,updateProfileSql,List(nickname,avatar.toString,goal,minutes,id.value))

  private def read(r: ResultSet): StoredUser = StoredUser(UserProfile(UserId(r.getString("id")),r.getString("username"),r.getString("nickname"),UserAvatar.fromString(r.getString("avatar")).toOption.get,r.getInt("daily_goal"),r.getInt("focus_minutes"),r.getLong("created_at")),r.getString("password_hash"),r.getString("salt"))

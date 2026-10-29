package services.economy.tables.playerItem
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.users.objects.UserId

object PlayerItemTable:
  private val listSql = """SELECT * FROM player_items WHERE user_id=?"""
  def list(connection: Connection, userId: UserId): IO[List[OwnedItem]] =
    Jdbc.query(connection,listSql,List(userId.value))(read)

  private val insertSql = """INSERT INTO player_items VALUES(?,?,?,?) ON CONFLICT(user_id,item_id) DO NOTHING"""
  def insert(connection: Connection, userId: UserId, id: String, itemId: String, at: Long): IO[Int] =
    Jdbc.update(connection,insertSql,List(id,userId.value,itemId,at))

  private def read(r: ResultSet): OwnedItem = OwnedItem(r.getString("id"),r.getString("item_id"),r.getLong("purchased_at"))

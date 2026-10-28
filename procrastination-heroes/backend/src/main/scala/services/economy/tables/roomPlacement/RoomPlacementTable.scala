package services.economy.tables.roomPlacement
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.users.objects.UserId

object RoomPlacementTable:
  private val listSql = """SELECT * FROM room_placements WHERE user_id=?"""
  def list(connection: Connection, userId: UserId): IO[List[RoomPlacement]] =
    Jdbc.query(connection,listSql,List(userId.value))(r => RoomPlacement(r.getString("slot"),Option(r.getString("item_id")),Option(r.getString("reward_id")),r.getInt("x"),r.getInt("y")))

  private val clearSql = """DELETE FROM room_placements WHERE user_id=? AND slot=?"""
  def clear(connection: Connection, userId: UserId, slot: String): IO[Int] =
    Jdbc.update(connection,clearSql,List(userId.value,slot))

  private val placeSql = """INSERT INTO room_placements(user_id,slot,item_id,reward_id) VALUES(?,?,?,?) ON CONFLICT(user_id,slot) DO UPDATE SET item_id=EXCLUDED.item_id,reward_id=EXCLUDED.reward_id"""
  def place(connection: Connection, userId: UserId, slot: String, itemId: Option[String], rewardId: Option[String]): IO[Int] =
    Jdbc.update(connection,placeSql,List(userId.value,slot,itemId.orNull,rewardId.orNull))

  private val moveSql = """UPDATE room_placements SET x=?,y=? WHERE user_id=? AND slot=?"""
  def move(connection: Connection, userId: UserId, id: String, x: Int, y: Int): IO[Int] =
    Jdbc.update(connection,moveSql,List(x,y,userId.value,id))

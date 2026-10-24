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
    Jdbc.query(connection,listSql,List(userId.value))(r => RoomPlacement(RoomSlot.fromString(r.getString("slot")).toOption.get,Option(r.getString("item_id")),Option(r.getString("reward_id"))))

  private val clearSql = """DELETE FROM room_placements WHERE user_id=? AND slot=?"""
  def clear(connection: Connection, userId: UserId, slot: RoomSlot): IO[Int] =
    Jdbc.update(connection,clearSql,List(userId.value,slot.toString))

  private val placeSql = """INSERT INTO room_placements VALUES(?,?,?,?) ON CONFLICT(user_id,slot) DO UPDATE SET item_id=EXCLUDED.item_id,reward_id=EXCLUDED.reward_id"""
  def place(connection: Connection, userId: UserId, slot: RoomSlot, itemId: Option[String], rewardId: Option[String]): IO[Int] =
    Jdbc.update(connection,placeSql,List(userId.value,slot.toString,itemId.orNull,rewardId.orNull))

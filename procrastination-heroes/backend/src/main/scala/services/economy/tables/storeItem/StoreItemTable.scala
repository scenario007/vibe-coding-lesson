package services.economy.tables.storeItem
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.users.objects.UserId

object StoreItemTable:
  private val insertSql = """INSERT INTO store_items(id,name,description,price,slot,symbol,palette,image_url) VALUES(?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, item: StoreItem): IO[Int] =
    Jdbc.update(connection,insertSql,List(item.id,item.name,item.description,item.price,item.slot.toString,item.symbol.toString,item.palette.toString,item.imageUrl.orNull))

  private val listSql = """SELECT s.* FROM store_items s WHERE s.id NOT LIKE 'custom-%' OR EXISTS (SELECT 1 FROM player_items p WHERE p.item_id=s.id AND p.user_id=?) ORDER BY s.price,s.id"""
  def list(connection: Connection, userId: UserId): IO[List[StoreItem]] =
    Jdbc.query(connection,listSql,List(userId.value))(read)

  private val findSql = """SELECT * FROM store_items WHERE id=?"""
  def find(connection: Connection, id: String): IO[Option[StoreItem]] =
    Jdbc.query(connection,findSql,List(id))(read).map(_.headOption)

  private def read(r: ResultSet): StoreItem = StoreItem(r.getString("id"),r.getString("name"),r.getString("description"),r.getInt("price"),RoomSlot.fromString(r.getString("slot")).toOption.get,RewardSymbol.fromString(r.getString("symbol")).toOption.get,RewardPalette.fromString(r.getString("palette")).toOption.get,Option(r.getString("image_url")))

package services.economy.tables.storeItem
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*

object StoreItemTable:
  private val insertSql = """INSERT INTO store_items VALUES(?,?,?,?,?,?,?)"""
  def insert(connection: Connection, item: StoreItem): IO[Int] =
    Jdbc.update(connection,insertSql,List(item.id,item.name,item.description,item.price,item.slot.toString,item.symbol.toString,item.palette.toString))

  private val listSql = """SELECT * FROM store_items ORDER BY price,id"""
  def list(connection: Connection): IO[List[StoreItem]] =
    Jdbc.query(connection,listSql,Nil)(read)

  private val findSql = """SELECT * FROM store_items WHERE id=?"""
  def find(connection: Connection, id: String): IO[Option[StoreItem]] =
    Jdbc.query(connection,findSql,List(id))(read).map(_.headOption)

  private def read(r: ResultSet): StoreItem = StoreItem(r.getString("id"),r.getString("name"),r.getString("description"),r.getInt("price"),RoomSlot.fromString(r.getString("slot")).toOption.get,RewardSymbol.fromString(r.getString("symbol")).toOption.get,RewardPalette.fromString(r.getString("palette")).toOption.get)

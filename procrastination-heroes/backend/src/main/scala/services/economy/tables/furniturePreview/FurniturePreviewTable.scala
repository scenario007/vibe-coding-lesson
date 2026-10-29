package services.economy.tables.furniturePreview

import cats.effect.IO
import java.sql.{Connection, ResultSet}
import services.economy.objects.{FurniturePreview, RoomSlot}
import services.system.tables.Jdbc
import services.users.objects.UserId

object FurniturePreviewTable:
  private val insertSql = """INSERT INTO furniture_previews(id,user_id,prompt,refined_description,slot,image_url,created_at,confirmed) VALUES(?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, userId: UserId, preview: FurniturePreview): IO[Int] =
    Jdbc.update(connection,insertSql,List(preview.id,userId.value,preview.prompt,preview.refinedDescription,preview.slot.toString,preview.imageUrl,preview.createdAt,Boolean.box(preview.confirmed)))

  private val listPendingSql = """SELECT * FROM furniture_previews WHERE user_id=? AND confirmed=false ORDER BY created_at DESC LIMIT 20"""
  def listPending(connection: Connection, userId: UserId): IO[List[FurniturePreview]] =
    Jdbc.query(connection,listPendingSql,List(userId.value))(read)

  private val lockSql = """SELECT * FROM furniture_previews WHERE id=? AND user_id=? FOR UPDATE"""
  def lock(connection: Connection, id: String, userId: UserId): IO[Option[FurniturePreview]] =
    Jdbc.query(connection,lockSql,List(id,userId.value))(read).map(_.headOption)

  private val confirmSql = """UPDATE furniture_previews SET confirmed=true WHERE id=? AND user_id=? AND confirmed=false"""
  def confirm(connection: Connection, id: String, userId: UserId): IO[Int] =
    Jdbc.update(connection,confirmSql,List(id,userId.value))

  private def read(r: ResultSet): FurniturePreview =
    FurniturePreview(r.getString("id"),r.getString("prompt"),r.getString("refined_description"),RoomSlot.fromString(r.getString("slot")).toOption.get,r.getString("image_url"),r.getLong("created_at"),r.getBoolean("confirmed"))

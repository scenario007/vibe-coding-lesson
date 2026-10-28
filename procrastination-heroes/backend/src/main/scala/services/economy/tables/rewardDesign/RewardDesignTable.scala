package services.economy.tables.rewardDesign
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.quests.objects.QuestId

object RewardDesignTable:
  private val findSql = """SELECT * FROM reward_designs WHERE quest_id=?"""
  def find(connection: Connection, id: QuestId): IO[Option[RewardDesign]] =
    Jdbc.query(connection,findSql,List(id.value))(read).map(_.headOption)

  private val insertSql = """INSERT INTO reward_designs(id,quest_id,name,story,symbol,palette,image_url) VALUES(?,?,?,?,?,?,?)"""
  def insert(connection: Connection, v: RewardDesign): IO[Int] =
    Jdbc.update(connection,insertSql,List(v.id,v.questId.value,v.name,v.story,v.symbol.toString,v.palette.toString,v.imageUrl.orNull))

  private val updateDraftSql = """UPDATE reward_designs SET name=?,story=?,symbol=?,palette=?,image_url=? WHERE quest_id=?"""
  def updateDraft(connection: Connection, questId: QuestId, v: RewardDraft, imageUrl: Option[String]): IO[Int] =
    Jdbc.update(connection,updateDraftSql,List(v.name,v.story,v.symbol.toString,v.palette.toString,imageUrl.orNull,questId.value))

  private def read(r: ResultSet): RewardDesign = RewardDesign(r.getString("id"),QuestId(r.getString("quest_id")),r.getString("name"),r.getString("story"),RewardSymbol.fromString(r.getString("symbol")).toOption.get,RewardPalette.fromString(r.getString("palette")).toOption.get,Option(r.getString("image_url")))

package services.economy.tables.rewardEvent
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.users.objects.UserId
import services.quests.objects.{QuestId, StepId}

object RewardEventTable:
  private val listSql = """SELECT * FROM reward_events WHERE user_id=? ORDER BY created_at DESC LIMIT 2000"""
  def list(connection: Connection, userId: UserId): IO[List[RewardEvent]] =
    Jdbc.query(connection,listSql,List(userId.value))(read)

  private val dailyCoinsSql = """SELECT COALESCE(SUM(coins),0)::integer AS total FROM reward_events WHERE user_id=? AND reward_day=?"""
  def dailyCoins(connection: Connection, userId: UserId, day: String): IO[List[Int]] =
    Jdbc.query(connection,dailyCoinsSql,List(userId.value,day))(r => r.getInt("total"))

  private val insertSql = """INSERT INTO reward_events VALUES(?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, userId: UserId, v: RewardEvent, day: String): IO[Int] =
    Jdbc.update(connection,insertSql,List(v.id,userId.value,v.questId.value,v.stepId.value,v.coins,v.experience,day,v.createdAt))

  private def read(r: ResultSet): RewardEvent = RewardEvent(r.getString("id"),QuestId(r.getString("quest_id")),StepId(r.getString("step_id")),r.getInt("coins"),r.getInt("experience"),r.getLong("created_at"))

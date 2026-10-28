package services.economy.tables.taskReward
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.users.objects.UserId
import services.quests.objects.QuestId

object TaskRewardTable:
  private val unlockSql = """INSERT INTO task_rewards VALUES(?,?,?,?) ON CONFLICT(quest_id) DO NOTHING"""
  def unlock(connection: Connection, userId: UserId, questId: QuestId, id: String, at: Long): IO[Int] =
    Jdbc.update(connection,unlockSql,List(id,userId.value,questId.value,at))

  private val listSql = """SELECT t.id AS reward_id,t.unlocked_at,d.* FROM task_rewards t JOIN reward_designs d ON d.quest_id=t.quest_id WHERE t.user_id=? ORDER BY t.unlocked_at DESC"""
  def list(connection: Connection, userId: UserId): IO[List[TaskReward]] =
    Jdbc.query(connection,listSql,List(userId.value))(r => TaskReward(r.getString("reward_id"),QuestId(r.getString("quest_id")),RewardDesign(r.getString("id"),QuestId(r.getString("quest_id")),r.getString("name"),r.getString("story"),RewardSymbol.fromString(r.getString("symbol")).toOption.get,RewardPalette.fromString(r.getString("palette")).toOption.get,Option(r.getString("image_url"))),r.getLong("unlocked_at")))

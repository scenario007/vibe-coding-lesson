package services.quests.tables.questStep
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.parser.decode
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.quests.objects.*
import services.quests.objects.{QuestId, StepId}

object QuestStepTable:
  private val listSql = """SELECT * FROM quest_steps WHERE quest_id=? ORDER BY position"""
  def list(connection: Connection, id: QuestId): IO[List[QuestStep]] =
    Jdbc.query(connection,listSql,List(id.value))(read)

  private val insertSql = """INSERT INTO quest_steps VALUES(?,?,?,?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, v: QuestStep): IO[Int] =
    Jdbc.update(connection,insertSql,List(v.id.value,v.questId.value,v.position,v.title,v.description,v.checklist.asJson.noSpaces,v.minutes,v.criterion,v.dependsOn.asJson.noSpaces,v.completedAt.map(Long.box).orNull,0))

  private val completeSql = """UPDATE quest_steps SET completed_at=? WHERE id=? AND completed_at IS NULL"""
  def complete(connection: Connection, id: StepId, at: Long): IO[Int] =
    Jdbc.update(connection,completeSql,List(at,id.value))

  private val deleteDraftStepsSql = """DELETE FROM quest_steps WHERE quest_id=? AND completed_at IS NULL"""
  def deleteDraftSteps(connection: Connection, id: QuestId): IO[Int] =
    Jdbc.update(connection,deleteDraftStepsSql,List(id.value))

  private def read(r: ResultSet): QuestStep = QuestStep(StepId(r.getString("id")),QuestId(r.getString("quest_id")),r.getInt("position"),r.getString("title"),r.getString("description"),decode[List[String]](r.getString("checklist")).toOption.get,r.getInt("minutes"),r.getString("criterion"),decode[List[Int]](r.getString("depends_on")).toOption.get,Option(r.getObject("completed_at")).map(_ => r.getLong("completed_at")))

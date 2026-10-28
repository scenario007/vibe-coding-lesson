package services.ai.tables.generationJob
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.parser.decode
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.ai.objects.*
import services.users.objects.UserId

object GenerationJobTable:
  private val findSql = """SELECT * FROM ai_generation_jobs WHERE id=? AND user_id=?"""
  def find(connection: Connection, id: JobId, userId: UserId): IO[Option[GenerationJob]] =
    Jdbc.query(connection,findSql,List(id.value,userId.value))(read).map(_.headOption)

  private val findByRequestKeySql = """SELECT * FROM ai_generation_jobs WHERE request_key=? AND user_id=?"""
  def findByRequestKey(connection: Connection, key: String, userId: UserId): IO[Option[GenerationJob]] =
    Jdbc.query(connection,findByRequestKeySql,List(key,userId.value))(read).map(_.headOption)

  private val dailyCountSql = """SELECT COUNT(*)::integer AS total FROM ai_generation_jobs WHERE user_id=? AND created_at>=?"""
  def dailyCount(connection: Connection, userId: UserId, since: Long): IO[List[Int]] =
    Jdbc.query(connection,dailyCountSql,List(userId.value,since))(r => r.getInt("total"))

  private val insertSql = """INSERT INTO ai_generation_jobs(id,user_id,status,goal,due_date,daily_minutes,preference,feedback,result,error,created_at,request_key,generate_reward_image) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, v: GenerationJob, key: String): IO[Int] =
    Jdbc.update(connection,insertSql,List(v.id.value,v.userId.value,v.status.toString,v.goal,v.dueDate.orNull,v.dailyMinutes.map(Int.box).orNull,v.preference,v.feedback,v.result.map(_.asJson.noSpaces).orNull,v.error.orNull,v.createdAt,key,Boolean.box(v.generateRewardImage)))

  private val claimNextSql = """UPDATE ai_generation_jobs SET status='running' WHERE id=(SELECT id FROM ai_generation_jobs WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *"""
  def claimNext(connection: Connection): IO[Option[GenerationJob]] =
    Jdbc.query(connection,claimNextSql,Nil)(read).map(_.headOption)

  private val succeedSql = """UPDATE ai_generation_jobs SET status='succeeded',result=?,error=NULL WHERE id=?"""
  def succeed(connection: Connection, id: JobId, result: PlanDraft): IO[Int] =
    Jdbc.update(connection,succeedSql,List(result.asJson.noSpaces,id.value))

  private val failSql = """UPDATE ai_generation_jobs SET status='failed',error=? WHERE id=?"""
  def fail(connection: Connection, id: JobId, message: String): IO[Int] =
    Jdbc.update(connection,failSql,List(message,id.value))

  private val recoverInterruptedSql = """UPDATE ai_generation_jobs SET status='failed',error='上一次生成被服务重启中断，请重新生成。' WHERE status='running'"""
  def recoverInterrupted(connection: Connection): IO[Int] =
    Jdbc.update(connection,recoverInterruptedSql,Nil)

  private val listForUserSql = "SELECT * FROM ai_generation_jobs WHERE user_id=? AND status='succeeded' ORDER BY created_at DESC LIMIT 10"
  def listForUser(connection: Connection, userId: UserId): IO[List[GenerationJob]] =
    Jdbc.query(connection,listForUserSql,List(userId.value))(read)

  private def read(r: ResultSet): GenerationJob = GenerationJob(JobId(r.getString("id")),UserId(r.getString("user_id")),JobStatus.fromString(r.getString("status")).toOption.get,r.getString("goal"),Option(r.getString("due_date")),Option(r.getObject("daily_minutes")).map(_.asInstanceOf[Number].intValue()),r.getString("preference"),r.getString("feedback"),Option(r.getString("result")).flatMap(s => decode[PlanDraft](s).toOption),Option(r.getString("error")),r.getLong("created_at"),r.getBoolean("generate_reward_image"))

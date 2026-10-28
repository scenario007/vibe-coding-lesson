package services.quests.tables.quest
import cats.effect.IO
import java.sql.{Connection, ResultSet}
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.quests.objects.*
import services.users.objects.UserId
import services.quests.objects.QuestId

object QuestTable:
  private val findByIdSql = """SELECT * FROM quests WHERE id=? AND user_id=?"""
  def findById(connection: Connection, id: QuestId, userId: UserId): IO[Option[QuestRecord]] =
    Jdbc.query(connection,findByIdSql,List(id.value,userId.value))(read).map(_.headOption)

  private val lockSql = """SELECT * FROM quests WHERE id=? AND user_id=? FOR UPDATE"""
  def lock(connection: Connection, id: QuestId, userId: UserId): IO[Option[QuestRecord]] =
    Jdbc.query(connection,lockSql,List(id.value,userId.value))(read).map(_.headOption)

  private val listForUserSql = """SELECT * FROM quests WHERE user_id=? ORDER BY created_at DESC LIMIT 500"""
  def listForUser(connection: Connection, userId: UserId): IO[List[QuestRecord]] =
    Jdbc.query(connection,listForUserSql,List(userId.value))(read)

  private val insertSql = """INSERT INTO quests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"""
  def insert(connection: Connection, v: QuestRecord): IO[Int] =
    Jdbc.update(connection,insertSql,List(v.id.value,v.userId.value,v.title,v.category.toString,v.description,v.dueDate.orNull,RewardTier.toString(v.tier),v.status.toString,v.archivedFrom.toString,v.version,v.reflection,v.createdAt,v.completedAt.map(Long.box).orNull))

  private val saveSql = """UPDATE quests SET title=?,category=?,description=?,due_date=?,tier=?,status=?,archived_from=?,version=?,reflection=?,completed_at=? WHERE id=? AND user_id=?"""
  def save(connection: Connection, v: QuestRecord): IO[Int] =
    Jdbc.update(connection,saveSql,List(v.title,v.category.toString,v.description,v.dueDate.orNull,RewardTier.toString(v.tier),v.status.toString,v.archivedFrom.toString,v.version,v.reflection,v.completedAt.map(Long.box).orNull,v.id.value,v.userId.value))

  private def read(r: ResultSet): QuestRecord = QuestRecord(QuestId(r.getString("id")),UserId(r.getString("user_id")),r.getString("title"),QuestCategory.fromString(r.getString("category")).toOption.get,r.getString("description"),Option(r.getString("due_date")),RewardTier.fromString(r.getString("tier")).toOption.get,QuestStatus.fromString(r.getString("status")).toOption.get,QuestStatus.fromString(r.getString("archived_from")).toOption.get,r.getInt("version"),r.getString("reflection"),r.getLong("created_at"),Option(r.getObject("completed_at")).map(_ => r.getLong("completed_at")))

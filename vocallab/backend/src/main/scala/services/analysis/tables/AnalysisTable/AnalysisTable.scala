package services.analysis.tables.AnalysisTable

import cats.effect.{IO, Resource}
import io.circe.parser.decode
import io.circe.syntax.*
import java.sql.{Connection, ResultSet}
import java.util.UUID
import services.analysis.objects.*
import services.system.objects.ApiError
import org.http4s.Status

object AnalysisTable:
  private def readJob(rows: ResultSet): AnalysisJob =
    AnalysisJob(rows.getObject("id", classOf[UUID]),
      JobStatus.fromString(rows.getString("status")).fold(message => throw IllegalStateException(message), identity),
      Stage.fromString(rows.getString("stage")).fold(message => throw IllegalStateException(message), identity),
      Option(rows.getString("error")),
      decode[AnalysisSelection](rows.getString("selection")).fold(throw _, identity),
      rows.getTimestamp("created_at").toInstant.toString)

  private val insertSql = """
    INSERT INTO vocal_analysis (id, reference_id, user_id, selection, status, stage)
    SELECT ?, ?, ?, ?::jsonb, 'pending', 'queued'
    WHERE (SELECT count(*) FROM vocal_analysis WHERE status IN ('pending', 'processing')) < 6
    RETURNING *
  """
  def insert(connection: Connection, id: UUID, selection: AnalysisSelection): IO[AnalysisJob] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(insertSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking {
        statement.setObject(1, id)
        statement.setObject(2, selection.reference.mediaId)
        statement.setObject(3, selection.user.mediaId)
        statement.setString(4, selection.asJson.noSpaces)
        statement.executeQuery()
      }).use(rows => IO.blocking {
        if rows.next() then readJob(rows) else throw ApiError(Status.TooManyRequests, "待分析任务已满，请稍后重试。")
      })
    }

  private val findSql = "SELECT * FROM vocal_analysis WHERE id = ?"
  def find(connection: Connection, id: UUID): IO[Option[AnalysisJob]] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(findSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking {
        statement.setObject(1, id)
        statement.executeQuery()
      }).use(rows => IO.blocking(Option.when(rows.next())(readJob(rows))))
    }

  private val claimSql = """
    UPDATE vocal_analysis SET status = 'processing', stage = 'decode', updated_at = now()
    WHERE id = (SELECT id FROM vocal_analysis WHERE status = 'pending'
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *
  """
  def claim(connection: Connection): IO[Option[AnalysisJob]] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(claimSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking(statement.executeQuery()))
        .use(rows => IO.blocking(Option.when(rows.next())(readJob(rows))))
    }

  private val updateSql = """
    UPDATE vocal_analysis SET status = ?, stage = ?, error = ?, updated_at = now()
    WHERE id = ? AND status = 'processing'
  """
  def update(connection: Connection, id: UUID, status: JobStatus, stage: Stage, error: Option[String]): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(updateSql))).use { statement =>
      IO.blocking {
        statement.setString(1, status.toString)
        statement.setString(2, stage.toString)
        statement.setString(3, error.orNull)
        statement.setObject(4, id)
        statement.executeUpdate()
      }.void
    }

  private val recoverSql = """
    UPDATE vocal_analysis SET status = 'failed', stage = 'failed', error = '服务重启中断了分析，请重新提交。',
      updated_at = now() WHERE status = 'processing'
  """
  def recover(connection: Connection): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(recoverSql)))
      .use(statement => IO.blocking(statement.executeUpdate()).void)

  private val expireSql = """
    DELETE FROM vocal_analysis WHERE status IN ('completed', 'failed')
      AND updated_at < now() - (? * interval '1 hour') RETURNING id
  """
  def expire(connection: Connection, hours: Int): IO[Vector[UUID]] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(expireSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking {
        statement.setInt(1, hours)
        statement.executeQuery()
      }).use(rows => IO.blocking(Iterator.continually(rows.next()).takeWhile(identity)
        .map(_ => rows.getObject(1, classOf[UUID])).toVector))
    }

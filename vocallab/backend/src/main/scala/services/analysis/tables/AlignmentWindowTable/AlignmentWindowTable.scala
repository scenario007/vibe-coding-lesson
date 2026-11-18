package services.analysis.tables.AlignmentWindowTable

import cats.effect.{IO, Resource}
import java.sql.{Connection, PreparedStatement}
import services.analysis.objects.AnalysisSelection

object AlignmentWindowTable:
  private def bind(statement: PreparedStatement, selection: AnalysisSelection): Unit =
    statement.setObject(1, selection.reference.mediaId)
    statement.setObject(2, selection.user.mediaId)
    statement.setDouble(3, selection.reference.start)
    statement.setDouble(4, selection.user.start)

  private val findSql = """
    SELECT window_start, window_end FROM vocal_alignment_window
    WHERE reference_id = ? AND user_id = ? AND reference_start = ? AND user_start = ?
  """
  def find(connection: Connection, selection: AnalysisSelection): IO[Option[(Double, Double)]] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(findSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking {
        bind(statement, selection)
        statement.executeQuery()
      }).use(rows => IO.blocking(Option.when(rows.next())((rows.getDouble(1), rows.getDouble(2)))))
    }

  private val saveSql = """
    INSERT INTO vocal_alignment_window
      (reference_id, user_id, reference_start, user_start, window_start, window_end)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (reference_id, user_id, reference_start, user_start)
    DO UPDATE SET window_start = excluded.window_start, window_end = excluded.window_end
  """
  def save(connection: Connection, selection: AnalysisSelection, range: (Double, Double)): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(saveSql))).use { statement =>
      IO.blocking {
        bind(statement, selection)
        statement.setDouble(5, range._1)
        statement.setDouble(6, range._2)
        statement.executeUpdate()
      }.void
    }

  private val clearSql = """
    DELETE FROM vocal_alignment_window
    WHERE reference_id = ? AND user_id = ? AND reference_start = ? AND user_start = ?
  """
  def clear(connection: Connection, selection: AnalysisSelection): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(clearSql))).use { statement =>
      IO.blocking {
        bind(statement, selection)
        statement.executeUpdate()
      }.void
    }

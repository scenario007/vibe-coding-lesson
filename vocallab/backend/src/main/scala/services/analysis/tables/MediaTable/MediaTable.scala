package services.analysis.tables.MediaTable

import cats.effect.{IO, Resource}
import io.circe.parser.decode
import io.circe.syntax.*
import java.sql.Connection
import java.util.UUID
import services.analysis.objects.{MediaMetadata, StoredMedia}

object MediaTable:
  private val insertSql = "INSERT INTO vocal_media (id, metadata, digest) VALUES (?, ?::jsonb, ?)"
  def insert(connection: Connection, media: StoredMedia): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(insertSql))).use { statement =>
      IO.blocking {
        statement.setObject(1, media.metadata.id)
        statement.setString(2, media.metadata.asJson.noSpaces)
        statement.setString(3, media.digest)
        statement.executeUpdate()
      }.void
    }

  private val findSql = "SELECT metadata, digest FROM vocal_media WHERE id = ?"
  def find(connection: Connection, id: UUID): IO[Option[StoredMedia]] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(findSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking {
        statement.setObject(1, id)
        statement.executeQuery()
      }).use(rows => IO.blocking {
        Option.when(rows.next())(StoredMedia(decode[MediaMetadata](rows.getString(1)).fold(throw _, identity), rows.getString(2)))
      })
    }

  private val expireSql = """
    DELETE FROM vocal_media m
    WHERE created_at < now() - (? * interval '1 hour')
      AND NOT EXISTS (SELECT 1 FROM vocal_analysis a WHERE m.id IN (a.reference_id, a.user_id))
    RETURNING id
  """
  def expire(connection: Connection, hours: Int): IO[Vector[UUID]] =
    Resource.fromAutoCloseable(IO.blocking(connection.prepareStatement(expireSql))).use { statement =>
      Resource.fromAutoCloseable(IO.blocking {
        statement.setInt(1, hours)
        statement.executeQuery()
      }).use(rows => IO.blocking(Iterator.continually(rows.next()).takeWhile(identity)
        .map(_ => rows.getObject(1, classOf[UUID])).toVector))
    }

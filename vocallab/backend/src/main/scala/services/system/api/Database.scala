package services.system.api

import cats.effect.{IO, Resource}
import com.zaxxer.hikari.HikariDataSource
import java.sql.Connection

final class Database(pool: HikariDataSource):
  def use[A](run: Connection => IO[A]): IO[A] =
    Resource.fromAutoCloseable(IO.blocking(pool.getConnection)).use(run)

object Database:
  def resource: Resource[IO, Database] =
    Resource.fromAutoCloseable(IO.blocking {
      val pool = new HikariDataSource()
      pool.setJdbcUrl(sys.env.getOrElse("VOCALLAB_DB_URL", "jdbc:postgresql://127.0.0.1:5447/vocallab"))
      pool.setUsername(sys.env.getOrElse("VOCALLAB_DB_USER", "vocallab"))
      pool.setPassword(sys.env.getOrElse("VOCALLAB_DB_PASSWORD", "vocallab"))
      pool.setMaximumPoolSize(6)
      pool.setConnectionTimeout(5000)
      pool
    }).map(new Database(_))

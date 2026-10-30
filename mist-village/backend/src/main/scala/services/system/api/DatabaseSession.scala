package services.system.api
import cats.effect.{IO, Resource}
import cats.syntax.all.*
import com.zaxxer.hikari.{HikariConfig,HikariDataSource}
import java.sql.Connection
object DatabaseSession:
  private lazy val pool =
    val config = new HikariConfig()
    config.setJdbcUrl(sys.env.getOrElse("MIST_DATABASE_URL", "jdbc:postgresql://127.0.0.1:5432/mist_village"))
    config.setUsername(sys.env.getOrElse("MIST_DATABASE_USER", "mist_village"))
    config.setPassword(sys.env.getOrElse("MIST_DATABASE_PASSWORD", ""))
    config.setMaximumPoolSize(4)
    config.setConnectionTimeout(5000)
    new HikariDataSource(config)
  def transaction[A](f: Connection => IO[A]): IO[A] =
    Resource.fromAutoCloseable(IO.blocking(pool.getConnection)).use { c =>
      IO.blocking(c.setAutoCommit(false)) *> f(c).attempt.flatMap {
        case Right(v) => IO.blocking(c.commit()).as(v)
        case Left(e) => IO.blocking(c.rollback()).attempt *> IO.raiseError(e)
      }
    }
  def close: IO[Unit] = IO.blocking(pool.close())

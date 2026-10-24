package services.system.api
import cats.effect.{IO, Resource}
import com.zaxxer.hikari.{HikariConfig, HikariDataSource}
import java.sql.Connection
object DatabaseSession:
  private val config = new HikariConfig()
  config.setJdbcUrl(s"jdbc:postgresql://${sys.env.getOrElse("DB_HOST","127.0.0.1")}:${sys.env.getOrElse("DB_PORT","54329")}/${sys.env.getOrElse("DB_NAME","heroes")}")
  config.setUsername(sys.env.getOrElse("DB_USER","heroes"))
  config.setPassword(sys.env.getOrElse("DB_PASSWORD",""))
  config.setMaximumPoolSize(8)
  config.setConnectionTimeout(5000)
  private lazy val pool = new HikariDataSource(config)
  def transaction[A](operation: Connection => IO[A]): IO[A] =
    Resource.fromAutoCloseable(IO.blocking(pool.getConnection)).use { connection =>
      IO.blocking(connection.setAutoCommit(false)) *> operation(connection).attempt.flatMap {
        case Right(result) => IO.blocking(connection.commit()).as(result)
        case Left(error) => IO.blocking(connection.rollback()).attempt *> IO.raiseError(error)
      }
    }
  def close: IO[Unit] = IO.blocking(pool.close())

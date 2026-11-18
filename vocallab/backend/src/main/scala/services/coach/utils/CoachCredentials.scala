package services.coach.utils

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import java.nio.file.{Files, Path, StandardCopyOption}
import java.nio.file.attribute.PosixFilePermissions
import org.http4s.Status
import services.system.objects.{ApiError, AppConfig}

private[coach] object CoachCredentials:
  private def path(config: AppConfig, kind: String): Path =
    config.runData.resolve(s".coach-$kind-key")

  def overrideKey(config: AppConfig, kind: String): IO[Option[String]] = IO.blocking {
    val file = path(config, kind)
    Option.when(Files.isRegularFile(file))(Files.readString(file).trim).filter(_.nonEmpty)
  }.recover { case _: java.nio.file.NoSuchFileException => None }

  def key(config: AppConfig, kind: String): IO[Option[String]] =
    val env = if kind == "ai" then "VOCALLAB_AI_KEY" else "VOCALLAB_SEARCH_KEY"
    overrideKey(config, kind).map(_.orElse(sys.env.get(env).map(_.trim).filter(_.nonEmpty)))

  def save(config: AppConfig, kind: String, key: Option[String]): IO[Unit] =
    val value = key.map(_.trim)
    for
      _ <- IO.raiseUnless(Set("ai", "search")(kind) && value.forall(s =>
        s.length >= 8 && s.length <= 4096 && s.forall(c => c >= '!' && c <= '~')))(
        ApiError(Status.BadRequest, "密钥格式无效。请仅粘贴服务提供的密钥。"))
      _ <- value match
        case None => IO.blocking(Files.deleteIfExists(path(config, kind))).void
        case Some(secret) =>
          Resource.make(IO.blocking(Files.createTempFile(config.runData, ".coach-key-", ".tmp",
            PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")))))(
            tmp => IO.blocking(Files.deleteIfExists(tmp)).void
          ).use { tmp =>
            IO.blocking {
              Files.writeString(tmp, secret)
              Files.move(tmp, path(config, kind), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
            }.void
          }
    yield ()

package services.analysis.utils

import cats.effect.{IO, Resource}
import java.nio.file.{Files, Path}
import java.security.MessageDigest
import java.util.{HexFormat, UUID}
import scala.jdk.CollectionConverters.*
import services.system.objects.AppConfig

private[analysis] object LocalFiles:
  def media(config: AppConfig, id: UUID): Path = config.runData.resolve("media").resolve(id.toString)
  def analysis(config: AppConfig, id: UUID): Path = config.runData.resolve("analyses").resolve(id.toString)

  def hash(path: Path): IO[String] =
    Resource.fromAutoCloseable(IO.blocking(Files.newInputStream(path))).use { input =>
      IO.blocking {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = new Array[Byte](65536)
        Iterator.continually(input.read(buffer)).takeWhile(_ >= 0).foreach(n => digest.update(buffer, 0, n))
        HexFormat.of().formatHex(digest.digest())
      }
    }

  def remove(path: Path): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(Files.walk(path)))
      .use(paths => IO.blocking(paths.iterator().asScala.toVector.reverse.foreach(Files.deleteIfExists))).void
      .recover { case _: java.nio.file.NoSuchFileException => () }

  def expireCache(path: Path, days: Int): IO[Unit] =
    IO.realTimeInstant.flatMap { now =>
      Resource.fromAutoCloseable(IO.blocking(Files.list(path))).use { entries =>
        IO.blocking(entries.iterator().asScala.filter(entry =>
          Files.getLastModifiedTime(entry).toInstant.isBefore(now.minusSeconds(days.toLong * 86400))).toVector)
      }.flatMap(_.foldLeft(IO.unit)((effect, entry) => effect *> remove(entry)))
    }

package services.analysis.utils

import cats.effect.{IO, Ref, Resource}
import cats.syntax.all.*
import fs2.{io, text}
import java.io.InputStream
import java.nio.file.Path
import scala.concurrent.duration.*
import services.system.objects.ApiError
import org.http4s.Status

private[analysis] object Command:
  def run(args: List[String], cwd: Path, deadline: FiniteDuration,
          onLine: String => IO[Unit], env: Map[String, String] = Map.empty): IO[Int] =
    val process = Resource.make(IO.blocking {
      val builder = new ProcessBuilder(args*)
      builder.directory(cwd.toFile)
      builder.redirectInput(ProcessBuilder.Redirect.from(new java.io.File("/dev/null")))
      builder.redirectErrorStream(true)
      builder.environment().remove("VOCALLAB_AI_KEY")
      builder.environment().remove("VOCALLAB_SEARCH_KEY")
      env.foreach((key, value) => builder.environment().put(key, value))
      builder.start()
    })(stop)
    process.use { child =>
      for
        expired <- Ref.of[IO, Boolean](false)
        code <- (IO.sleep(deadline) *> IO.defer {
          if child.isAlive then expired.set(true) *> stop(child) else IO.unit
        }).background.use { _ =>
          val input: IO[InputStream] = IO.delay(child.getInputStream)
          io.readInputStream(input, 8192)
            .through(text.utf8.decode)
            .through(text.lines)
            .evalMap(line => onLine(line.take(8192)))
            .compile.drain.attempt.flatMap { read =>
              IO.blocking(child.waitFor()).flatMap(exit => expired.get.flatMap {
                case true => IO.raiseError(ApiError(Status.RequestTimeout, "本地处理超时。请选择更短的片段后重试。"))
                case false => IO.fromEither(read).as(exit)
              })
            }
        }
      yield code
    }

  private def stop(child: Process): IO[Unit] =
    IO.blocking(child.isAlive).ifM(
      Resource.fromAutoCloseable(IO.blocking(child.descendants())).use { descendants =>
        IO.blocking {
          descendants.forEach(_.destroyForcibly())
          child.destroyForcibly()
          child.waitFor(3, java.util.concurrent.TimeUnit.SECONDS)
        }.void
      }, IO.unit)

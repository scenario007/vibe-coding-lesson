package services.system.utils

import cats.effect.{IO, IOApp, Resource}
import cats.effect.std.Semaphore
import com.comcast.ip4s.{host, Port}
import java.nio.file.Path
import org.http4s.ember.server.EmberServerBuilder
import org.http4s.implicits.*
import scala.concurrent.duration.*
import services.analysis.api.AnalysisRuntime
import services.analysis.routes.AnalysisRoutes
import services.system.api.Database
import services.system.objects.AppConfig
import services.system.routes.APIMessageRouter

object Main extends IOApp.Simple:
  private def configuration: IO[AppConfig] = IO.delay {
    val root = Path.of(sys.env.getOrElse("VOCALLAB_ROOT", "..")).toAbsolutePath.normalize()
    def path(key: String, fallback: String): Path = sys.env.get(key).map(Path.of(_).toAbsolutePath.normalize())
      .getOrElse(root.resolve(fallback))
    def int(key: String, fallback: Int, minimum: Int, maximum: Int): Int =
      val value = sys.env.get(key).fold(fallback)(_.toInt)
      require(value >= minimum && value <= maximum, s"$key must be between $minimum and $maximum")
      value
    AppConfig(root, path("VOCALLAB_DATA", ".local/run"), path("VOCALLAB_MODELS", ".local/models"),
      path("VOCALLAB_PYTHON", ".venv/bin/python"), int("VOCALLAB_PORT", 8818, 1024, 65535),
      int("VOCALLAB_FRONTEND_PORT", 5188, 1024, 65535), int("VOCALLAB_UPLOAD_MIB", 150, 1, 512) * 1048576L,
      int("VOCALLAB_MAX_DURATION", 900, 1, 3600), int("VOCALLAB_MAX_CLIP", 60, 1, 60),
      int("VOCALLAB_WORKER_TIMEOUT", 1200, 30, 3600), int("VOCALLAB_MEDIA_HOURS", 72, 1, 720),
      int("VOCALLAB_CACHE_DAYS", 14, 1, 90))
  }

  def run: IO[Unit] =
    (for
      config <- Resource.eval(configuration)
      database <- Database.resource
      uploads <- Resource.eval(Semaphore[IO](2))
      queue <- Resource.eval(Semaphore[IO](1))
      _ <- AnalysisRuntime.background(database, config)
      routes = AnalysisRoutes.routes(database, config, uploads, queue).orNotFound
      _ <- EmberServerBuilder.default[IO].withHost(host"127.0.0.1").withPort(Port.fromInt(config.port).get)
        .withIdleTimeout(150.seconds).withRequestHeaderReceiveTimeout(20.seconds)
        .withHttpApp(APIMessageRouter.local(routes, config)).build
      _ <- Resource.eval(IO.println(s"VocalLab API ready at http://127.0.0.1:${config.port}"))
    yield ()).useForever

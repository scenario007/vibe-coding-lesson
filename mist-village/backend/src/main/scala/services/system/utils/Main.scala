package services.system.utils
import cats.effect.{IO,IOApp,Resource}
import cats.syntax.all.*
import org.http4s.ember.server.EmberServerBuilder
import org.http4s.implicits.*
import com.comcast.ip4s.{host,Port}
import services.system.api.DatabaseSession
import services.system.routes.APIMessageRouter
import services.game.routes.GameRoutes
import services.ai.routes.AiRoutes
import services.game.tables.AdventureTable.AdventureTableInitializer
import services.game.tables.StoryProgressTable.StoryProgressTableInitializer
import services.game.tables.OutcomeTable.OutcomeTableInitializer
object Main extends IOApp.Simple:
  def run: IO[Unit] =
    (for
      _ <- Resource.eval(DatabaseSession.transaction(c => AdventureTableInitializer.initialize(c) *> StoryProgressTableInitializer.initialize(c) *> OutcomeTableInitializer.initialize(c)))
      server <- EmberServerBuilder.default[IO].withHost(host"127.0.0.1").withPort(Port.fromInt(sys.env.getOrElse("MIST_HTTP_PORT","8089").toInt).get).withHttpApp(APIMessageRouter.routes(GameRoutes.apiMessages ++ AiRoutes.apiMessages).orNotFound).build
      _ <- Resource.eval(IO.println(s"雾谷后端已启动: ${server.address}"))
    yield server).useForever.guarantee(DatabaseSession.close)

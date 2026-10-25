package services.system.utils
import services.system.api.DatabaseSession
import cats.effect.{IO, IOApp, Resource}
import cats.syntax.all.*
import org.http4s.ember.server.EmberServerBuilder
import org.http4s.implicits.*
import com.comcast.ip4s.{host, Port}
import services.system.routes.APIMessageRouter
import services.users.routes.UsersRoutes
import services.quests.routes.QuestsRoutes
import services.economy.routes.EconomyRoutes
import services.focus.routes.FocusRoutes
import services.ai.routes.AiRoutes
import services.adventure.routes.AdventureRoutes
import services.ai.api.GenerationRuntime
import services.ai.tables.generationJob.GenerationJobTable
object Main extends IOApp.Simple:
  def run: IO[Unit] =
    val messages = UsersRoutes.apiMessages ++ QuestsRoutes.apiMessages ++ EconomyRoutes.apiMessages ++ FocusRoutes.apiMessages ++ AiRoutes.apiMessages ++ AdventureRoutes.apiMessages
    val resource = for
      _ <- Resource.eval(Schema.initialize)
      _ <- Resource.eval(DatabaseSession.transaction(c=>GenerationJobTable.recoverInterrupted(c)))
      _ <- Resource.eval(DatabaseSession.transaction(c=>services.ai.tables.usageEvent.UsageEventTable.recoverInterrupted(c)))
      _ <- GenerationRuntime.background
      server <- EmberServerBuilder.default[IO].withHost(host"127.0.0.1").withPort(Port.fromInt(sys.env.getOrElse("HTTP_PORT","8088").toInt).get).withHttpApp(APIMessageRouter.routes(messages).orNotFound).build
      _ <- Resource.eval(IO.println("Heroes backend ready at http://127.0.0.1:"+server.address.getPort))
    yield server
    resource.useForever.guarantee(DatabaseSession.close)

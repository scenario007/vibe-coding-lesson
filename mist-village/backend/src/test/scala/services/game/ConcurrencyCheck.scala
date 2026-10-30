package services.game
import cats.effect.{IO,IOApp,Deferred}
import cats.syntax.all.*
import scala.concurrent.duration.*
import services.system.api.DatabaseSession
import services.game.tables.AdventureTable.AdventureTable
object ConcurrencyCheck extends IOApp.Simple:
  def run: IO[Unit] = for
    id <- IO.fromOption(sys.env.get("MIST_TEST_ADVENTURE_ID"))(new RuntimeException("missing test adventure"))
    acquired <- Deferred[IO,Unit]
    release <- Deferred[IO,Unit]
    holder <- DatabaseSession.transaction(c => AdventureTable.findForUpdate(c,id) *> acquired.complete(()) *> release.get).start
    _ <- acquired.get
    read <- DatabaseSession.transaction(c => AdventureTable.find(c,id)).timeout(2.seconds)
    _ <- IO.raiseWhen(read.isEmpty)(new RuntimeException("档案读取失败"))
    writer <- DatabaseSession.transaction(c => AdventureTable.findForUpdate(c,id)).start
    blocked <- writer.join.map(_ => false).timeoutTo(300.millis,IO.pure(true))
    _ <- IO.raiseWhen(!blocked)(new RuntimeException("并发修改未被阻塞"))
    _ <- release.complete(())
    _ <- holder.joinWithNever
    _ <- writer.joinWithNever.timeout(2.seconds)
    _ <- IO.println("PASS: reads remain available while changes wait for locked generation")
  yield ()

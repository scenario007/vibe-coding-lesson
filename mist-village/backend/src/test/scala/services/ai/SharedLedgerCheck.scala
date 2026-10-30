package services.ai
import cats.effect.{IO,IOApp}
import cats.syntax.all.*
import services.ai.utils.SharedLedger
object SharedLedgerCheck extends IOApp.Simple:
  def run: IO[Unit] = for
    now <- IO.realTime.map(_.toMillis)
    results <- (1 to 4).toList.parTraverse(i => SharedLedger.reserve(s"test-$i",1000,now).attempt.map(i -> _))
    successes = results.collect { case (i,Right(_)) => i }
    _ <- IO.raiseWhen(successes.size != 1)(new RuntimeException(s"预算锁错误：成功 ${successes.size} 次"))
    _ <- SharedLedger.settle(s"test-${successes.head}",None,now,now)
    again <- SharedLedger.reserve("test-after-unconfirmed",1000,now).attempt
    _ <- IO.raiseWhen(again.isRight)(new RuntimeException("未确认的费用预留被错误释放"))
    _ <- IO.println("PASS: concurrent budget reservation and unconfirmed hold")
  yield ()

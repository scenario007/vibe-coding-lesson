package services.focus.utils
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.objects.AppError
import services.users.objects.*
import services.quests.objects.*
import services.quests.objects.apiTypes.*
import services.economy.objects.*
import services.users.tables.user.UserTable
import services.ai.objects.*

import services.focus.objects.*
import services.focus.objects.apiTypes.FocusResponse
import services.focus.tables.focusSession.FocusSessionTable
import services.focus.tables.focusSegment.FocusSegmentTable

private[focus] object FocusTiming:
  private[focus] def elapsed(s: FocusSession,now: Long): Int = math.min(s.targetSeconds,s.elapsedSeconds+s.runningSince.map(t=>math.max(0L,(now-t)/1000).toInt).getOrElse(0))
  private[focus] def checkpoint(c: Connection,s: FocusSession,now: Long,status: FocusStatus): IO[FocusSession] =
    val total = elapsed(s,now)
    val updated = s.copy(elapsedSeconds=total,runningSince=if status==FocusStatus.running then Some(now) else None,status=status,endedAt=if status==FocusStatus.completed || status==FocusStatus.abandoned then Some(now) else None)
    for
      _ <- s.runningSince.traverse(t=>FocusSegmentTable.insert(c,s.id,t,math.min(now,t+(s.targetSeconds-s.elapsedSeconds)*1000L)))
      _ <- FocusSessionTable.save(c,updated)
    yield updated
  private[focus] def current(c: Connection,userId: UserId,now: Long): IO[Option[FocusSession]] =
    FocusSessionTable.current(c,userId).flatMap(_.traverse(s=>if s.status==FocusStatus.running && elapsed(s,now)>=s.targetSeconds then checkpoint(c,s,now,FocusStatus.completed) else IO.pure(s)))
  private[focus] def transition(c: Connection,userId: UserId,action: String): IO[FocusResponse] =
    for
      _ <- UserTable.lock(c,userId)
      now <- IO.realTime.map(_.toMillis)
      existing <- current(c,userId,now)
      s <- IO.fromOption(existing)(AppError(409,"当前没有进行中的专注"))
      result <- if s.status==FocusStatus.completed then IO.pure(s) else action match
        case "pause" if s.status==FocusStatus.running => checkpoint(c,s,now,FocusStatus.paused)
        case "pause" if s.status==FocusStatus.paused => IO.pure(s)
        case "resume" if s.status==FocusStatus.paused => checkpoint(c,s,now,FocusStatus.running)
        case "resume" if s.status==FocusStatus.running => IO.pure(s)
        case "finish" if elapsed(s,now)>=s.targetSeconds => checkpoint(c,s,now,FocusStatus.completed)
        case "abandon" => checkpoint(c,s,now,FocusStatus.abandoned)
        case _ => IO.raiseError(AppError(409,"计时尚未达到目标，可以先暂停或结束本次记录"))
    yield FocusResponse(Some(result),now)

package services.adventure.api
import services.adventure.objects.apiTypes.DashboardResponse
import services.adventure.objects.apiTypes.DayActivity
import services.focus.objects.FocusStatus
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.time.{Instant, ZoneId}
import services.system.api.APIWithTokenMessage
import services.economy.tables.rewardEvent.RewardEventTable
import services.economy.tables.taskReward.TaskRewardTable

import services.users.api.GetCurrentUserAPIMessage
import services.quests.api.ListQuestsAPIMessage
import services.focus.tables.focusSession.FocusSessionTable
import services.focus.tables.focusSegment.FocusSegmentTable

final case class GetDashboardAPIMessage(userId: UserId) extends APIWithTokenMessage[DashboardResponse]:
  override def plan(connection: Connection): IO[DashboardResponse] =
    for
      user <- GetCurrentUserAPIMessage(userId).plan(connection)
      quests <- ListQuestsAPIMessage(userId).plan(connection)
      events <- RewardEventTable.list(connection,userId)
      segments <- FocusSegmentTable.list(connection,userId)
      now <- IO.realTime.map(_.toMillis)
      current <- FocusSessionTable.current(connection,userId)
      zone = ZoneId.of("Asia/Shanghai")
      today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate
      allSegments = segments.map(s=>(s.startedAt,s.endedAt)) ++ current.filter(_.status==FocusStatus.running).flatMap(s=>s.runningSince.map(start=>(start,math.min(now,start+(s.targetSeconds-s.elapsedSeconds)*1000L)))).toList
      week = (0 to 6).toList.map { index =>
        val date = today.minusDays(6-index)
        val start = date.atStartOfDay(zone).toInstant.toEpochMilli
        val end = date.plusDays(1).atStartOfDay(zone).toInstant.toEpochMilli
        val dayEvents = events.filter(e=>e.createdAt>=start && e.createdAt<end)
        val seconds = allSegments.map { case(a,b)=> math.max(0L,math.min(b,end)-math.max(a,start))/1000 }.sum.toInt
        DayActivity(date.toString,dayEvents.size,seconds)
      }
      rewards <- TaskRewardTable.list(connection,userId)
    yield DashboardResponse(user,quests,quests.count(q=>q.quest.completedAt.nonEmpty),week.last.steps,week.last.focusSeconds,week,rewards)

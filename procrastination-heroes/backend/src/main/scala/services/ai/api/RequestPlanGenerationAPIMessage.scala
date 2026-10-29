package services.ai.api
import services.system.objects.AppError
import services.ai.objects.GenerationJob
import services.ai.objects.JobId
import services.ai.objects.JobStatus
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import java.time.{LocalDate, Instant, ZoneId}
import services.system.api.APIWithTokenMessage
import services.users.tables.user.UserTable
import services.ai.tables.generationJob.GenerationJobTable


final case class RequestPlanGenerationAPIMessage(userId: UserId, goal: String, dueDate: Option[String], dailyMinutes: Option[Int], preference: String, feedback: String, requestKey: String, generateRewardImage: Option[Boolean]) extends APIWithTokenMessage[GenerationJob]:
  override def plan(connection: Connection): IO[GenerationJob] =
    for
      _ <- UserTable.lock(connection,userId)
      _ <- if goal.trim.length>=2 && goal.length<=1500 && dailyMinutes.forall(m=>m>=5 && m<=480) && preference.length<=200 && feedback.length<=1000 && requestKey.matches("[a-zA-Z0-9-]{16,80}") && dueDate.forall(d=>scala.util.Try(LocalDate.parse(d)).isSuccess) then IO.unit else IO.raiseError(AppError(400,"请填写目标，投入时间可以留空，目标最多 1500 字"))
      existing <- GenerationJobTable.findByRequestKey(connection,requestKey,userId)
      result <- existing match
        case Some(job) => IO.pure(job)
        case None =>
          for
            now <- IO.realTime.map(_.toMillis)
            count <- GenerationJobTable.dailyCount(connection,userId,Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Shanghai")).toLocalDate.atStartOfDay(ZoneId.of("Asia/Shanghai")).toInstant.toEpochMilli)
            _ <- if count.headOption.getOrElse(0)<20 then IO.unit else IO.raiseError(AppError(429,"今天已生成 20 次，先推进已有计划，明天再来吧"))
            id <- IO(UUID.randomUUID().toString).map(JobId(_))
            job = GenerationJob(id,userId,JobStatus.pending,goal.trim,dueDate,dailyMinutes,preference,feedback,None,None,now,generateRewardImage.getOrElse(true))
            _ <- GenerationJobTable.insert(connection,job,requestKey)
          yield job
    yield result

package services.ai.api
import services.system.objects.AppError
import services.ai.objects.GenerationJob
import services.ai.objects.JobId
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.ai.tables.generationJob.GenerationJobTable


final case class GetGenerationJobAPIMessage(userId: UserId, jobId: JobId) extends APIWithTokenMessage[GenerationJob]:
  override def plan(connection: Connection): IO[GenerationJob] =
    GenerationJobTable.find(connection,jobId,userId).flatMap(v=>IO.fromOption(v)(AppError(404,"找不到这次生成记录")))

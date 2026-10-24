package services.ai.api
import services.ai.objects.GenerationJob
import services.users.objects.UserId
import cats.effect.IO
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.ai.tables.generationJob.GenerationJobTable
final case class ListGenerationJobsAPIMessage(userId: UserId) extends APIWithTokenMessage[List[GenerationJob]]:
  def plan(connection: Connection): IO[List[GenerationJob]] = GenerationJobTable.listForUser(connection,userId)

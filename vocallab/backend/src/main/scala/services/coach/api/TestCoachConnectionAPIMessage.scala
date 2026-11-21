package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.coach.objects.apiTypes.CoachConnectionTest
import services.coach.utils.CoachProviders
import services.system.api.NoRequestMessage
import services.system.objects.AppConfig

final case class TestCoachConnectionAPIMessage(config: AppConfig) extends NoRequestMessage[CoachConnectionTest]:
  def plan(connection: Connection): IO[CoachConnectionTest] =
    CoachProviders.testConnection(config)

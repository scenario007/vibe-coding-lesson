package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.coach.objects.apiTypes.CoachSettingsStatus
import services.coach.utils.CoachProviders
import services.system.api.NoRequestMessage
import services.system.objects.AppConfig

final case class GetCoachSettingsAPIMessage(config: AppConfig) extends NoRequestMessage[CoachSettingsStatus]:
  def plan(connection: Connection): IO[CoachSettingsStatus] =
    CoachProviders.settings(config)

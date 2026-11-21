package services.coach.api

import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.coach.objects.apiTypes.{CoachSettingsStatus, SetCoachKeyRequest}
import services.coach.utils.{CoachCredentials, CoachProviders}
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class SetCoachKeyAPIMessage(input: SetCoachKeyRequest, config: AppConfig) extends APIMessage[CoachSettingsStatus]:
  def plan(connection: Connection): IO[CoachSettingsStatus] =
    CoachCredentials.save(config, input.kind, input.key) *> CoachProviders.settings(config)

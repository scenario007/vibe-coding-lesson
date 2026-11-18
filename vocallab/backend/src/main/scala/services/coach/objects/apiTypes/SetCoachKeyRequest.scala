package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class SetCoachKeyRequest(analysisId: java.util.UUID, kind: String, key: Option[String])

object SetCoachKeyRequest:
  given Codec.AsObject[SetCoachKeyRequest] = deriveCodec

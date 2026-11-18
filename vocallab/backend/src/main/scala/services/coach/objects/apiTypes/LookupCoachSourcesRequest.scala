package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import services.coach.objects.SongInfo

final case class LookupCoachSourcesRequest(analysisId: java.util.UUID, song: SongInfo)

object LookupCoachSourcesRequest:
  given Codec.AsObject[LookupCoachSourcesRequest] = deriveCodec

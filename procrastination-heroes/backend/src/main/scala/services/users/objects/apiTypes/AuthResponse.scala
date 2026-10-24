package services.users.objects.apiTypes
import services.users.objects.UserProfile
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class AuthResponse(token: String, user: UserProfile)
object AuthResponse:
  given Encoder[AuthResponse] = deriveEncoder[AuthResponse]
  given Decoder[AuthResponse] = deriveDecoder[AuthResponse]

package services.users.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class StoredUser(profile: UserProfile, passwordHash: String, salt: String)
object StoredUser:
  given Encoder[StoredUser] = deriveEncoder[StoredUser]
  given Decoder[StoredUser] = deriveDecoder[StoredUser]

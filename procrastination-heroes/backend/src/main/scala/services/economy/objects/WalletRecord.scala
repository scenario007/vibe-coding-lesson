package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class WalletRecord(coins: Int)
object WalletRecord:
  given Encoder[WalletRecord] = deriveEncoder[WalletRecord]
  given Decoder[WalletRecord] = deriveDecoder[WalletRecord]

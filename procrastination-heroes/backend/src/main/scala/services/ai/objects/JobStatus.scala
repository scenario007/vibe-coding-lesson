package services.ai.objects
import io.circe.{Encoder, Decoder}
enum JobStatus:
  case pending, running, succeeded, failed
object JobStatus:
  def fromString(value: String): Either[String,JobStatus] = JobStatus.values.find(_.toString == value.trim.toLowerCase).toRight("无效的 JobStatus")
  def toString(value: JobStatus): String = value.toString
  given Encoder[JobStatus] = Encoder.encodeString.contramap(toString)
  given Decoder[JobStatus] = Decoder.decodeString.emap(fromString)

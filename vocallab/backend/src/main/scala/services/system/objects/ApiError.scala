package services.system.objects

import org.http4s.Status

final case class ApiError(status: Status, message: String) extends RuntimeException(message)

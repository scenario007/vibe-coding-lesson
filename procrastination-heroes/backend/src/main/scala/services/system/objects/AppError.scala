package services.system.objects
final case class AppError(status: Int, message: String) extends RuntimeException(message)

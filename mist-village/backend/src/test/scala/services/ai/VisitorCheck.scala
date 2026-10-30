package services.ai
import cats.effect.{IO,IOApp}
import services.ai.utils.VisitorValidation
object VisitorCheck extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val valid="""{"kind":"courier","contact":"guard"}"""
    val invalid="""{"kind":"courier","contact":"healer"}"""
    assert(VisitorValidation.parse(valid,Set("guard"),Set.empty).isRight)
    assert(VisitorValidation.parse(valid,Set("guard"),Set("courier")).isLeft)
    assert(VisitorValidation.parse(valid,Set("mia"),Set.empty).isLeft)
    assert(VisitorValidation.parse(invalid,Set("healer"),Set.empty).isLeft)
    println("PASS: visitor type, relationship, known contact and uniqueness validated")
  }

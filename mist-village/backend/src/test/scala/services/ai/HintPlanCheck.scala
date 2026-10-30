package services.ai
import cats.effect.{IO,IOApp}
import services.ai.utils.HintPlanValidation
object HintPlanCheck extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val known=List("守卫提到封矿", "药师发现病症")
    val valid="""{"indexes":[0,1],"gap":"time"}"""
    val invalid="""{"indexes":[0,9],"gap":"time"}"""
    val result=HintPlanValidation.build(valid,known,"connection").toOption.get.text
    assert(known.forall(result.contains) && result.contains("仍需验证"))
    assert(HintPlanValidation.build(invalid,known,"connection").isLeft)
    println("PASS: hints only reference known evidence and preserve uncertainty")
  }

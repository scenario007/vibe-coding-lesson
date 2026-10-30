package services.ai
import cats.effect.{IO,IOApp}
import services.ai.utils.ChallengeValidation
object ChallengeCheck extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val valid="""{"incident":"mine_accident","involvedNpc":"smith","knowledge":"unaware","motive":"oversight"}"""
    val invalid="""{"incident":"chemical_accident","involvedNpc":"mia","knowledge":"aware","motive":"economic"}"""
    val conflict="""{"incident":"mine_accident","involvedNpc":"mayor","knowledge":"unaware","motive":"economic"}"""
    assert(ChallengeValidation.parse(valid).isRight)
    assert(ChallengeValidation.parse(invalid).isLeft)
    assert(ChallengeValidation.parse(conflict).isLeft)
    println("PASS: challenge incident, participant, knowledge and motive constraints")
  }

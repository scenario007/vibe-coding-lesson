package services.ai
import cats.effect.{IO,IOApp}
import services.ai.utils.QuestPlanValidation
object QuestPlanCheck extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val good="""{"title":"矿洞的踪迹","goal":"read_report","issuer":"healer","reward":"trust"}"""
    val forged="""{"title":"矿洞的踪迹","goal":"destroy_world","issuer":"healer","reward":"trust"}"""
    val stranger="""{"title":"陌生人的秘密","goal":"read_report","issuer":"mayor","reward":"trust"}"""
    assert(QuestPlanValidation.parse(good,List("read_report"),Set("healer")).isRight)
    assert(QuestPlanValidation.parse(forged,List("read_report"),Set("healer")).isLeft)
    assert(QuestPlanValidation.parse(stranger,List("read_report"),Set("healer")).isLeft)
    val grounded="""{"goal":"read_report","issuer":"healer","reward":"trust","reasonIndex":0}"""
    assert(QuestPlanValidation.parse(grounded,List("read_report"),Set("healer"),Map("healer"->1)).isRight)
    assert(QuestPlanValidation.parse(grounded,List("read_report"),Set("healer"),Map("healer"->0)).isLeft)
    assert(QuestPlanValidation.parse("not json",List("read_report"),Set("healer")).isLeft)
    println("PASS: generated quest validates known issuer, supported goal and format")
  }

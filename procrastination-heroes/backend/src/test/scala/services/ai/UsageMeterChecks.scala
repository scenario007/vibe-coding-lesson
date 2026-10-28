package services.ai
import cats.effect.{IO,IOApp}
import cats.syntax.all.*
import java.time.Instant
import java.nio.file.{Files,Path}
import io.circe.Json
import services.ai.objects.*
import services.ai.tables.generationJob.{GenerationJobTable,GenerationJobTableInitializer}
import services.ai.tables.usageEvent.{UsageEventTable,UsageEventTableInitializer}
import services.ai.utils.{UsageMeter,UsagePricing,PlanValidation}
import services.quests.objects.{QuestCategory,StageDraft}
import services.economy.objects.{RewardDraft,RewardSymbol,RewardPalette}
import services.system.api.DatabaseSession
import services.users.objects.*
import services.users.tables.user.{UserTable,UserTableInitializer}
object UsageMeterChecks extends IOApp.Simple:
  private def check(v: Boolean,label: String): IO[Unit] = if v then IO.println("PASS: "+label) else IO.raiseError(new AssertionError(label))
  private val off=Instant.parse("2026-10-25T02:00:00Z").toEpochMilli
  private val high=Instant.parse("2026-10-26T02:00:00Z").toEpochMilli
  private val user=UserId("meter-fixture-user")
  private def job(i: Int) = GenerationJob(JobId("meter-job-"+i),user,JobStatus.pending,"整理书桌",None,Some(20),"","",None,None,off)
  private val fixture=Json.obj("usage"->Json.obj("prompt_tokens"->Json.fromLong(1000),"completion_tokens"->Json.fromLong(200),"prompt_tokens_details"->Json.obj("cached_tokens"->Json.fromLong(800))))
  def run: IO[Unit] = (for
    _ <- check(UsagePricing.estimate(TokenReading(1000,200,0),off,off)==BigDecimal("0.0018"),"off-peak input/output pricing")
    _ <- check(UsagePricing.estimate(TokenReading(1000,200,0),high,high)==BigDecimal("0.0036"),"weekday peak pricing")
    _ <- check(UsagePricing.estimate(TokenReading(1000,200,800),off,off)==BigDecimal("0.001016"),"cache tokens are a subset, not billed twice")
    _ <- check(UsagePricing.estimate(TokenReading(1000,200,800),high,high)==BigDecimal("0.002032"),"peak cached pricing")
    _ <- check(UsagePricing.estimate(TokenReading(1000,300,0),off,off)==BigDecimal("0.0022"),"completion already includes reasoning")
    _ <- check(UsagePricing.reading(fixture).contains(TokenReading(1000,200,800)),"OpenAI usage cache extraction")
    _ <- check(UsagePricing.reading(Json.obj()).isEmpty,"missing usage is unknown, not zero")
    _ <- check(UsagePricing.reading(Json.obj("usage"->Json.obj("prompt_tokens"->Json.fromInt(1),"completion_tokens"->Json.fromInt(2),"prompt_tokens_details"->Json.obj("cached_tokens"->Json.fromInt(3))))).isEmpty,"invalid cache data rejected")
    _ <- RewardSymbol.values.toList.traverse_(symbol=>check(PlanValidation.valid(PlanDraft("写报告",QuestCategory.study,"先写一句",List(StageDraft("写一句","打开文档",List("写一句话"),5,"文档不再空白",Nil)),RewardDraft("任务战利品","纪念开工",symbol,RewardPalette.sage))),"finite reward symbol accepted: "+symbol.toString))
    unsupported <- UsageMeter.reserve(job(99),"unpriced-model",1000,off).attempt
    _ <- check(unsupported.isLeft,"unpriced model is blocked before any provider request")
    _ <- DatabaseSession.transaction(c=>List(UserTableInitializer.initialize(c),GenerationJobTableInitializer.initialize(c),UsageEventTableInitializer.initialize(c)).sequence_)
    _ <- DatabaseSession.transaction(c=>UserTable.insert(c,StoredUser(UserProfile(user,"meter_fixture","账本测试",UserAvatar.leaf,3,25,off),"test-only-non-login-hash","fixture")))
    _ <- DatabaseSession.transaction(c=>(1 to 8).toList.traverse_(i=>GenerationJobTable.insert(c,job(i),"request-key-"+i)))
    results <- (1 to 8).toList.parTraverse(i=>UsageMeter.reserve(job(i),"deepseek-v4.1-flash",1000,off).attempt.map(i->_))
    accepted=results.collect { case (i,Right(_))=>i }
    _ <- check(accepted.size==2 && results.count(_._2.isLeft)==6,"8 concurrent reservations: only 2 fit remaining CNY 0.05")
    before <- DatabaseSession.transaction(UsageEventTable.totals)
    _ <- check(before.heldCny==UsagePricing.quote(1000)*2,"reserved fees survive in the database")
    _ <- UsageMeter.settle(job(accepted.head),Some(fixture),off,off)
    _ <- UsageMeter.settle(job(accepted.last),None,off,off)
    after <- DatabaseSession.transaction(UsageEventTable.totals)
    _ <- check(after.measuredCny==BigDecimal("0.001016") && after.heldCny==UsagePricing.quote(1000),"measured settlement releases excess, unknown request retains hold")
    _ <- UsageMeter.settle(job(accepted.head),None,off,off)
    again <- DatabaseSession.transaction(UsageEventTable.totals)
    _ <- check(again==after,"repeated settlement cannot overwrite recorded usage")
    rows <- DatabaseSession.transaction(c=>UsageEventTable.listForUser(c,UserId("other-user")))
    _ <- check(rows.isEmpty,"other user cannot read caller usage details")
    _ <- check(after.measuredCny+after.heldCny+BigDecimal("9.95")<=UsageMeter.budget,"project usage plus asset ledger remains within budget")
  yield ()).guarantee(DatabaseSession.close)

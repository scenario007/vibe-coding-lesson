package services.game
import cats.effect.{IO,IOApp}
import services.game.objects.*
import services.game.api.CustomResolution
object ResolutionChecks extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val base=Adventure("t","旅人","调查员","标准","mine_accident",1,20,"gate",100,0,Nil,Nil,1,false,aiEnabled=true)
    assert(!CustomResolution.validShape(ResolutionPlan("water","person",Some("merchant"))))
    assert(CustomResolution.validShape(ResolutionPlan("unsupported","none",None)))
    val invalid=ResolutionPlan("water","oil",None)
    assert(CustomResolution.preview(base,invalid).isLeft)
    val withFilter=base.copy(items=base.items :+ ItemStack("filter",1))
    val water=CustomResolution.preview(withFilter,invalid).toOption.get
    assert(water.hours==2 && water.warning.isEmpty)
    val (finished,success)=CustomResolution.execute(withFilter,invalid).toOption.get
    assert(success && finished.sealedEnding && !finished.items.exists(_.id=="filter") && !finished.items.exists(_.id=="oil"))
    assert(finished.events.last.contains("暂时安全") && finished.events.last.contains("后续处理"))
    val late=withFilter.copy(hour=80)
    assert(CustomResolution.preview(late,invalid).toOption.get.warning.nonEmpty)
    val (failed,ok)=CustomResolution.execute(late,invalid).toOption.get
    assert(!ok && failed.sealedEnding && failed.events.last.contains("失控"))
    val guard=base.npcs.map(n=>if n.id=="guard" then n.copy(met=true,trust=50) else n)
    val escort=base.copy(npcs=guard)
    assert(CustomResolution.preview(escort,ResolutionPlan("evacuate","person",Some("guard"))).isRight)
    assert(CustomResolution.execute(escort,ResolutionPlan("evacuate","person",Some("guard"))).toOption.get._1.events.last.contains("仍未得到解决"))
    assert(CustomResolution.preview(escort.copy(place="forest"),ResolutionPlan("evacuate","person",Some("guard"))).isLeft)
    val chemical=base.copy(stage=2,truth="chemical_accident")
    assert(CustomResolution.execute(chemical,ResolutionPlan("contain","oil",None)).toOption.get._1.events.last.contains("停止药剂投放"))
    println("PASS: AI solution prerequisites, alternative helper, consumption and timeout")
  }

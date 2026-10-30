package services.ai

import cats.effect.{IO,IOApp}
import services.ai.api.ProposeActionAPIMessage
import services.ai.objects.ActionProposal
import services.game.objects.Adventure
import services.ai.utils.TokenHub

object ActionCheck extends IOApp.Simple:
  def run: IO[Unit] = IO {
    val a=Adventure("test","旅人","调查员","标准","mine_accident",1,9,"gate",100,0,Nil,Nil,0,false)
    assert(ProposeActionAPIMessage.status(a,ActionProposal("inspect_gate","查看告示"))=="ready")
    assert(ProposeActionAPIMessage.status(a,ActionProposal("ask_clinic","询问药师"))=="unavailable")
    assert(ProposeActionAPIMessage.status(a,ActionProposal("unknown","无法匹配"))=="unsupported")
    val valid=TokenHub.parseProposal("""{"action":"inspect:old_map","explanation":"寻找旧地图"}""")
    assert(valid.exists(_.action=="inspect:old_map"))
    assert(TokenHub.parseProposal("""{"action":"kill:guard","explanation":"攻击守卫"}""").isLeft)
    assert(TokenHub.parseProposal("""{"action":"inspect:old_map","explanation":""}""").isLeft)
    println("PASS: unsupported and unavailable action proposals are not service failures")
  }

package services.game.api
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
import services.game.tables.StoryProgressTable.StoryProgressTable
import services.ai.api.GenerateChallenge
final case class CreateAdventureAPIMessage(name: String, role: String, difficulty: String, aiEnabled: Option[Boolean], storyId: Option[String], replaceId: Option[String], confirmReplace: Option[Boolean], mode: Option[String], profile: Option[PlayerProfile], confirmProfile: Option[Boolean]) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] =
    for
      selectedMode <- IO.pure(mode.getOrElse("standard"))
      _ <- if name.trim.nonEmpty && name.length<=24 && Set("故事","标准","艰难").contains(difficulty) then IO.unit else IO.raiseError(AppError(400,"角色信息无效"))
      _ <- selectedMode match
        case "standard" => if Set("流浪医师","前矿工","商队向导","调查员").contains(role) && profile.isEmpty then IO.unit else IO.raiseError(AppError(400,"标准模式需使用预设角色"))
        case "challenge" =>
          val ids=NpcState.initial.map(_.id).toSet
          val valid=profile.exists(p => p.background.trim.nonEmpty && p.background.length<=800 && p.secret.forall(s=>s.trim.nonEmpty && s.length<=300) && p.secretKnownBy.distinct.size==p.secretKnownBy.size && p.secretKnownBy.forall(ids.contains) && (p.secret.nonEmpty || p.secretKnownBy.isEmpty) && p.stats.forall(s => List(s.body,s.agility,s.insight,s.social).forall(v=>v>=0 && v<=2) && s.body+s.agility+s.insight+s.social==2 && s.growthPoints==0 && s.talents.isEmpty))
          if role=="自定义" && aiEnabled.contains(true) && storyId.isEmpty && confirmProfile.contains(true) && valid then IO.unit else IO.raiseError(AppError(400,"挑战模式需要确认自定义背景并开启 AI"))
        case _ => IO.raiseError(AppError(400,"未知游戏模式"))
      _ <- AdventureTable.lock(c)
      count <- AdventureTable.count(c)
      _ <- replaceId match
        case Some(oldId) =>
          for
            _ <- if confirmReplace.contains(true) then IO.unit else IO.raiseError(AppError(400,"覆盖档案前必须确认"))
            old <- AdventureTable.findForUpdate(c,oldId)
            _ <- IO.fromOption(old)(AppError(404,"要覆盖的档案不存在"))
            _ <- AdventureTable.delete(c,oldId)
          yield ()
        case None => if count < 3 then IO.unit else IO.raiseError(AppError(409,"冒险档案已达三个上限"))
      id <- IO(UUID.randomUUID().toString)
      seed <- IO(new java.security.SecureRandom().nextLong())
      progress <- StoryProgressTable.list(c)
      _ <- if selectedMode=="standard" && role=="商队向导" && !progress.exists(_._2) then IO.raiseError(AppError(409,"商队向导需要先完成任意一条主线结局")) else IO.unit
      stories=List("mine_accident","chemical_accident")
      mapping=Map("case_a" -> "mine_accident","case_b" -> "chemical_accident")
      requested <- storyId match
        case Some(id) => IO.fromOption(mapping.get(id))(AppError(400,"剧情编号无效")).flatMap(t => if progress.exists(v => v._1==t && v._3) then IO.pure(Some(t)) else IO.raiseError(AppError(409,"只有已通关剧情可以指定")))
        case None => IO.pure(None)
      unseen=stories.filterNot(t => progress.exists(v => v._1==t && v._2))
      uncleared=stories.filterNot(t => progress.exists(v => v._1==t && v._3))
      choices=if unseen.nonEmpty then unseen else if uncleared.nonEmpty then uncleared else stories
      challenge <- if selectedMode=="challenge" then GenerateChallenge.create(id,profile.get).map(Some(_)) else IO.pure(None)
      truth=challenge.map(_.incident).getOrElse(requested.getOrElse(choices(Math.floorMod(seed,choices.length.toLong).toInt)))
      initialNpcs=profile.fold(NpcState.initial)(p => NpcState.initial.map(n => if p.secretKnownBy.contains(n.id) then n.copy(memories=n.memories :+ s"玩家告知的秘密：${p.secret.getOrElse("")}",facts=n.facts :+ NpcFact(s"玩家的秘密：${p.secret.getOrElse("")}","玩家")) else n))
      startingMoney=if difficulty=="故事" then 14 else if difficulty=="艰难" then 7 else 10
      startingFood=if difficulty=="故事" then 3 else if difficulty=="艰难" then 1 else 2
      startingItems=List(ItemStack("medicine",1),ItemStack("food",startingFood),ItemStack("oil",1))
      a = Adventure(id,name.trim,role,difficulty,truth,seed,9,"gate",100,0,Nil,List("抵达雾谷"),0,false,npcs=initialNpcs,aiEnabled=aiEnabled.getOrElse(false),mode=selectedMode,profile=profile,challengeTruth=challenge,money=startingMoney,items=startingItems,stats=Some(profile.flatMap(_.stats).getOrElse(PlayerStats.forRole(role))))
      _ <- AdventureTable.insert(c,a)
      _ <- AdventureTable.save(c,a,0)
    yield AdventureView.from(a)
object CreateAdventureAPIMessage:
  given Encoder[CreateAdventureAPIMessage] = deriveEncoder
  given Decoder[CreateAdventureAPIMessage] = deriveDecoder

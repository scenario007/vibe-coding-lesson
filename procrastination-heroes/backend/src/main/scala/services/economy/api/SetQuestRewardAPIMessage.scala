package services.economy.api
import services.system.objects.ActionResult
import services.system.objects.AppError
import services.quests.objects.QuestId
import services.quests.objects.QuestStatus
import services.economy.objects.RewardDesign
import services.economy.objects.RewardDraft
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIMessage
import services.quests.tables.quest.QuestTable
import services.economy.tables.rewardDesign.RewardDesignTable
import services.ai.api.GenerateImageAPIMessage
import services.ai.objects.ImageAssetKind

final case class SetQuestRewardAPIMessage(userId: UserId,questId: QuestId,reward: RewardDraft,generateIfMissing: Boolean) extends APIMessage[ActionResult]:
  def plan(connection: Connection): IO[ActionResult] =
    for
      quest <- QuestTable.findById(connection,questId,userId).flatMap(v=>IO.fromOption(v)(AppError(404,"找不到任务")))
      _ <- if quest.status==QuestStatus.draft && reward.name.trim.nonEmpty && reward.name.length<=60 && reward.story.trim.nonEmpty && reward.story.length<=500 then IO.unit else IO.raiseError(AppError(400,"请检查奖励名称、文案与模板样式"))
      existing <- RewardDesignTable.find(connection,questId)
      changed = existing.forall(current => current.name != reward.name.trim || current.story != reward.story.trim || current.symbol != reward.symbol || current.palette != reward.palette)
      fixed = (reward.name.trim, reward.symbol.toString) match
        case ("作业书本", "book") | ("坚持哑铃", "dumbbell") | ("好奇心显微镜", "microscope") => true
        case _ => false
      image <- if fixed then IO.pure(None)
      else if reward.imageUrl.nonEmpty then IO.pure(reward.imageUrl)
      else if !changed && existing.flatMap(_.imageUrl).nonEmpty then IO.pure(existing.flatMap(_.imageUrl))
      else if !generateIfMissing then IO.pure(None)
      else
        IO(UUID.randomUUID().toString).flatMap { imageId =>
          GenerateImageAPIMessage(
            userId,
            ImageAssetKind.reward,
            s"任务主题：${quest.title}。任务等级：${quest.tier.toString}。战利品名称：${reward.name.trim}。战利品故事与外观线索：${reward.story.trim}。根据任务和名称创造独特的物件轮廓与细节，不要默认重复锅盖盾；如果名称明确要求某种形状，就保留其形状并做出独特设计。日常任务要轻巧朴素，挑战任务要有更多装饰细节，长期任务要华丽但仍保持手绘可读性。",
            imageId
          ).plan(connection).map(_.imageUrl)
        }
      _ <- existing match
        case Some(_) => RewardDesignTable.updateDraft(connection,questId,reward,image).void
        case None => IO(UUID.randomUUID().toString).flatMap(id=>RewardDesignTable.insert(connection,RewardDesign(id,questId,reward.name.trim,reward.story.trim,reward.symbol,reward.palette,image))).void
    yield ActionResult(true)

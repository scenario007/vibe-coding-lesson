package services.quests.api
import services.system.objects.AppError
import services.quests.objects.apiTypes.QuestDetail
import services.quests.objects.QuestId
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable
import services.quests.tables.questStep.QuestStepTable
import services.economy.tables.rewardDesign.RewardDesignTable


final case class GetQuestAPIMessage(userId: UserId, questId: QuestId) extends APIWithTokenMessage[QuestDetail]:
  override def plan(connection: Connection): IO[QuestDetail] =
    for
      quest <- QuestTable.findById(connection,questId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这项任务")))
      steps <- QuestStepTable.list(connection,questId)
      reward <- RewardDesignTable.find(connection,questId).flatMap(v => IO.fromOption(v)(AppError(500,"奖励设计尚未保存")))
    yield QuestDetail(quest,steps,reward)

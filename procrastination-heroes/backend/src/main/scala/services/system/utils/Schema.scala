package services.system.utils
import services.system.api.DatabaseSession
import cats.effect.IO
import cats.syntax.all.*
private[system] object Schema:
  private[system] def initialize: IO[Unit] = DatabaseSession.transaction(c => List(
    services.users.tables.user.UserTableInitializer.initialize(c),
    services.users.tables.session.SessionTableInitializer.initialize(c),
    services.quests.tables.quest.QuestTableInitializer.initialize(c),
    services.quests.tables.questStep.QuestStepTableInitializer.initialize(c),
    services.economy.tables.wallet.WalletTableInitializer.initialize(c),
    services.adventure.tables.progress.ProgressTableInitializer.initialize(c),
    services.economy.tables.rewardEvent.RewardEventTableInitializer.initialize(c),
    services.economy.tables.rewardDesign.RewardDesignTableInitializer.initialize(c),
    services.economy.tables.taskReward.TaskRewardTableInitializer.initialize(c),
    services.economy.tables.storeItem.StoreItemTableInitializer.initialize(c),
    services.economy.tables.furniturePreview.FurniturePreviewTableInitializer.initialize(c),
    services.economy.tables.playerItem.PlayerItemTableInitializer.initialize(c),
    services.economy.tables.roomPlacement.RoomPlacementTableInitializer.initialize(c),
    services.focus.tables.focusSession.FocusSessionTableInitializer.initialize(c),
    services.focus.tables.focusSegment.FocusSegmentTableInitializer.initialize(c),
    services.ai.tables.generationJob.GenerationJobTableInitializer.initialize(c),
    services.ai.tables.usageEvent.UsageEventTableInitializer.initialize(c)
  ).sequence_.void)

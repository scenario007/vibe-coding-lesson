package services.game.routes
import services.system.api.RegisteredAPIMessage
import services.game.api.*
import services.game.objects.*
import services.game.objects.apiTypes.{MapLocation,GrowthOption}
object GameRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[CreateAdventureAPIMessage,AdventureView],
    RegisteredAPIMessage.register[ListAdventuresAPIMessage,List[AdventureView]],
    RegisteredAPIMessage.register[ListStoryProgressAPIMessage,List[StoryProgress]],
    RegisteredAPIMessage.register[ListRolesAPIMessage,List[RoleOption]],
    RegisteredAPIMessage.register[ListOutcomesAPIMessage,List[OutcomeRecord]],
    RegisteredAPIMessage.register[GetAdventureAPIMessage,AdventureView],
    RegisteredAPIMessage.register[GetMapAPIMessage,List[MapLocation]],
    RegisteredAPIMessage.register[ListActionsAPIMessage,List[ActionOption]],
    RegisteredAPIMessage.register[GetShopAPIMessage,List[ShopItem]],
    RegisteredAPIMessage.register[AddJournalNoteAPIMessage,AdventureView],
    RegisteredAPIMessage.register[MarkClueAPIMessage,AdventureView],
    RegisteredAPIMessage.register[SpendGrowthAPIMessage,AdventureView],
    RegisteredAPIMessage.register[ListGrowthOptionsAPIMessage,List[GrowthOption]],
    RegisteredAPIMessage.register[RevealTruthAPIMessage,TruthReveal],
    RegisteredAPIMessage.register[PerformActionAPIMessage,ActionResult],
    RegisteredAPIMessage.register[ExecuteResolutionAPIMessage,AdventureView],
    RegisteredAPIMessage.register[SaveAdventureAPIMessage,AdventureView],
    RegisteredAPIMessage.register[ListSavesAPIMessage,List[SaveSummary]],
    RegisteredAPIMessage.register[LoadAdventureAPIMessage,AdventureView])

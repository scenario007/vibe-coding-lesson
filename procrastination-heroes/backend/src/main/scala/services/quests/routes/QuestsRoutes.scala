package services.quests.routes
import services.quests.objects.apiTypes.QuestDetail
import services.quests.objects.apiTypes.StepCompletionResponse
import cats.syntax.all.*

import io.circe.generic.auto.*
import services.quests.api.*
import services.system.api.RegisteredAPIMessage
object QuestsRoutes:
  val apiMessages: List[RegisteredAPIMessage] = List(
    RegisteredAPIMessage.register[GetQuestAPIMessage,QuestDetail](true),
    RegisteredAPIMessage.register[ListQuestsAPIMessage,List[QuestDetail]](true),
    RegisteredAPIMessage.register[CreateQuestDraftAPIMessage,QuestDetail](true),
    RegisteredAPIMessage.register[SaveQuestDraftAPIMessage,QuestDetail](true),
    RegisteredAPIMessage.register[StartQuestAPIMessage,QuestDetail](true),
    RegisteredAPIMessage.register[CompleteQuestStepAPIMessage,StepCompletionResponse](true),
    RegisteredAPIMessage.register[ArchiveQuestAPIMessage,QuestDetail](true),
    RegisteredAPIMessage.register[RestoreQuestAPIMessage,QuestDetail](true),
    RegisteredAPIMessage.register[UpdateQuestNotesAPIMessage,QuestDetail](true)
  )

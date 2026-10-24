package services.focus.api
import services.system.objects.AppError
import services.focus.objects.FocusId
import services.focus.objects.apiTypes.FocusResponse
import services.focus.objects.FocusSession
import services.focus.objects.FocusStatus
import services.quests.objects.QuestStatus
import services.quests.objects.StepId
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIWithTokenMessage
import services.quests.tables.quest.QuestTable
import services.quests.tables.questStep.QuestStepTable
import services.economy.tables.wallet.WalletTable

import services.focus.tables.focusSession.FocusSessionTable
import services.focus.utils.FocusTiming
final case class StartFocusAPIMessage(userId: UserId, stepId: Option[StepId], minutes: Int) extends APIWithTokenMessage[FocusResponse]:
  override def plan(connection: Connection): IO[FocusResponse] =
    for
      _ <- WalletTable.lock(connection,userId)
      now <- IO.realTime.map(_.toMillis)
      current <- FocusTiming.current(connection,userId,now)
      _ <- if current.forall(s=>s.status==FocusStatus.completed) && Set(10,25,45).contains(minutes) then IO.unit else IO.raiseError(AppError(409,"已有一段专注正在进行，或时长不在支持范围内"))
      _ <- stepId.traverse { id =>
        QuestTable.listForUser(connection,userId).flatMap(_.filter(_.status==QuestStatus.active).traverse(q=>QuestStepTable.list(connection,q.id))).flatMap(steps=>if steps.flatten.exists(s=>s.id==id && s.completedAt.isEmpty) then IO.unit else IO.raiseError(AppError(403,"只能选择自己的未完成任务步骤")))
      }
      id <- IO(UUID.randomUUID().toString).map(FocusId(_))
      session = FocusSession(id,userId,stepId,minutes*60,FocusStatus.running,0,Some(now),now,None)
      _ <- FocusSessionTable.insert(connection,session)
    yield FocusResponse(Some(session),now)

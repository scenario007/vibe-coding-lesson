package services.ai.utils
import io.circe.parser.decode
import services.ai.objects.{Hint,HintPlan}
import services.system.objects.AppError
private[ai] object HintPlanValidation:
  private[ai] def build(raw: String, clues: List[String], level: String): Either[AppError,Hint] =
    decode[HintPlan](raw).left.map(_=>AppError(502,"提示格式无效")).flatMap { p =>
      val needed=if level=="connection" then 2 else 1
      val gaps=Map("person"->"可以继续询问知情人物。","location"->"可以继续调查相关地点。","time"->"可以核对事件的先后时间。","evidence"->"可以寻找更多证据验证。","none"->"暂时没有更多可确认的信息。")
      if p.indexes.size!=needed || p.indexes.distinct.size!=needed || !p.indexes.forall(i=>i>=0 && i<clues.size) || !gaps.contains(p.gap) then Left(AppError(502,"提示引用的线索未通过检查"))
      else
        val text=if needed==1 then s"可以重新查看：${clues(p.indexes.head)}" else s"可以比较这两条线索：${clues(p.indexes.head)}；${clues(p.indexes(1))}。两者是否相关仍需验证。"
        Right(Hint(text+gaps(p.gap)))
    }

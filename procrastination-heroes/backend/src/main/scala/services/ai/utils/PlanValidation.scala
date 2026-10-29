package services.ai.utils
import cats.syntax.all.*
import services.users.objects.*
import services.quests.objects.*
import services.quests.objects.apiTypes.*
import services.economy.objects.*
import services.ai.objects.*

private[ai] object PlanValidation:
  private[ai] def valid(p: PlanDraft): Boolean =
    p.title.trim.nonEmpty && p.title.length<=100 && p.summary.length<=3000 && p.stages.nonEmpty && p.stages.size<=5 && p.stages.zipWithIndex.forall {case(s,i)=>s.title.trim.nonEmpty && s.title.length<=120 && s.description.length<=1200 && s.minutes>=1 && s.minutes<=480 && s.checklist.nonEmpty && s.checklist.size<=5 && s.checklist.forall(v=>v.nonEmpty && v.length<=200) && s.criterion.nonEmpty && s.criterion.length<=300 && s.dependsOn.distinct==s.dependsOn && s.dependsOn.forall(n=>n>=0 && n<i)} && p.reward.name.nonEmpty && p.reward.name.length<=60 && p.reward.story.nonEmpty && p.reward.story.length<=500

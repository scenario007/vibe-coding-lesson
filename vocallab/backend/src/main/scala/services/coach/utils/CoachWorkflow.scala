package services.coach.utils

import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json
import io.circe.syntax.*
import java.util.UUID
import org.http4s.Status
import services.analysis.objects.AnalysisReport
import services.coach.objects.*
import services.coach.objects.apiTypes.*
import services.system.objects.{ApiError, AppConfig}

private[coach] object CoachWorkflow:
  private val defaults = Vector("high_notes", "consecutive_high_notes", "sustained_notes", "relative_dynamics", "vocal_continuity")
  private val algorithmLimit = 6

  private def check(valid: Boolean, message: String, modelOutput: Boolean = false): IO[Unit] =
    IO.raiseUnless(valid)(ApiError(if modelOutput then Status.BadGateway else Status.BadRequest, message))

  private def text(value: String, max: Int): Boolean = value.trim.nonEmpty && value.length <= max
  private def toolIds(catalog: Vector[ToolDefinition]): Set[String] = catalog.map(_.id).toSet
  private def validTools(tools: Vector[String], allowed: Set[String], max: Int): Boolean =
    tools.size <= max && tools.distinct == tools && tools.forall(allowed)

  private def interval(report: AnalysisReport, start: Double, end: Double): Boolean =
    start.isFinite && end.isFinite && start >= 0 && end <= report.preprocessing.referenceDuration + .00001 && end - start >= .10

  private def view(config: AppConfig, session: Option[CoachSession], report: AnalysisReport,
      catalog: Vector[ToolDefinition]): IO[CoachView] =
    for
      ai <- CoachProviders.aiAvailable(config)
      model <- CoachProviders.model(config)
      search <- CoachProviders.searchProvider(config)
      overrides <- Vector("ai", "deepseek", "search").traverse(kind => CoachCredentials.overrideKey(config, kind)
        .map(key => Option.when(key.nonEmpty)(kind)))
      usage <- CoachBilling.summary(config, report.analysisId)
    yield CoachView(session, session.exists(_.revision != CoachStore.revision(report)),
      ai, search != "none", catalog, model, search, overrides.flatten.toSet, usage)

  def get(config: AppConfig, report: AnalysisReport): IO[CoachView] =
    (CoachStore.load(config, report), CoachStore.catalog(config)).tupled.flatMap((session, catalog) =>
      view(config, session, report, catalog))

  def updateKey(config: AppConfig, report: AnalysisReport, input: SetCoachKeyRequest): IO[CoachView] =
    CoachCredentials.save(config, input.kind, input.key) *> get(config, report)

  private def target(id: String, tool: String, start: Double, end: Double): Json =
    Json.obj("id" -> id.asJson, "tool" -> tool.asJson, "start" -> start.asJson, "end" -> end.asJson)

  private def measurements(config: AppConfig, report: AnalysisReport, map: Vector[Difficulty], threshold: Option[Double]): IO[AcousticBatch] =
    val targets = map.flatMap(d => (d.tool +: d.analysisTools).distinct.map(target(d.id, _, d.start, d.end)))
    if targets.isEmpty then IO.pure(AcousticBatch(1, Vector.empty, Vector.empty, Vector.empty))
    else CoachStore.acoustic(config, report, Json.obj("targets" -> targets.asJson, "highThreshold" -> threshold.asJson))

  private def priority(candidates: Vector[AcousticCandidate], catalog: Vector[ToolDefinition]): Vector[Difficulty] =
    candidates.groupBy(_.tool).valuesIterator.map(_.maxBy(c => (c.measurement.coverage, c.end - c.start))).toVector
      .sortBy(c => (c.start, c.tool)).take(6).map { c =>
        val label = catalog.find(_.id == c.tool).fold(c.tool)(_.label)
        Difficulty(c.id, c.tool, c.start, c.end, label, "由当前原唱选段的声学特征检出。",
          Vector.empty, Vector.empty, false)
      }

  private def sourceStatus(status: String): Vector[String] = status match
    case "results" => Vector("联网资料已纳入分析计划。请按实际录音核对版本和观点。")
    case "empty" => Vector("未检索到可用的歌曲资料，分析以录音测量为依据。")
    case "unavailable" => Vector("联网检索暂不可用，分析以录音测量为依据。")
    case "unconfigured" => Vector("未配置 AI 联网服务，本次依据本地声学数据及通用知识。")
    case _ => Vector.empty

  private def context(report: AnalysisReport): Json =
    val valid = report.pitchTracks.reference.midiPitch.flatten.sorted
    val representative = if valid.isEmpty then Json.Null
      else Vector(valid(valid.size / 10), valid(valid.size - 1 - valid.size / 10)).asJson
    Json.obj("referenceSeconds" -> report.preprocessing.referenceDuration.asJson, "referenceMidi10to90" -> representative,
      "baseMetrics" -> report.metrics.filter(_.value.nonEmpty).asJson,
      "aligned" -> report.alignment.reliable.asJson, "alignmentConfidence" -> report.alignment.confidence.asJson,
      "separated" -> Json.obj("reference" -> report.separation.reference.enabled.asJson,
        "user" -> report.separation.user.enabled.asJson),
      "limitations" -> Vector("全局偏移无法修正逐句节奏变化", "相对动态不可直接推断真实声压或发声方式").asJson)

  // The model cites keys; the actual value and unit are resolved from local evidence.
  private def evidence(items: Vector[AcousticObservation]): Map[String, (String, Double)] =
    items.flatMap { item =>
      val tracks = Vector("reference" -> item.reference.metrics, "comparison" -> item.comparison) ++
        item.user.toVector.map(m => "user" -> m.metrics)
      tracks.flatMap { (role, metrics) =>
        metrics.toVector.map((key, value) => s"${item.id}/$role/$key" -> (item.segmentId, value))
      }
    }.toMap

  private def evidenceJson(items: Vector[AcousticObservation]): Json =
    evidence(items).toVector.sortBy(_._1).map((id, data) =>
      Json.obj("id" -> id.asJson, "value" -> data._2.asJson)).asJson

  private def validFeedback(feedback: CoachFeedback, ids: Set[String], facts: Map[String, (String, Double)]): Boolean =
    ids(feedback.segmentId) && feedback.evidenceIds.nonEmpty && feedback.evidenceIds.size <= 12 &&
      feedback.evidenceIds.forall(id => facts.get(id).exists(_._1 == feedback.segmentId)) &&
      text(feedback.observation, 900) && text(feedback.interpretation, 900) && text(feedback.practice.goal, 400) &&
      feedback.practice.steps.nonEmpty && feedback.practice.steps.size <= 6 && feedback.practice.steps.forall(text(_, 300)) &&
      text(feedback.practice.difficulty, 300) && text(feedback.practice.verification, 400)

  private def drafts(config: AppConfig, report: AnalysisReport, song: SongInfo, sources: Vector[ResearchSource],
      selected: Vector[String], catalog: Vector[ToolDefinition], deep: Boolean): IO[CoachPlan] =
    if !deep then IO.pure(CoachPlan("从现有音轨测量可复听的声学候选。", Vector.empty,
      selected.map(ToolChoice(_, "本地专项选择")), Vector.empty))
    else
      val allowed = toolIds(catalog)
      val known = sources.map(_.id).toSet
      for
        plan <- CoachProviders.generate[CoachPlan](config, report.analysisId, "歌曲研究与分析计划", CoachPrompts.plan,
          Json.obj("song" -> song.asJson, "sources" -> sources.asJson, "audioOverview" -> context(report),
            "availableTools" -> catalog.asJson))
        _ <- check(text(plan.summary, 1600) && plan.hypotheses.size <= 8 && plan.limitations.size <= 8 &&
          plan.limitations.forall(text(_, 500)) &&
          plan.tools.nonEmpty && validTools(plan.tools.map(_.tool), allowed, 4) &&
          plan.tools.forall(item => text(item.reason, 500)) && plan.hypotheses.forall(h =>
            text(h.description, 600) && h.locationHint.length <= 300 && h.sourceIds.size <= 8 && h.sourceIds.forall(known)),
          "AI 分析计划包含未注册工具或无效研究引用。", modelOutput = true)
      yield plan

  private def choose(config: AppConfig, report: AnalysisReport, song: SongInfo, candidates: Vector[AcousticCandidate], plan: CoachPlan, sources: Vector[ResearchSource],
      catalog: Vector[ToolDefinition], deep: Boolean): IO[(Vector[Difficulty], Vector[String])] =
    if !deep || candidates.isEmpty then IO.pure((priority(candidates, catalog), Vector.empty))
    else
      val byId = candidates.map(c => c.id -> c).toMap
      val sourceIds = sources.map(_.id).toSet
      for
        decision <- CoachProviders.generate[MapDecision](config, report.analysisId, "歌曲难点图", CoachPrompts.map,
          Json.obj("song" -> song.asJson, "plan" -> plan.asJson, "sources" -> sources.asJson, "candidates" -> candidates.asJson,
            "availableTools" -> catalog.asJson))
        _ <- check(decision.choices.size <= 6 && decision.choices.map(_.segmentId).distinct.size == decision.choices.size &&
          decision.limitations.size <= 8 && decision.limitations.forall(text(_, 500)) && decision.choices.forall(c =>
            byId.contains(c.segmentId) && text(c.title, 100) && text(c.explanation, 800) &&
              c.sourceIds.size <= 8 && c.sourceIds.forall(sourceIds) && validTools(c.analysisTools, toolIds(catalog), 2)),
          "AI 难点图包含无效的候选片段、工具或来源引用。", modelOutput = true)
        items = decision.choices.map { choice =>
          val candidate = byId(choice.segmentId)
          Difficulty(candidate.id, candidate.tool, candidate.start, candidate.end, choice.title,
            choice.explanation, choice.sourceIds, choice.analysisTools, false)
        }.sortBy(_.start)
      yield (items, decision.limitations)

  private def synthesize(config: AppConfig, report: AnalysisReport, session: CoachSession): IO[Option[CoachReport]] =
    if session.difficulties.isEmpty then IO.pure(None)
    else
      val ids = session.difficulties.map(_.id).toSet
      val facts = evidence(session.observations)
      for
        feedback <- CoachProviders.generate[CoachReport](config, report.analysisId, "声乐分析报告", CoachPrompts.report,
          Json.obj("song" -> session.song.asJson, "plan" -> session.plan.asJson, "sources" -> session.sources.asJson,
            "difficultyMap" -> session.difficulties.asJson, "evidence" -> evidenceJson(session.observations),
            "dataQuality" -> session.observations.map(item =>
              Json.obj("id" -> item.id.asJson, "status" -> item.status.asJson, "userRange" -> item.userRange.asJson,
                "warnings" -> (item.reference.warnings ++ item.user.toVector.flatMap(_.warnings)).distinct.asJson)).asJson,
            "audioOverview" -> context(report)))
        _ <- check(text(feedback.summary, 2000) && feedback.strengths.size <= 3 && feedback.priorities.size <= 3 &&
          feedback.limitations.size <= 8 && feedback.limitations.forall(text(_, 500)) &&
          (feedback.strengths ++ feedback.priorities).forall(validFeedback(_, ids, facts)),
          "AI 报告包含无法验证的证据引用。", modelOutput = true)
      yield Some(feedback)

  def analyze(config: AppConfig, report: AnalysisReport, input: AnalyzeCoachRequest): IO[CoachView] =
    val song = SongInfo(input.song.title.trim, input.song.artist.trim, input.song.version.trim, input.song.notes.trim)
    for
      catalog <- CoachStore.catalog(config)
      search <- CoachProviders.searchIdentity(config)
      textProvider <- CoachProviders.identity(config)
      provider = Option.when(input.deep)(textProvider + "|" + search)
      _ <- check(song.title.length <= 160 && song.artist.length <= 120 && song.version.length <= 120 &&
        song.notes.length <= 600 && (!input.deep || song.title.nonEmpty), "请填写有效的歌曲名称及版本信息。")
      _ <- check(validTools(input.extraTools, toolIds(catalog), 2) &&
        input.highThreshold.forall(p => p.isFinite && p >= 36 && p <= 84), "专项选择或高音阈值超出允许范围。")
      old <- CoachStore.load(config, report)
      cached = old.filter(s => !input.refresh && s.revision == CoachStore.revision(report) &&
        s.song == song && s.provider == provider && s.requestedTools == input.extraTools &&
        s.highThreshold == input.highThreshold && s.researchStatus != "unavailable")
      state <- if input.recheck.contains(true) then
        for
          previous <- required(config, report)
          measured <- measurements(config, report, previous.difficulties, previous.highThreshold)
          saved <- CoachStore.save(config, report, previous.copy(revision = CoachStore.revision(report),
            observations = measured.observations, runs = previous.runs.take(previous.plan.tools.size) ++ measured.runs,
            report = None, history = Vector.empty, warnings = (previous.warnings :+ "已按当前偏移更新声学证据。").distinct))
        yield saved
      else cached match
        case Some(s) if input.deep && s.report.isEmpty && s.difficulties.nonEmpty =>
          finishReport(config, report, s)
        case Some(s) => IO.println("[Coach] session cache hit").as(s)
        case None => analysis(config, report, input, song, provider, old, catalog)
      result <- view(config, Some(state), report, catalog)
    yield result

  private def analysis(config: AppConfig, report: AnalysisReport, input: AnalyzeCoachRequest, song: SongInfo,
      provider: Option[String], old: Option[CoachSession], catalog: Vector[ToolDefinition]): IO[CoachSession] =
    val deep = input.deep
    val localTools = (input.extraTools ++ defaults).distinct.take(algorithmLimit)
    val sameSong = old.filter(_.song == song)
    val manual = sameSong.toVector.flatMap(_.difficulties.filter(_.manual)).take(8)
    for
      ai <- CoachProviders.aiAvailable(config)
      model <- CoachProviders.model(config)
      _ <- IO.raiseWhen(deep && !ai)(ApiError(Status.ServiceUnavailable, "请先配置 AI 文本服务。"))
      researched <- if deep then CoachStore.research(config, report, song) else IO.pure(ResearchResult(Vector.empty, "local"))
      plan <- drafts(config, report, song, researched.sources, localTools, catalog, deep)
      tools = (plan.tools.map(_.tool) ++ input.extraTools).distinct.take(algorithmLimit)
      completePlan = plan.copy(tools = plan.tools ++ tools.filterNot(plan.tools.map(_.tool).contains)
        .map(ToolChoice(_, "用户补充选择")))
      detected <- CoachStore.acoustic(config, report,
        Json.obj("tools" -> tools.asJson, "highThreshold" -> input.highThreshold.asJson))
      decision <- choose(config, report, song, detected.candidates, completePlan, researched.sources, catalog, deep)
      // Keep edited marks first, with a bounded number of tool calls for the resulting map.
      marked = (manual.map(_.copy(sourceIds = Vector.empty, analysisTools = Vector.empty)) ++
        decision._1.filterNot(c => manual.exists(_.id == c.id))).take(8).sortBy(_.start)
      measured <- measurements(config, report, marked, input.highThreshold)
      initial = CoachSession(CoachStore.revision(report), if deep then "ai" else "local", song, researched.sources,
        researched.status, completePlan, detected.candidates, marked, measured.observations,
        detected.runs ++ measured.runs, None, Vector.empty, model.filter(_ => deep),
        (sourceStatus(researched.status) ++ decision._2 ++ Option.when(marked.isEmpty)("没有达到测量条件的难点候选。"))
          .distinct, input.extraTools, input.highThreshold, provider)
      // Preserve usable DSP results if the external synthesis fails.
      _ <- CoachStore.save(config, report, initial)
      saved <- if deep then finishReport(config, report, initial) else IO.pure(initial)
    yield saved

  private def finishReport(config: AppConfig, report: AnalysisReport, session: CoachSession): IO[CoachSession] =
    val refreshed = session.copy(warnings = session.warnings.filterNot(_.startsWith("AI ")))
    synthesize(config, report, session).attempt.flatMap {
      case Right(result) => CoachStore.save(config, report, refreshed.copy(report = result))
      case Left(error: ApiError) =>
        CoachStore.save(config, report, refreshed.copy(warnings = refreshed.warnings :+ error.getMessage))
      case Left(_) =>
        CoachStore.save(config, report, refreshed.copy(warnings = refreshed.warnings :+ "AI 报告暂不可用，可重新生成。"))
    }

  def edit(config: AppConfig, report: AnalysisReport, input: EditDifficultyRequest): IO[CoachView] =
    for
      catalog <- CoachStore.catalog(config)
      loaded <- required(config, report)
      current = input.id.flatMap(id => loaded.difficulties.find(_.id == id))
      _ <- check(input.id.isEmpty || current.nonEmpty, "该难点已不存在，请刷新报告。")
      updated <- if input.remove then
        check(current.nonEmpty, "请选择要删除的难点。").as(loaded.difficulties.filterNot(d => input.id.contains(d.id)))
      else
        (input.title.map(_.trim), input.tool, input.start, input.end) match
          case (Some(title), Some(tool), Some(start), Some(end)) =>
            for
              _ <- check(text(title, 100) && toolIds(catalog)(tool) && interval(report, start, end) &&
                (current.nonEmpty || loaded.difficulties.size < 8), "标题、时间范围或难点数量无效。")
              id <- current.fold(IO.delay(s"manual-${UUID.randomUUID()}"))(d => IO.pure(d.id))
              mark = Difficulty(id, tool, start, end, title, "用户在当前录音中标记的难点。",
                Vector.empty, Vector.empty, true)
            yield (loaded.difficulties.filterNot(_.id == id) :+ mark).sortBy(_.start)
          case _ => IO.raiseError(ApiError(Status.BadRequest, "请填写难点标题、工具和起止时间。"))
      measured <- measurements(config, report, updated, loaded.highThreshold)
      retainedRuns = loaded.runs.take(loaded.plan.tools.size)
      saved <- CoachStore.save(config, report, loaded.copy(revision = CoachStore.revision(report),
        difficulties = updated, observations = measured.observations, runs = retainedRuns ++ measured.runs,
        report = None, history = Vector.empty, warnings = loaded.warnings.filterNot(_.startsWith("没有达到")) :+
          "难点已编辑，相关 AI 结论需要重新生成。"))
      result <- view(config, Some(saved), report, catalog)
    yield result

  private def required(config: AppConfig, report: AnalysisReport): IO[CoachSession] =
    CoachStore.load(config, report).flatMap(value => IO.fromOption(value)(
      ApiError(Status.Conflict, "请先执行本地专项分析或生成 AI 分析。")))

  private def requestedRange(report: AnalysisReport, input: AskCoachRequest, selected: Option[Difficulty]): IO[Option[(Double, Double)]] =
    (input.start, input.end) match
      case (None, None) => IO.pure(selected.map(d => (d.start, d.end)))
      case (Some(a), Some(b)) if selected.isEmpty && interval(report, a, b) => IO.pure(Some((a, b)))
      case _ => IO.raiseError(ApiError(Status.BadRequest, "请选择有效的原唱时间范围。"))

  def ask(config: AppConfig, report: AnalysisReport, input: AskCoachRequest): IO[CoachView] =
    val question = input.question.trim
    for
      _ <- check(text(question, 1200), "请输入有效的问题。")
      catalog <- CoachStore.catalog(config)
      session <- required(config, report)
      _ <- IO.raiseUnless(session.revision == CoachStore.revision(report))(
        ApiError(Status.Conflict, "时间偏移已变化，请先更新专项分析。"))
      selected = input.segmentId.flatMap(id => session.difficulties.find(_.id == id))
      _ <- check(input.segmentId.isEmpty || selected.nonEmpty, "该难点已不存在，请刷新报告。")
      range <- requestedRange(report, input, selected)
      existing = session.observations.filter(item => selected.forall(_.id == item.segmentId) &&
        (selected.nonEmpty || range.isEmpty))
      payload = Json.obj("question" -> question.asJson, "song" -> session.song.asJson,
        "selectedSegment" -> selected.map(_.id).asJson, "requestedRange" -> range.asJson,
        "availableSegments" -> session.difficulties.asJson, "research" -> session.plan.summary.asJson,
        "sources" -> session.sources.asJson,
        "history" -> session.history.takeRight(3).map(t => Json.obj("question" -> t.question.asJson,
          "answer" -> t.answer.answer.asJson)).asJson, "currentSummary" -> session.report.map(_.summary).asJson,
        "evidence" -> evidenceJson(existing))
      followup <- CoachProviders.generate[CoachFollowup](config, report.analysisId, "问答测量计划", CoachPrompts.followup,
        payload.deepMerge(Json.obj("availableTools" -> catalog.asJson)))
      _ <- check(validTools(followup.tools, toolIds(catalog), 2) &&
        followup.segmentId.forall(id => session.difficulties.exists(_.id == id) && selected.forall(_.id == id) &&
          (selected.nonEmpty || range.isEmpty)), "AI 选取了无效的补充工具或片段。", modelOutput = true)
      focus = selected.orElse(followup.segmentId.flatMap(id => session.difficulties.find(_.id == id)))
      measuredRange = range.orElse(focus.map(d => (d.start, d.end)))
      _ <- check(followup.tools.isEmpty || measuredRange.nonEmpty, "补充测量需要具体的原唱片段。", modelOutput = true)
      customId = measuredRange.map((a, b) => "range-" + CoachStore.digest(s"$a/$b").take(16)).getOrElse("report")
      extra = measuredRange.toVector.flatMap((a, b) => followup.tools.map(target(focus.map(_.id).getOrElse(customId), _, a, b)))
      batch <- if extra.isEmpty then IO.pure(AcousticBatch(1, Vector.empty, Vector.empty, Vector.empty))
        else CoachStore.acoustic(config, report, Json.obj("targets" -> extra.asJson, "highThreshold" -> session.highThreshold.asJson))
      available = (batch.observations ++ existing.filter(item => focus.forall(_.id == item.segmentId))).distinctBy(_.id)
      facts = evidence(available)
      answer <- CoachProviders.generate[CoachAnswer](config, report.analysisId, "教练回复", CoachPrompts.answer,
        payload.deepMerge(Json.obj("evidence" -> evidenceJson(available), "measurementStatus" -> available.map(item =>
          Json.obj("id" -> item.id.asJson, "status" -> item.status.asJson,
            "warnings" -> (item.reference.warnings ++ item.user.toVector.flatMap(_.warnings)).distinct.asJson)).asJson,
          "audioOverview" -> context(report))))
      _ <- check(text(answer.answer, 3500) && answer.evidenceIds.size <= 16 && answer.evidenceIds.forall(facts.contains),
        "AI 回复包含无法验证的证据引用。", modelOutput = true)
      turn = CoachTurn(question, focus.map(_.id), measuredRange, answer, available, batch.runs)
      saved <- CoachStore.save(config, report, session.copy(history = (session.history :+ turn).takeRight(10)))
      result <- view(config, Some(saved), report, catalog)
    yield result

package services.analysis.utils

import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import org.http4s.Status
import services.analysis.objects.*
import services.analysis.tables.AnalysisTable.AnalysisTable
import services.analysis.tables.MediaTable.MediaTable
import services.system.objects.{ApiError, AppConfig}

private[analysis] object AnalysisValidation:
  def media(connection: Connection, id: UUID): IO[StoredMedia] =
    MediaTable.find(connection, id).flatMap(IO.fromOption(_)(ApiError(Status.NotFound, "媒体不存在或已过期。")))

  def job(connection: Connection, id: UUID): IO[AnalysisJob] =
    AnalysisTable.find(connection, id).flatMap(IO.fromOption(_)(ApiError(Status.NotFound, "分析不存在或已过期。")))

  def selection(connection: Connection, input: AnalysisSelection, config: AppConfig): IO[Unit] =
    def validate(clip: ClipSelection): IO[Unit] =
      media(connection, clip.mediaId).flatMap { source =>
        IO.raiseUnless(clip.start.isFinite && clip.end.isFinite && clip.start >= 0 &&
          clip.end <= source.metadata.duration + 0.0001 && clip.end - clip.start >= 1.0 &&
          clip.end - clip.start <= config.maxClip)(ApiError(Status.BadRequest,
            s"片段须在媒体范围内，且长度为 1 到 ${config.maxClip} 秒。"))
      }
    alignmentAdjustment(input, input.manualOffset, None) *> validate(input.reference) *> validate(input.user)

  def alignmentAdjustment(selection: AnalysisSelection, manual: Option[Double],
                          referenceRange: Option[(Double, Double)]): IO[Unit] =
    val referenceDuration = selection.reference.end - selection.reference.start
    val userDuration = selection.user.end - selection.user.start
    val offsetFits = manual.forall(value => value.isFinite &&
      math.min(referenceDuration, userDuration - value) - math.max(0.0, -value) >= 0.1 - 1e-9)
    val rangeFits = referenceRange.forall(range => manual.isEmpty && referenceRangeFits(selection, range))
    IO.raiseUnless(offsetFits)(ApiError(Status.BadRequest, "该偏移会让两条音轨失去重叠，请选择各轨内的对应位置。")) *>
      IO.raiseUnless(rangeFits)(ApiError(Status.BadRequest, "对齐选区须在两轨片段范围内，且至少 1 秒。"))

  def referenceRangeFits(selection: AnalysisSelection, range: (Double, Double)): Boolean =
    val (start, stop) = range
    val limit = math.min(selection.reference.end - selection.reference.start, selection.user.end - selection.user.start)
    start.isFinite && stop.isFinite && start >= 0 && stop - start >= 1.0 && stop <= limit + 1e-9

  def report(report: AnalysisReport, job: AnalysisJob): IO[AnalysisReport] =
    def ratio(value: Double): Boolean = value.isFinite && value >= 0 && value <= 1
    def track(t: PitchTrack, clip: ClipSelection): Boolean =
      val frames = t.timestamps.size
      frames > 1 && frames <= 15100 && math.abs(t.originalStart - clip.start) < 0.001 &&
        t.timestamps.head == 0 && t.timestamps.last <= clip.end - clip.start + 0.021 &&
        t.timestamps.zip(t.timestamps.drop(1)).forall((a, b) => b > a) &&
        Vector(t.f0Hz.size, t.midiPitch.size, t.voicedFlags.size, t.voicedProbabilities.size, t.rms.size).forall(_ == frames) &&
        t.f0Hz.forall(_.forall(hz => hz.isFinite && hz > 0)) && t.midiPitch.forall(_.forall(_.isFinite)) &&
        t.f0Hz.zip(t.midiPitch).forall((f0, midi) => f0.isDefined == midi.isDefined) &&
        t.guideMidiPitch.forall(guide => guide.size == frames && guide.forall(_.forall(_.isFinite))) &&
        t.voicedProbabilities.forall(ratio) && t.rms.forall(rms => rms.isFinite && rms >= 0)
    val map = report.alignment.timeMapping
    val mapping = map.forall((r, u) => r.isFinite && u.isFinite && r >= 0 && u >= 0 &&
      r <= report.preprocessing.referenceDuration + 0.001 && u <= report.preprocessing.userDuration + 0.001) &&
      map.zip(map.drop(1)).forall((a, b) => a._1 < b._1 && a._2 < b._2)
    val alignment = report.alignment
    val fixed = alignment.offsetSeconds.forall { offset =>
      offset.isFinite && offset == alignment.offset && alignment.tempoRatio == 1 &&
        alignment.originalOffsetSeconds.exists(original => math.abs(original -
          (offset + report.preprocessing.userStart - report.preprocessing.referenceStart)) <= 1e-6) &&
        (map.isEmpty || map.size == 2 && map.forall((r, u) => math.abs(u - r - offset) <= 1.1e-6))
    }
    val detection = alignment.automatic.forall { auto =>
      ratio(auto.confidence) && auto.method == AlignmentMethod.envelope &&
        auto.referenceRange.forall(referenceRangeFits(job.selection, _)) &&
        (!auto.openingWindow.contains(true) || auto.referenceRange.exists(_._1 == 0)) &&
        auto.offsetSeconds.forall(_.isFinite) &&
        auto.originalOffsetSeconds.forall(_.isFinite) &&
        Vector(auto.featureMilliseconds, auto.correlationMilliseconds, auto.elapsedMilliseconds).forall(t => t.isFinite && t >= 0) &&
        auto.featureScores.values.forall(s => s.offsetSeconds.isFinite && ratio(math.abs(s.score)) && ratio(math.abs(s.peakScore)))
    }
    val metrics = report.metrics.map(_.name).toSet == MetricName.values.toSet &&
      report.metrics.size == MetricName.values.length && report.metrics.forall(m =>
        m.validFrames >= 0 && ratio(m.coverage) && m.value.forall(value =>
          value.isFinite && value >= 0 && (m.unit != MetricUnit.ratio || ratio(value))))
    def scoreNumber(value: Double): Boolean = value.isFinite && value >= 0 && value <= 100
    def counts(total: Int, scored: Int, missed: Int): Boolean =
      total >= 0 && scored >= 0 && missed >= 0 && scored.toLong + missed <= total
    def hasScore(status: PitchScoreStatus): Boolean = status == PitchScoreStatus.scored || status == PitchScoreStatus.missed
    val scoring = report.pitchScore.forall { score =>
      score.version == 1 && ratio(score.coverage) && score.start >= job.selection.reference.start - 0.001 &&
        score.end <= job.selection.reference.end + 0.001 && score.end > score.start &&
        score.score.forall(scoreNumber) && (score.score.nonEmpty == (score.status == PitchScoreStatus.scored)) &&
        score.status != PitchScoreStatus.missed && score.pairedFrames >= 0 &&
        counts(score.totalNotes, score.scoredNotes, score.missedNotes) &&
        score.scoredPhrases >= 0 && score.pendingPhrases >= 0 &&
        score.scoredPhrases + score.pendingPhrases == score.phrases.size &&
        Vector(score.elapsedMilliseconds, score.evidenceMilliseconds).forall(t => t.isFinite && t >= 0) &&
        score.phrases.forall { phrase =>
          phrase.start >= score.start && phrase.end <= score.end && phrase.start < phrase.end &&
            counts(phrase.totalNotes, phrase.scoredNotes, phrase.missedNotes) &&
            phrase.pairedFrames >= 0 && phrase.octaveUncertainFrames >= 0 && phrase.score.forall(scoreNumber) &&
            phrase.deviationCents.forall(_.isFinite) && phrase.driftCents.forall(_.isFinite) &&
            (phrase.score.nonEmpty == hasScore(phrase.status)) && phrase.notes.size == phrase.totalNotes &&
            phrase.notes.forall(note => note.start >= phrase.start && note.end <= phrase.end && note.start < note.end &&
              note.referenceMidi.isFinite && note.referenceMidi >= 36 && note.referenceMidi <= 84 &&
              note.score.forall(scoreNumber) && (note.score.nonEmpty == hasScore(note.status)) &&
              note.deviationCents.forall(_.isFinite))
        }
    }
    val valid = report.analysisId == job.analysisId && report.status == JobStatus.completed &&
      report.referenceMetadata.id == job.selection.reference.mediaId &&
      report.userMetadata.id == job.selection.user.mediaId &&
      ratio(report.confidence) && ratio(report.alignment.confidence) &&
      track(report.pitchTracks.reference, job.selection.reference) && track(report.pitchTracks.user, job.selection.user) &&
      mapping && fixed && detection && metrics && scoring && (!(report.alignment.reliable ||
        report.alignment.method.exists(method => method == AlignmentMethod.manual || method == AlignmentMethod.guide)) ||
        map.size >= 2)
    IO.raiseUnless(valid)(new IllegalStateException("Python report failed result validation.")).as(report)

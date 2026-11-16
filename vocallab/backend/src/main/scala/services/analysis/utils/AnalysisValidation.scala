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
    val referenceDuration = input.reference.end - input.reference.start
    val userDuration = input.user.end - input.user.start
    val offset = input.manualOffset.forall(value => value.isFinite &&
      math.min(referenceDuration, userDuration - value) - math.max(0.0, -value) >= 0.1)
    IO.raiseUnless(offset)(ApiError(Status.BadRequest, "该偏移会让两条音轨失去重叠，请选择各轨内的对应位置。")) *>
      validate(input.reference) *> validate(input.user)

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
    val metrics = report.metrics.map(_.name).toSet == MetricName.values.toSet &&
      report.metrics.size == MetricName.values.length && report.metrics.forall(m =>
        m.validFrames >= 0 && ratio(m.coverage) && m.value.forall(value =>
          value.isFinite && value >= 0 && (m.unit != MetricUnit.ratio || ratio(value))))
    val valid = report.analysisId == job.analysisId && report.status == JobStatus.completed &&
      report.referenceMetadata.id == job.selection.reference.mediaId &&
      report.userMetadata.id == job.selection.user.mediaId &&
      ratio(report.confidence) && ratio(report.alignment.confidence) &&
      track(report.pitchTracks.reference, job.selection.reference) && track(report.pitchTracks.user, job.selection.user) &&
      mapping && metrics && (!(report.alignment.reliable ||
        report.alignment.method.exists(method => method == AlignmentMethod.manual || method == AlignmentMethod.guide)) ||
        map.size >= 2)
    IO.raiseUnless(valid)(new IllegalStateException("Python report failed result validation.")).as(report)

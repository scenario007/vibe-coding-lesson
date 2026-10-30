package services.game.tables.StoryProgressTable
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object StoryProgressTable:
  private val listSql="SELECT truth,experienced,cleared,viewed FROM mist_story_progress"
  def list(c: Connection): IO[List[(String,Boolean,Boolean,Boolean)]] = Jdbc.query(c,listSql)(r => (r.getString("truth"),r.getBoolean("experienced"),r.getBoolean("cleared"),r.getBoolean("viewed")))
  private val recordSql="INSERT INTO mist_story_progress(truth,experienced,cleared) VALUES(?,true,?) ON CONFLICT(truth) DO UPDATE SET experienced=true,cleared=mist_story_progress.cleared OR excluded.cleared"
  def record(c: Connection, truth: String, cleared: Boolean): IO[Int] = Jdbc.update(c,recordSql,List(truth,Boolean.box(cleared)))

  private val markViewedSql="UPDATE mist_story_progress SET viewed=true WHERE truth=?"
  def markViewed(c: Connection, truth: String): IO[Int] = Jdbc.update(c,markViewedSql,List(truth))

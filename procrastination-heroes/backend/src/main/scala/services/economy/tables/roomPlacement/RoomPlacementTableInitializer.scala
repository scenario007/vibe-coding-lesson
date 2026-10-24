package services.economy.tables.roomPlacement
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object RoomPlacementTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS room_placements(user_id text NOT NULL REFERENCES users(id),slot text NOT NULL,item_id text REFERENCES player_items(id),reward_id text REFERENCES task_rewards(id),PRIMARY KEY(user_id,slot),CHECK((item_id IS NULL)<>(reward_id IS NULL))); CREATE UNIQUE INDEX IF NOT EXISTS placed_item_unique ON room_placements(item_id) WHERE item_id IS NOT NULL; CREATE UNIQUE INDEX IF NOT EXISTS placed_reward_unique ON room_placements(reward_id) WHERE reward_id IS NOT NULL;"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

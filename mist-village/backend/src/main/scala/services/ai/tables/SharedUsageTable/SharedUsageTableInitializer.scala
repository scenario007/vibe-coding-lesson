package services.ai.tables.SharedUsageTable
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
// This table belongs to the existing course application; verify it, never create or alter it here.
object SharedUsageTableInitializer:
  private val verifySql="SELECT id,user_id,model,status,reserved_cny,estimated_cny,input_tokens,output_tokens,cached_tokens,request_id,created_at FROM ai_usage_events WHERE false"
  def verify(c: Connection): IO[Unit] = Jdbc.query(c,verifySql)(_=>()).map(_=>())

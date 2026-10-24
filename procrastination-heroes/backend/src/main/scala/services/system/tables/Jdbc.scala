package services.system.tables
import cats.effect.{IO, Resource}
import java.sql.{Connection, PreparedStatement, ResultSet}
object Jdbc:
  private def statement(c: Connection, sql: String, params: List[Any]): Resource[IO,PreparedStatement] =
    Resource.fromAutoCloseable(IO.blocking(c.prepareStatement(sql))).evalTap(s => IO.blocking {
      params.zipWithIndex.foreach { case (value,index) => s.setObject(index+1,value.asInstanceOf[Object]) }
    })
  def query[A](c: Connection,sql: String,params: List[Any] = Nil)(read: ResultSet => A): IO[List[A]] =
    statement(c,sql,params).use(s => Resource.fromAutoCloseable(IO.blocking(s.executeQuery())).use(r => IO.blocking(Iterator.continually(r.next()).takeWhile(identity).map(_ => read(r)).toList)))
  def update(c: Connection,sql: String,params: List[Any] = Nil): IO[Int] = statement(c,sql,params).use(s => IO.blocking(s.executeUpdate()))
  def initialize(c: Connection,sql: String): IO[Unit] = statement(c,sql,Nil).use(s => IO.blocking(s.execute()).void)

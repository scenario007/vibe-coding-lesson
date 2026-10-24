package services.users.utils
import java.security.{MessageDigest, SecureRandom}
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
private[users] object Passwords:
  private[users] def salt(): String = java.util.HexFormat.of().formatHex(SecureRandom().generateSeed(16))
  private[users] def token(): String = java.util.HexFormat.of().formatHex(SecureRandom().generateSeed(32))
  private[users] def hash(password: String,salt: String): String = java.util.HexFormat.of().formatHex(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(password.toCharArray,java.util.HexFormat.of().parseHex(salt),120000,256)).getEncoded)
  private[users] def matches(password: String,salt: String,expected: String): Boolean = MessageDigest.isEqual(hash(password,salt).getBytes(java.nio.charset.StandardCharsets.UTF_8),expected.getBytes(java.nio.charset.StandardCharsets.UTF_8))
  private[users] def tokenHash(token: String): String = java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)))

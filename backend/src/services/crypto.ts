// 令牌加密存储：AES-256-GCM。密钥从环境变量 TOKEN_ENCRYPTION_KEY 派生（SHA-256）。
// 安全要求：access/refresh token 绝不明文落库；日志与审计不得出现明文 token。
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc1';

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  if (!raw && process.env.NODE_ENV === 'production') {
    throw new Error('TOKEN_ENCRYPTION_KEY 未配置：生产环境拒绝明文密钥回退');
  }
  return createHash('sha256').update(raw || 'e23-dev-only-token-key').digest();
}

/** 加密；输入 null 返回 null（可选字段保持可空） */
export function encryptSecret(plain: string | null): string | null {
  if (plain == null) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/** 解密；非密文格式（历史明文）原样返回，便于平滑迁移 */
export function decryptSecret(stored: string | null): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  const [, ivB, tagB, dataB] = stored.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
}

/** 对外展示用脱敏（审计日志只允许出现脱敏形态） */
export function maskId(id: string): string {
  return id.length <= 3 ? '***' : `${id.slice(0, 3)}***`;
}

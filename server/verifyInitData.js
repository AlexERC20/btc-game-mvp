import crypto from 'crypto';

export function verifyInitData(initData, botToken = process.env.BOT_TOKEN) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash || hash.length !== 64) {
      return { ok: false, error: 'BAD_HASH' };
    }
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHash('sha256')
      .update(botToken || '')
      .digest();
    const computed = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const hashBuf = Buffer.from(hash, 'hex');
    const computedBuf = Buffer.from(computed, 'hex');
    if (hashBuf.length !== computedBuf.length) {
      return { ok: false, error: 'BAD_HASH' };
    }
    const valid = crypto.timingSafeEqual(hashBuf, computedBuf);
    return valid ? { ok: true, data: Object.fromEntries(params.entries()) } : { ok: false, error: 'BAD_HASH' };
  } catch {
    return { ok: false, error: 'BAD_HASH' };
  }
}

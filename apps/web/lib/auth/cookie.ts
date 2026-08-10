export const SESSION_COOKIE = 'mm_session';

/** 30 gün, saniye cinsinden. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

/**
 * `Secure` yalnız üretimde. Geliştirmede açık bırakılırsa tarayıcı çerezi
 * `http://localhost`'a hiç yazmaz; giriş sessizce çalışmaz ve ortada hata
 * mesajı da olmaz.
 *
 * `SameSite=Lax`, `Strict` değil: doğrulama e-postasındaki linke tıklayan
 * kullanıcı `Strict` altında çıkış yapmış görünürdü. Lax, GET olmayan
 * çapraz-site isteklerini yine de keser.
 */
export function sessionCookieOptions(
  // Okunan tek alan bu. `NodeJS.ProcessEnv` istemek, her çağrıyı cast'lemeye
  // zorluyor (bkz. `export-gate.ts`'in testi).
  env: { NODE_ENV?: string } = process.env,
): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

function serialize(value: string, maxAge: number, env: { NODE_ENV?: string }): string {
  const options = sessionCookieOptions(env);
  const parts = [`${SESSION_COOKIE}=${value}`, `Max-Age=${maxAge}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

/** Route handler'ların `Set-Cookie` başlığına yazdığı değer. */
export function sessionCookieHeader(
  token: string,
  env: { NODE_ENV?: string } = process.env,
): string {
  return serialize(token, SESSION_TTL_SECONDS, env);
}

/**
 * Çıkışta çerezi düşürür. Aynı `Path` şart: taşımazsa tarayıcı ikisini ayrı
 * çerez sayar ve çıkış yapılamaz.
 */
export function clearSessionCookieHeader(env: { NODE_ENV?: string } = process.env): string {
  return serialize('', 0, env);
}

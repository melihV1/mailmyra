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

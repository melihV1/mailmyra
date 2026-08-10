import { cookies } from 'next/headers';

import { SESSION_COOKIE } from './cookie';
import { readSession, type ActiveSession } from './session';

/**
 * Sunucu bileşenlerinin "kim bu?" sorusu. Çerezi okur, oturumu veritabanından
 * doğrular. Davranışın tamamı `readSession`da ve orada test ediliyor — burası
 * yalnız Next'in çerez API'sine köprü.
 */
export async function currentSession(): Promise<ActiveSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

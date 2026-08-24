import { cookies, headers } from 'next/headers';

import { preferredLang } from './detect';
import { LANG_COOKIE, isLang, type Lang } from './types';

/** Panel dili: çerez > Accept-Language > en. Yalnız sunucu tarafı. */
export async function getLang(): Promise<Lang> {
  const cookie = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(cookie)) return cookie;
  return preferredLang((await headers()).get('accept-language') ?? '');
}

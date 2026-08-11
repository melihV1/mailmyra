export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  /** Kimlik doğrulaması istemeyen röleler için isteğe bağlı. */
  auth: { user: string; pass: string } | undefined;
  from: string;
  /**
   * Kendinden imzalı sertifikayı kabul et — YALNIZ localhost rölesi için.
   * Yaşandı (2026-08-11, canlı): Plesk'in posta sunucusu localhost'ta
   * STARTTLS'e kendinden imzalı sertifikayla çıkıyor, gönderim ESOCKET ile
   * ölüyordu. Trafik makineden çıkmıyor; doğrulamayı kapatmak burada güvenli.
   */
  allowSelfSigned: boolean;
}

export type SmtpConfigResult =
  | { ok: true; config: SmtpConfig }
  | { ok: false; missing: string[] };

const DEFAULT_PORT = 587;

/** `465` örtük TLS; `587` ve `25` STARTTLS. */
function isImplicitTlsPort(port: number): boolean {
  return port === 465;
}

/**
 * Sağlayıcıyı ortamdan okur.
 *
 * Hiçbir şey koda gömülmüyor: Plesk'in yerel SMTP'sinden Google Workspace'e
 * geçmek `.env` düzenlemekten ibaret olmalı.
 */
export function readSmtpConfig(env: Record<string, string | undefined>): SmtpConfigResult {
  const missing: string[] = [];

  const host = env.MAIL_HOST?.trim();
  if (!host) missing.push('MAIL_HOST');

  let port = DEFAULT_PORT;
  if (env.MAIL_PORT !== undefined && env.MAIL_PORT.trim() !== '') {
    const parsed = Number(env.MAIL_PORT);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) missing.push('MAIL_PORT');
    else port = parsed;
  }

  const from = env.MAIL_FROM?.trim();
  if (!from) missing.push('MAIL_FROM');

  // Kullanıcı ve parola ya birlikte var ya da birlikte yok. Yarısı düşmüş bir
  // yapılandırmada sessizce kimliksiz bağlanmak, teşhisi zor bir "neden
  // gitmiyor" hatası üretirdi.
  const user = env.MAIL_USER?.trim();
  const pass = env.MAIL_PASS;
  let auth: SmtpConfig['auth'];
  if (user && pass) auth = { user, pass };
  else if (user && !pass) missing.push('MAIL_PASS');
  else if (!user && pass) missing.push('MAIL_USER');

  if (missing.length > 0) return { ok: false, missing };

  const secure =
    env.MAIL_SECURE === undefined || env.MAIL_SECURE.trim() === ''
      ? isImplicitTlsPort(port)
      : env.MAIL_SECURE.toLowerCase() === 'true';

  const allowSelfSigned = env.MAIL_TLS_SELF_SIGNED?.toLowerCase() === 'true';

  return {
    ok: true,
    config: { host: host as string, port, secure, auth, from: from as string, allowSelfSigned },
  };
}

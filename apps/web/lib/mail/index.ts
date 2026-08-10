import { readSmtpConfig } from './config';
import { createSmtpMailer } from './smtp';
import type { Mailer, OutgoingMail } from './types';

export type { MailBody, Mailer, OutgoingMail } from './types';
export type { SmtpConfig } from './config';
export { readSmtpConfig } from './config';
export { MemoryMailer } from './memory';
export { inviteEmail, resetEmail, verifyEmail } from './templates';

/**
 * Röle yokken geliştirmeye devam edebilmek için. Mesajı konsola yazar.
 *
 * Üretimde ASLA seçilmez: sessizce log'a düşmek, hiçbir doğrulama
 * e-postasının gitmediğini kimsenin fark etmemesi demek olurdu.
 */
function createLogMailer(): Mailer {
  return {
    kind: 'log',
    async send(mail: OutgoingMail) {
      console.info(
        `[mail] SMTP yapılandırılmadı, gönderilmedi.\n` +
          `  Kime : ${mail.to}\n` +
          `  Konu : ${mail.subject}\n` +
          `${mail.text.replace(/^/gm, '  | ')}`,
      );
    },
  };
}

/**
 * Ortama bakıp taşıyıcıyı seçer.
 *
 * Sağlayıcı kararı henüz açık (Plesk SMTP / Google Workspace). Uygulamanın
 * hiçbir yeri bunu bilmiyor — hangisi seçilirse `.env` değişiyor, kod değil.
 */
export function getMailer(env: Record<string, string | undefined> = process.env): Mailer {
  const result = readSmtpConfig(env);

  if (result.ok) return createSmtpMailer(result.config);

  if (env.NODE_ENV === 'production') {
    throw new Error(
      `E-posta gönderimi yapılandırılmamış. Eksik: ${result.missing.join(', ')}. ` +
        `Kurulum: docs/email-setup.md`,
    );
  }

  return createLogMailer();
}

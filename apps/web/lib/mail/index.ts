import { readSmtpConfig } from './config';
import { createSmtpMailer } from './smtp';
import type { Mailer, OutgoingMail } from './types';

export type { MailBody, Mailer, OutgoingMail } from './types';
export type { SmtpConfig } from './config';
export { readSmtpConfig } from './config';
export { MemoryMailer } from './memory';
export {
  emailChangeVerifyEmail,
  emailChangedNoticeEmail,
  inviteEmail,
  resetEmail,
  seatWarningEmail,
  verifyEmail,
} from './templates';

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
/**
 * Teslim defteri (MailDelivery) — EN-İYİ-ÇABA: defter yazılamıyorsa posta
 * YİNE GİDER ve hata yutulur; posta işin kendisi, defter gözlemi. Alıcının
 * yalnız ALAN ADI yazılır (privacy by default). `state='delivered'` rölenin
 * kabul ettiği anlamına gelir — uç teslim garantisi değil (DSN takibi yok).
 *
 * `import('../db')` DİNAMİK: bu modül CLI script'lerinde de yükleniyor
 * (send-test-signatures) ve orada DATABASE_URL yok — statik import olsaydı
 * script'ler DB isterdi.
 */
async function recordDelivery(
  mail: OutgoingMail,
  provider: string,
  state: 'delivered' | 'failed',
  error: string | null,
): Promise<void> {
  try {
    const { prisma } = await import('../db');
    await prisma.mailDelivery.create({
      data: {
        kind: mail.kind ?? 'notification',
        provider: provider.slice(0, 64),
        recipientDomain: (mail.to.split('@')[1] ?? 'unknown').toLowerCase().slice(0, 255),
        state,
        error: error?.slice(0, 300) ?? null,
      },
    });
  } catch {
    // defter gözlemdir; yazılamaması gönderimi etkilemez
  }
}

function withDeliveryLedger(mailer: Mailer, provider: string): Mailer {
  return {
    kind: mailer.kind,
    async send(mail: OutgoingMail) {
      try {
        await mailer.send(mail);
        await recordDelivery(mail, provider, 'delivered', null);
      } catch (err) {
        await recordDelivery(
          mail,
          provider,
          'failed',
          err instanceof Error ? err.message : String(err),
        );
        throw err;
      }
    },
  };
}

export function getMailer(env: Record<string, string | undefined> = process.env): Mailer {
  const result = readSmtpConfig(env);

  if (result.ok) return withDeliveryLedger(createSmtpMailer(result.config), result.config.host);

  if (env.NODE_ENV === 'production') {
    throw new Error(
      `E-posta gönderimi yapılandırılmamış. Eksik: ${result.missing.join(', ')}. ` +
        `Kurulum: docs/email-setup.md`,
    );
  }

  return withDeliveryLedger(createLogMailer(), 'log');
}

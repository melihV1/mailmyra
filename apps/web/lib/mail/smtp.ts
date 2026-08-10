import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';

import type { SmtpConfig } from './config';
import type { Mailer, OutgoingMail } from './types';

export interface SmtpMailer extends Mailer {
  readonly kind: 'smtp';
  /**
   * `jsonTransport` altında zarfı geri verir. Yalnız testte anlamlı —
   * gerçek taşıyıcıda `send` kullanılır.
   */
  sendForTest(mail: OutgoingMail): Promise<SentMessageInfo>;
}

/**
 * Standart SMTP. Sağlayıcıya özel hiçbir şey yok — Plesk'in yerel rölesi de,
 * Google Workspace de, başka bir sağlayıcı da aynı koddan geçer.
 */
export function createSmtpMailer(
  config: SmtpConfig,
  options: { jsonTransport?: boolean } = {},
): SmtpMailer {
  const transporter: Transporter = options.jsonTransport
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
      });

  const build = (mail: OutgoingMail) => ({
    from: config.from,
    to: mail.to,
    subject: mail.subject,
    // İkisi birden: düz metin parçası olmayan mesaj spam puanı topluyor ve
    // metin okuyan istemcide boş görünüyor.
    text: mail.text,
    html: mail.html,
  });

  return {
    kind: 'smtp',
    async send(mail) {
      await transporter.sendMail(build(mail));
    },
    sendForTest(mail) {
      return transporter.sendMail(build(mail));
    },
  };
}

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

/** Taşıyıcı seçenekleri TEK kaynaktan — createSmtpMailer ve sağlık probu. */
export function smtpTransportOptions(config: SmtpConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    // Yalnız MAIL_TLS_SELF_SIGNED=true iken: localhost rölesinin
    // kendinden imzalı sertifikası kabul edilir (bkz. config.ts).
    tls: config.allowSelfSigned ? { rejectUnauthorized: false } : undefined,
  };
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
    : nodemailer.createTransport(smtpTransportOptions(config));

  const build = (mail: OutgoingMail) => ({
    from: config.from,
    to: mail.to,
    subject: mail.subject,
    // İkisi birden: düz metin parçası olmayan mesaj spam puanı topluyor ve
    // metin okuyan istemcide boş görünüyor.
    text: mail.text,
    html: mail.html,
    // nodemailer'ın Attachment şekli bizimkiyle birebir — geçirilir.
    attachments: mail.attachments,
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

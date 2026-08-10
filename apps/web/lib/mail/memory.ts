import type { Mailer, OutgoingMail } from './types';

/** Testler için: gönderme, kaydet. */
export class MemoryMailer implements Mailer {
  readonly kind = 'memory' as const;
  readonly sent: OutgoingMail[] = [];

  async send(mail: OutgoingMail): Promise<void> {
    this.sent.push(mail);
  }

  clear(): void {
    this.sent.length = 0;
  }
}

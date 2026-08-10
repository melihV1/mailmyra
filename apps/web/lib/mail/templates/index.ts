import type { MailBody } from '../types';
import { escapeHtml, renderLayout, renderText } from './layout';

/**
 * İşlemsel e-posta şablonları — sağlayıcıdan bağımsız.
 *
 * Her biri yalnız `{ subject, html, text }` üretiyor; gönderimi kimin yaptığını
 * bilmiyorlar. Plesk SMTP'den Google Workspace'e geçmek bu dosyaya dokunmuyor.
 *
 * ⚠️ DİL: metinler İngilizce, sitenin 13 sayfasıyla tutarlı olsun diye. Panel
 * dili henüz kararlı değil; Türkçe'ye dönülecekse değişecek tek yer burası.
 *
 * Süreler spec §6'dan: doğrulama 24 saat · sıfırlama 1 saat · davet 7 gün.
 */

export interface ActionInput {
  actionUrl: string;
}

export function verifyEmail({ actionUrl }: ActionInput): MailBody {
  return {
    subject: 'Confirm your email address',
    html: renderLayout({
      heading: 'Confirm your email address',
      paragraphs: [
        'Welcome to Mailmyra. Confirm this address and your workspace is ready to use.',
      ],
      actionUrl,
      actionLabel: 'Confirm address',
      footnote:
        'This link is good for 24 hours. If you did not create a Mailmyra account, you can ignore this message.',
    }),
    text: renderText(
      [
        'Confirm your email address',
        '',
        'Welcome to Mailmyra. Confirm this address and your workspace is ready to use.',
      ],
      actionUrl,
      'This link is good for 24 hours. If you did not create a Mailmyra account, you can ignore this message.',
    ),
  };
}

export function resetEmail({ actionUrl }: ActionInput): MailBody {
  return {
    subject: 'Reset your Mailmyra password',
    html: renderLayout({
      heading: 'Reset your password',
      paragraphs: ['Choose a new password for your Mailmyra account.'],
      actionUrl,
      actionLabel: 'Choose a new password',
      // Bu e-posta hesabı olmayan birine de gidebilir: sıfırlama ucu "böyle
      // bir hesap var mı" bilgisini sızdırmıyor, her iki durumda aynı yanıtı
      // veriyor. Yanlışlıkla alan kişi ne yapacağını bilmeli.
      footnote:
        'This link is good for 1 hour. If you did not ask for a new password, ignore this message — nothing has changed.',
    }),
    text: renderText(
      ['Reset your password', '', 'Choose a new password for your Mailmyra account.'],
      actionUrl,
      'This link is good for 1 hour. If you did not ask for a new password, ignore this message — nothing has changed.',
    ),
  };
}

export interface InviteInput extends ActionInput {
  /** Kullanıcı yazımı — HTML'e girmeden önce kaçırılır. */
  orgName: string;
}

export function inviteEmail({ actionUrl, orgName }: InviteInput): MailBody {
  return {
    // Konu satırı HTML değil; ham hâliyle gider.
    subject: `You have been invited to ${orgName} on Mailmyra`,
    html: renderLayout({
      heading: 'You have been invited',
      paragraphs: [
        `<strong>${escapeHtml(orgName)}</strong> has invited you to manage email signatures on Mailmyra.`,
      ],
      actionUrl,
      actionLabel: 'Accept the invitation',
      footnote:
        'This link is good for 7 days. If you were not expecting it, you can ignore this message.',
    }),
    text: renderText(
      [
        'You have been invited',
        '',
        `${orgName} has invited you to manage email signatures on Mailmyra.`,
      ],
      actionUrl,
      'This link is good for 7 days. If you were not expecting it, you can ignore this message.',
    ),
  };
}

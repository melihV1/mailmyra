import type { MailBody } from '../types';
import { escapeHtml, renderLayout, renderText } from './layout';

/**
 * İşlemsel e-posta şablonları — sağlayıcıdan bağımsız.
 *
 * Her biri yalnız `{ subject, html, text }` üretiyor; gönderimi kimin yaptığını
 * bilmiyorlar. Plesk SMTP'den Google Workspace'e geçmek bu dosyaya dokunmuyor.
 *
 * DİL: İngilizce (karar: 2026-08-10, Hüseyin). Panel ve işlemsel e-postalar
 * sitenin diliyle aynı — kullanıcı pazarlama sayfasından panele geçerken dil
 * değişmiyor. Çift dil bilinçli olarak kapsam dışı.
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

export interface SeatWarningInput extends ActionInput {
  /** Kullanıcı yazımı — HTML'e girmeden önce kaçırılır. */
  orgName: string;
  /** Az önceki publish sonrası sayım — panel brief'in ilkesi: rakamla söyle. */
  activeSeats: number;
  entitledSeats: number;
}

/**
 * %80 eşiği bilgilendirmesi (spec §6 "tavana yaklaşınca"). Süreli link yok.
 *
 * "Satın al" düğmesi YOK ve vaat edilmez: ilk 10 müşteri elle faturalanıyor
 * (kilitli karar). "Cevapla" da denmez — gönderen no-reply@ kalabilir;
 * panelle aynı dil kullanılır: "contact us".
 */
export function seatWarningEmail({
  actionUrl,
  orgName,
  activeSeats,
  entitledSeats,
}: SeatWarningInput): MailBody {
  const usage = `${activeSeats} of ${entitledSeats}`;
  const contact =
    'To add seats, contact us — billing is handled personally, so it takes one short email.';
  return {
    // Konu satırı HTML değil; ham hâliyle gider.
    subject: `${orgName} is using ${usage} seats on Mailmyra`,
    html: renderLayout({
      heading: 'Your seats are filling up',
      paragraphs: [
        `<strong>${escapeHtml(orgName)}</strong> is now using <strong>${usage}</strong> active sender seats.`,
        'Once every seat is taken, new senders cannot be published until a seat is freed or added.',
      ],
      actionUrl,
      actionLabel: 'Review senders',
      footnote: contact,
    }),
    text: renderText(
      [
        'Your seats are filling up',
        '',
        `${orgName} is now using ${usage} active sender seats.`,
        'Once every seat is taken, new senders cannot be published until a seat is freed or added.',
      ],
      actionUrl,
      contact,
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

export function emailChangeVerifyEmail({ actionUrl }: ActionInput): MailBody {
  return {
    subject: 'Confirm your new e-mail address',
    html: renderLayout({
      heading: 'Confirm your new address',
      paragraphs: [
        'You asked to move your Mailmyra account to this address. Confirm it and the switch is done.',
      ],
      actionUrl,
      actionLabel: 'Confirm new address',
      footnote:
        'This link is good for 24 hours. If you did not ask for this change, ignore this message — nothing changes.',
    }),
    text: renderText(
      [
        'Confirm your new address',
        '',
        'You asked to move your Mailmyra account to this address. Confirm it and the switch is done.',
      ],
      actionUrl,
      'This link is good for 24 hours. If you did not ask for this change, ignore this message — nothing changes.',
    ),
  };
}

export interface SupportReplyInput extends ActionInput {
  /** Vaka numarası (SUP-<yıl>-<sıra>) — sunucu üretir, kullanıcı yazımı değil. */
  reference: string;
}

/**
 * Staff bir destek talebine cevap bıraktığında müşteriye gider (spec §5,
 * Ticket v2). Cevabın İÇERİĞİ e-postada YOK (onaylı seçim) — yalnız haber
 * verir, okuması panelde olur.
 */
export function supportReplyEmail({ actionUrl, reference }: SupportReplyInput): MailBody {
  return {
    // Konu satırı HTML değil; ham hâliyle gider.
    subject: `Your support case ${reference} has a new reply`,
    html: renderLayout({
      heading: 'You have a new reply',
      paragraphs: [
        `There is a new reply on your support case <strong>${escapeHtml(reference)}</strong>.`,
      ],
      actionUrl,
      actionLabel: 'View the reply',
      footnote:
        'For your privacy, the reply is not included in this e-mail — open your case to read it.',
    }),
    text: renderText(
      [
        'You have a new reply',
        '',
        `There is a new reply on your support case ${reference}.`,
      ],
      actionUrl,
      'For your privacy, the reply is not included in this e-mail — open your case to read it.',
    ),
  };
}

export interface ChangedNoticeInput extends ActionInput {
  newEmail: string;
}

export function emailChangedNoticeEmail({ actionUrl, newEmail }: ChangedNoticeInput): MailBody {
  const contact = 'If you did not make this change, contact us immediately.';
  return {
    subject: 'Your Mailmyra e-mail address was changed',
    html: renderLayout({
      heading: 'Your e-mail address was changed',
      paragraphs: [
        `Your Mailmyra account now signs in with <strong>${escapeHtml(newEmail)}</strong>. This address no longer has access.`,
      ],
      actionUrl,
      actionLabel: 'Open Mailmyra',
      footnote: contact,
    }),
    text: renderText(
      [
        'Your e-mail address was changed',
        '',
        `Your Mailmyra account now signs in with ${newEmail}. This address no longer has access.`,
      ],
      actionUrl,
      contact,
    ),
  };
}

export interface InboundLeadMailInput {
  actionUrl: string;
  company: string;
  contact: string;
  source: string;
  seats: number;
  note: string | null;
}

/**
 * Pazarlama sitesinin formlarından gelen talebin personele bildirimi.
 * İngilizce — işlemsel e-postalar İngilizce kalır (kilitli karar).
 *
 * Talebin kendisi `Lead` satırında duruyor; bu e-posta "bir şey geldi"
 * demek için. Yine de özet taşır ki personel panele girmeden talebin
 * ciddiyetini görebilsin. Müşteri metni (`note`) kaçırılarak basılır:
 * gövde HTML ve içeriği tamamen kullanıcı yazımı.
 */
export function inboundLeadEmail({
  actionUrl,
  company,
  contact,
  source,
  seats,
  note,
}: InboundLeadMailInput): MailBody {
  const lines = [
    `Company: ${company}`,
    `Contact: ${contact}`,
    `Source: ${source}`,
    `Seats: ${seats}`,
  ];

  const detailHtml = note
    ? [`<strong>Details</strong><br>${escapeHtml(note).replace(/\n/g, '<br>')}`]
    : [];

  return {
    // Konu satırı HTML değil; ham hâliyle gider.
    subject: `New enquiry from ${company} (${source})`,
    html: renderLayout({
      heading: 'New enquiry',
      paragraphs: [lines.map((l) => escapeHtml(l)).join('<br>'), ...detailHtml],
      actionUrl,
      actionLabel: 'Open in the panel',
      footnote: 'Sent by the contact and demo forms on mailmyra.com.',
    }),
    text: renderText(
      ['New enquiry', '', ...lines, ...(note ? ['', 'Details', note] : [])],
      actionUrl,
      'Sent by the contact and demo forms on mailmyra.com.',
    ),
  };
}

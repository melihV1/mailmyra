import type { SignatureData } from '../types';
import { BRAND } from '../brand';

export interface Fixture {
  id: string;
  title: string;
  data: SignatureData;
}

const baseVisuals = {
  brandColor: BRAND.primary,
  iconColor: BRAND.primary,
  textColor: '#333333',
  mutedColor: '#6d6e71',
  fontFamily: 'Arial, Helvetica, sans-serif',
} satisfies Pick<
  SignatureData['visuals'],
  'brandColor' | 'iconColor' | 'textColor' | 'mutedColor' | 'fontFamily'
>;

/* Örnek içerik İNGİLİZCE (karar 2026-08-15, Hüseyin): ürün dili EN ve bu
   fixture yalnız dev sayfasında değil, pazarlama vitrininde ve panelin marka
   önizlemesinde de görünüyor. Kişiler kurgusal; şirket ve alan adı gerçek
   (vitrin Voldi Creative'in kendi ürünü). Türkçe karakter kapsaması
   fixture'a bağlı DEĞİL — `test/escape.test.ts` onu kendi diziyle sınar. */
const full: SignatureData = {
  identity: {
    fullName: 'Ellen Mercer',
    jobTitle: 'Founder & Creative Director',
    department: 'Design',
    company: 'Voldi Creative',
  },
  contact: {
    email: 'ellen@voldi.net',
    phone: '+90 332 000 00 00',
    mobile: '+90 555 000 00 00',
    website: 'https://voldi.net',
    address: 'Selçuklu, Konya, Turkey',
  },
  visuals: {
    ...baseVisuals,
    /* Yerel fixture görselleri (apps/web/public/brand-fixture) — placehold.co
       üçüncü partiydi: panel içi önizleme dış servise bağımlı olmasın.
       Göreli yol yeter; önizleme iframe'i base URL'i uygulamadan alır. */
    avatarUrl: '/brand-fixture/avatar.png',
    logoUrl: '/brand-fixture/logo.png',
    handSignatureUrl: '/brand-fixture/hand-signature.png',
  },
  social: [
    { platform: 'linkedin', url: 'https://linkedin.com/company/voldi' },
    { platform: 'instagram', url: 'https://instagram.com/voldi' },
    { platform: 'behance', url: 'https://behance.net/voldi' },
  ],
  extras: {
    ctaLabel: 'Book a meeting',
    ctaUrl: 'https://voldi.net/meeting',
    disclaimer:
      'This e-mail and any attachments are confidential. If it reached you by mistake, please delete it.',
    customFields: [
      { label: 'Portfolio', value: 'voldi.net/work', url: 'https://voldi.net/work' },
    ],
  },
  layout: {
    templateId: 'classic-horizontal',
    size: 'medium',
    iconStyle: 'mono',
    showDividers: true,
  },
};

const minimal: SignatureData = {
  identity: { fullName: 'Nora Bennett' },
  contact: { email: 'nora@voldi.net' },
  visuals: { ...baseVisuals },
  social: [],
  layout: {
    templateId: 'classic-horizontal',
    size: 'medium',
    iconStyle: 'mono',
    showDividers: false,
  },
};

const noLogo: SignatureData = {
  ...full,
  visuals: { ...baseVisuals },
};

const longContent: SignatureData = {
  ...full,
  /* Taşma testi: adların, ünvanların ve feragatnamenin UZUN kalması işin
     kendisi — çeviride karakter sayısı bilerek korundu. */
  identity: {
    fullName: 'Alexandra Katherine Fitzgerald-Whitmore',
    jobTitle: 'Senior Brand Strategist and Creative Content Director',
    department: 'Marketing & Corporate Communications',
    company: 'Voldi Creative Advertising & Promotion Services Inc.',
  },
  extras: {
    ...full.extras,
    disclaimer:
      'This electronic mail message and any attachments are intended solely for the person or organisation it was addressed to and may contain confidential information. If you are not the intended recipient, please notify the sender and delete the message from your system.',
  },
};

export const fixtures: Fixture[] = [
  { id: 'full', title: 'Full (every field)', data: full },
  { id: 'minimal', title: 'Minimal (name + e-mail)', data: minimal },
  { id: 'noLogo', title: 'No logo, no avatar', data: noLogo },
  { id: 'longContent', title: 'Long content (overflow test)', data: longContent },
];

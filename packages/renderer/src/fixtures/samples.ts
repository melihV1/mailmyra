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

const full: SignatureData = {
  identity: {
    fullName: 'Hüseyin Yıldız',
    jobTitle: 'Kurucu & Kreatif Direktör',
    department: 'Tasarım',
    company: 'Voldi Creative',
  },
  contact: {
    email: 'huseyin@voldi.net',
    phone: '+90 332 000 00 00',
    mobile: '+90 555 000 00 00',
    website: 'https://voldi.net',
    address: 'Selçuklu, Konya, Türkiye',
  },
  visuals: {
    ...baseVisuals,
    avatarUrl: 'https://placehold.co/240x240/7b9fd3/ffffff/png',
    logoUrl: 'https://placehold.co/360x120/1a1a1a/ffffff/png',
    handSignatureUrl: 'https://placehold.co/300x100/333333/ffffff/png',
  },
  social: [
    { platform: 'linkedin', url: 'https://linkedin.com/company/voldi' },
    { platform: 'instagram', url: 'https://instagram.com/voldi' },
    { platform: 'behance', url: 'https://behance.net/voldi' },
  ],
  extras: {
    ctaLabel: 'Görüşme Ayarla',
    ctaUrl: 'https://voldi.net/randevu',
    disclaimer:
      'Bu e-posta ve ekleri gizlidir. Yanlışlıkla ulaştıysa lütfen siliniz.',
    customFields: [
      { label: 'Portföy', value: 'voldi.net/isler', url: 'https://voldi.net/isler' },
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
  identity: { fullName: 'Ayşe Demir' },
  contact: { email: 'ayse@voldi.net' },
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
  identity: {
    fullName: 'Mehmet Abdullah Karahanoğlu-Süleymanoğlu',
    jobTitle: 'Kıdemli Marka Stratejisti ve Yaratıcı İçerik Yönetmeni',
    department: 'Pazarlama & Kurumsal İletişim',
    company: 'Voldi Creative Reklam ve Tanıtım Hizmetleri A.Ş.',
  },
  extras: {
    ...full.extras,
    disclaimer:
      'Bu elektronik posta mesajı ve ekleri yalnızca gönderildiği kişi veya kuruluşa özeldir ve gizli bilgiler içerebilir. Mesajın gönderildiği kişi değilseniz lütfen göndericiyi bilgilendirip mesajı sisteminizden siliniz.',
  },
};

export const fixtures: Fixture[] = [
  { id: 'full', title: 'Dolu (tüm alanlar)', data: full },
  { id: 'minimal', title: 'Minimal (ad + e-posta)', data: minimal },
  { id: 'noLogo', title: 'Logosuz / avatarsız', data: noLogo },
  { id: 'longContent', title: 'Uzun içerik (taşma testi)', data: longContent },
];

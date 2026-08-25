import type { Mirror } from '../types';

/**
 * Marka ekranı (app/(app)/app/brand/): sayfa (yetkisiz-rol boş durumu dahil)
 * + BrandClient. Önizleme kontrast uyarıları (`contrastWarnings`, StyleStep'ten)
 * BİLİNÇLİ dışarıda — Türkçe döner, builder ile aynı, dil göçü bu ekranın
 * kapsamı dışında (bkz. BrandClient yorum notu). "Save" düğmesi metni
 * `common.save`'den gelir — burada tekrar tanımlanmaz.
 */

const en = {
  pageTitle: 'Brand — Mailmyra',
  heading: 'Brand',
  subtitle: 'Defaults and locks for every signature in this workspace',
  unauthorized: {
    title: 'Owners and admins only',
    body: 'Brand settings are managed by workspace owners and admins.',
  },
  modeLabel: {
    unmanaged: 'Not managed',
    default: 'Default',
    locked: 'Locked',
  },
  modeGroupAria: (label: string) => `${label} management mode`,
  hexValueAria: 'Hex value',
  fields: {
    template: 'Template',
    font: 'Font',
    brandColor: 'Brand color',
    textColor: 'Text color',
    mutedColor: 'Secondary text color',
    logo: 'Logo',
    cta: 'Call to action',
    disclaimer: 'Legal disclaimer',
  },
  groups: {
    design: 'Design',
    colors: 'Colors',
    content: 'Content & assets',
  },
  logoHint: 'PNG, JPG or SVG · max 5MB · 360px/<60KB target',
  logoUploading: 'Uploading…',
  logoUploadFailed: 'Upload failed.',
  logoNetworkError: 'Network error — try again.',
  remove: 'Remove',
  ctaLabelPlaceholder: 'Label',
  ctaUrlPlaceholder: 'https://…',
  ctaLabelAria: 'CTA label',
  ctaUrlAria: 'CTA URL',
  fieldErrors: {
    logoUrl: 'Upload a logo or set this to Not managed.',
    cta: 'Enter a label and URL, or set this to Not managed.',
    invalidHex: 'Enter a valid hex color.',
  },
  savedBadge: (time: string) => `Saved · ${time}`,
  saveButton: 'Save brand settings',
  savedToast: 'Brand settings saved — they apply from the next export.',
  preview: {
    title: 'Live preview',
    subtitle: 'Sample data with your brand applied',
  },
  howModes: {
    title: 'How modes work',
    unmanagedNote: 'The workspace stays out of it — every signature keeps its own value.',
    defaultNote: 'Pre-fills new signatures; people can still change it afterwards.',
    lockedNote:
      'Forced on every export — existing values are overridden, nothing is rewritten in saved signatures.',
  },
  saveDialog: {
    title: 'Save brand settings',
    saving: 'Saving…',
    affects: (n: number) => `This will affect ${n} live signature${n === 1 ? '' : 's'}.`,
    appliesFrom: 'Changes apply from the next export — e-mails already sent do not change.',
    errors: {
      invalid_input: 'Some fields have an invalid value — check colors, links, and the CTA URL.',
      forbidden: 'Only owners and admins can manage brand settings.',
      generic: 'Something went wrong. Please try again.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Marka — Mailmyra',
  heading: 'Marka',
  subtitle: 'Bu çalışma alanındaki her imza için varsayılanlar ve kilitler',
  unauthorized: {
    title: 'Yalnızca sahipler ve yöneticiler',
    body: 'Marka ayarları çalışma alanı sahipleri ve yöneticileri tarafından yönetilir.',
  },
  modeLabel: {
    unmanaged: 'Yönetilmiyor',
    default: 'Varsayılan',
    locked: 'Kilitli',
  },
  modeGroupAria: (label: string) => `${label} yönetim modu`,
  hexValueAria: 'Hex değeri',
  fields: {
    template: 'Şablon',
    font: 'Yazı tipi',
    brandColor: 'Marka rengi',
    textColor: 'Metin rengi',
    mutedColor: 'İkincil metin rengi',
    logo: 'Logo',
    cta: 'Eylem çağrısı',
    disclaimer: 'Yasal metin',
  },
  groups: {
    design: 'Tasarım',
    colors: 'Renkler',
    content: 'İçerik ve görseller',
  },
  logoHint: 'PNG, JPG ya da SVG · en fazla 5MB · 360px/<60KB hedef',
  logoUploading: 'Yükleniyor…',
  logoUploadFailed: 'Yükleme başarısız.',
  logoNetworkError: 'Ağ hatası — tekrar dene.',
  remove: 'Kaldır',
  ctaLabelPlaceholder: 'Etiket',
  ctaUrlPlaceholder: 'https://…',
  ctaLabelAria: 'CTA etiketi',
  ctaUrlAria: 'CTA URL',
  fieldErrors: {
    logoUrl: 'Bir logo yükle ya da bunu Yönetilmiyor yap.',
    cta: 'Bir etiket ve URL gir, ya da bunu Yönetilmiyor yap.',
    invalidHex: 'Geçerli bir hex renk gir.',
  },
  savedBadge: (time: string) => `Kaydedildi · ${time}`,
  saveButton: 'Marka ayarlarını kaydet',
  savedToast: 'Marka ayarları kaydedildi — bir sonraki dışa aktarımdan itibaren geçerli olur.',
  preview: {
    title: 'Canlı önizleme',
    subtitle: 'Markan uygulanmış örnek veri',
  },
  howModes: {
    title: 'Modlar nasıl çalışır',
    unmanagedNote: 'Çalışma alanı bu alana karışmaz — her imza kendi değerini korur.',
    defaultNote: 'Yeni imzaları önceden doldurur; kişiler sonradan değiştirebilir.',
    lockedNote:
      'Her dışa aktarımda zorlanır — mevcut değerlerin üzerine yazılır, kaydedilmiş imzalarda hiçbir şey yeniden yazılmaz.',
  },
  saveDialog: {
    title: 'Marka ayarlarını kaydet',
    saving: 'Kaydediliyor…',
    affects: (n: number) => `Bu, ${n} yayındaki imzayı etkileyecek.`,
    appliesFrom: 'Değişiklikler bir sonraki dışa aktarımdan itibaren geçerli olur — zaten gönderilmiş e-postalar değişmez.',
    errors: {
      invalid_input: 'Bazı alanların değeri geçersiz — renkleri, bağlantıları ve CTA URL’sini kontrol et.',
      forbidden: 'Yalnızca sahipler ve yöneticiler marka ayarlarını yönetebilir.',
      generic: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
    },
  },
};

export const brand = { en, tr } as const;

import type { Mirror } from '../types';
import { signatures } from './signatures';

/**
 * Builder kabuğu (app/builder/): sayfa metadata'sı, BuilderClient (başlık,
 * adım sekmeleri, önizleme paneli, kayıt durumu şeridi), SaveDialog,
 * Preview (yalnız ARAYÜZ metinleri — imzanın kendisi renderer'dan gelir,
 * asla buraya karışmaz) ve dört adım (InfoStep/SocialStep/StyleStep/
 * VisualsStep).
 *
 * `fields.tsx` primitifleri (TextField/FieldGroup) metni çağrı
 * yerlerinden PROP olarak alır — burada onlar için anahtar yok; yalnız
 * parametresiz `LockHint` kendi içinde `useLang()` okur, bu yüzden tek
 * bir `lockHint` anahtarı var (primitifin arayüzü — prop'ları — değişmedi).
 *
 * `saveDialog.untitledName` panelin İmzalar ekranındaki
 * (`signatures.newButton.untitledName`) DEĞERİYLE birebir aynı olmak
 * zorunda (2026-08-24 revizyon kararı, B-Task 8 notu) — burada ondan
 * İÇE AKTARILIR, ikinci bir Türkçe varyant İCAT EDİLMEZ.
 *
 * `contrastWarnings` (StyleStep.tsx) ve `darkPreviewNote` (Preview.tsx)
 * saf fonksiyonlardır, `lang: Lang = 'en'` opsiyonel parametreyle
 * çağrılır — varsayılan İngilizce, mevcut testlerin (contrast-warnings,
 * preview-dark-note) tek argümanlı çağrılarını BİREBİR korur.
 */

const en = {
  pageTitle: 'Signature builder — Mailmyra',
  lockHint: 'Managed in brand settings',
  client: {
    steps: {
      info: 'Details',
      visuals: 'Images',
      social: 'Social',
      style: 'Style',
    },
    header: {
      heading: 'Signature builder',
      subtitle: 'Fill in the details on the left — the preview updates as you type.',
      savedLink: 'Saved to your signatures',
      saveButton: 'Save to my signatures',
      signInToSave: 'Sign in to save',
      backToPanel: 'Back to panel',
    },
    mobileTabs: {
      edit: 'Edit',
      preview: 'Preview',
    },
    editPane: {
      clearButton: 'Clear and start over',
      resetConfirm: 'This clears the saved draft and resets the form. Continue?',
      savedStatus: (time: string) => `Saved · ${time}`,
      saveFailedStatus: 'Could not save — check your connection',
      draftSavedLocally: 'Draft saved locally',
    },
    previewPane: {
      heading: 'Live preview',
      subtitle: 'Exactly what recipients get.',
      emptyTitle: 'Your signature appears here',
      emptyBody: 'Start with a name on the Details step — everything updates as you type.',
      iconsBuildFailed: 'Could not build the icons — try again',
      preparingIcons: 'Preparing icons…',
      tryAgain: 'Try again',
    },
  },
  saveDialog: {
    ariaLabel: 'Save signature',
    title: 'Save to my signatures',
    body: 'Give it a name so you can find it in the panel later.',
    nameLabel: 'Name',
    namePlaceholder: 'Sales team signature',
    nameHint: 'Only your team sees this — it never appears in the signature.',
    sessionExpiredError: 'Your session expired — sign in again to save.',
    genericError: 'Could not save. Please try again.',
    untitledName: signatures.en.newButton.untitledName,
  },
  preview: {
    backgroundAria: 'Preview background',
    light: 'Light',
    dark: 'Dark',
    iframeTitle: 'signature-preview',
    darkNoteFn:
      'Your text color is hard to read on a dark background. Most clients adapt colors ' +
      'in dark mode; this preview shows one that does not.',
    darkNoteAlert:
      'Your text color is hard to read on a dark background. Most clients adapt colors in ' +
      'dark mode — this preview shows one that does not.',
  },
  steps: {
    info: {
      identity: {
        groupTitle: 'Identity',
        fullName: 'Full name',
        jobTitle: 'Job title',
        department: 'Department',
        company: 'Company',
      },
      contact: {
        groupTitle: 'Contact',
        email: 'E-mail',
        phone: 'Phone',
        mobile: 'Mobile',
        website: 'Website',
        address: 'Address',
      },
      cta: {
        groupTitle: 'Call to action',
        buttonLabel: 'Button label',
        buttonLabelPlaceholder: 'Book a meeting',
        buttonLink: 'Button link',
        buttonLinkPlaceholder: 'https://...',
      },
      customFields: {
        groupTitle: 'Custom fields',
        labelPlaceholder: 'Label',
        valuePlaceholder: 'Value',
        urlPlaceholder: 'URL (optional)',
        labelAria: (n: number) => `Custom field ${n} label`,
        valueAria: (n: number) => `Custom field ${n} value`,
        linkAria: (n: number) => `Custom field ${n} link`,
        deleteAria: (n: number) => `Delete custom field ${n}`,
        addField: 'Add field',
      },
      legal: {
        groupTitle: 'Legal text',
        label: 'Disclaimer / confidentiality note',
      },
    },
    social: {
      emptyNote: 'No social links yet. Icons are generated in your icon color when you add one.',
      platformAria: (n: number) => `Social platform ${n}`,
      urlPlaceholder: 'https://...',
      urlAria: (n: number) => `Social link ${n} URL`,
      moveUp: 'Move up',
      moveDown: 'Move down',
      deleteAria: (n: number) => `Delete social link ${n}`,
      addLink: 'Add social link',
    },
    style: {
      contrastHeading: 'Contrast',
      contrastWhiteBg: (name: string) => `${name} is hard to read on a white background.`,
      contrastNearBlack: (name: string) =>
        `${name} is very close to pure black and can disappear in dark mode.`,
      template: {
        groupTitle: 'Template',
        classicHorizontalName: 'Classic',
        classicHorizontalBlurb: 'Photo on the left, details on the right.',
        stackedMinimalName: 'Stacked',
        stackedMinimalBlurb: 'One narrow column — images on top.',
        cardBorderedName: 'Card',
        cardBorderedBlurb: 'Bordered card with a brand accent bar.',
      },
      colors: {
        groupTitle: 'Colors',
        brandColor: 'Brand color',
        textColor: 'Text color',
        mutedColor: 'Secondary text color',
        iconColor: 'Icon color',
        pickerAria: (label: string) => `${label} picker`,
        hexAria: (label: string) => `${label} hex value`,
      },
      typography: {
        groupTitle: 'Typography and layout',
        font: 'Font',
        size: 'Size',
        sizeSmall: 'Small',
        sizeMedium: 'Medium',
        sizeLarge: 'Large',
        showDividers: 'Show divider lines',
        iconStyle: 'Icon style',
        iconStyleFilled: 'Filled',
        iconStyleOutline: 'Outline',
        iconStyleMono: 'Monochrome',
        filledNote:
          'Filled icons use each platform’s own colors — the icon color is not used in this style.',
        lowContrastNote: 'Your icon color is light — icons may look faint on a white background.',
      },
    },
    visuals: {
      slots: {
        avatarUrl: { title: 'Profile photo', hint: '180px, target under 40KB' },
        logoUrl: { title: 'Company logo', hint: '360px, target under 60KB' },
        handSignatureUrl: { title: 'Handwritten signature', hint: '300px, target under 50KB' },
      },
      formatHint: (hint: string) => `PNG, JPG or SVG · max 5MB · ${hint}`,
      uploadAria: (title: string) => `Upload ${title}`,
      remove: 'Remove',
      uploading: 'Uploading…',
      uploadFailed: 'Upload failed.',
      networkError: 'Network error — try again.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'İmza Builder’ı — Mailmyra',
  lockHint: 'Marka ayarlarından yönetiliyor',
  client: {
    steps: {
      info: 'Detaylar',
      visuals: 'Görseller',
      social: 'Sosyal',
      style: 'Stil',
    },
    header: {
      heading: 'İmza Builder’ı',
      subtitle: 'Soldaki detayları doldur — önizleme yazdıkça güncellenir.',
      savedLink: 'İmzalarına kaydedildi',
      saveButton: 'İmzalarıma kaydet',
      signInToSave: 'Kaydetmek için giriş yap',
      backToPanel: 'Panele dön',
    },
    mobileTabs: {
      edit: 'Düzenle',
      preview: 'Önizle',
    },
    editPane: {
      clearButton: 'Temizle ve baştan başla',
      resetConfirm: 'Bu, kayıtlı taslağı temizler ve formu sıfırlar. Devam etmek istiyor musun?',
      savedStatus: (time: string) => `Kaydedildi · ${time}`,
      saveFailedStatus: 'Kaydedilemedi — bağlantını kontrol et',
      draftSavedLocally: 'Taslak bu cihazda kaydedildi',
    },
    previewPane: {
      heading: 'Canlı önizleme',
      subtitle: 'Alıcıların göreceği tam olarak bu.',
      emptyTitle: 'İmzan burada görünecek',
      emptyBody: 'Detaylar adımında bir adla başla — her şey yazdıkça güncellenir.',
      iconsBuildFailed: 'İkonlar oluşturulamadı — tekrar dene',
      preparingIcons: 'İkonlar hazırlanıyor…',
      tryAgain: 'Tekrar dene',
    },
  },
  saveDialog: {
    ariaLabel: 'İmzayı kaydet',
    title: 'İmzalarıma kaydet',
    body: 'Panelde daha sonra bulabilmen için bir ad ver.',
    nameLabel: 'Ad',
    namePlaceholder: 'Satış ekibi imzası',
    nameHint: 'Bunu yalnızca takımın görür — imzada hiç görünmez.',
    sessionExpiredError: 'Oturumun sona erdi — kaydetmek için tekrar giriş yap.',
    genericError: 'Kaydedilemedi. Lütfen tekrar dene.',
    untitledName: signatures.tr.newButton.untitledName,
  },
  preview: {
    backgroundAria: 'Önizleme arka planı',
    light: 'Açık',
    dark: 'Koyu',
    iframeTitle: 'imza önizlemesi',
    darkNoteFn:
      'Metin rengin koyu bir zeminde okunması zor. Çoğu istemci koyu modda renkleri uyarlar; ' +
      'bu önizleme uyarlamayan birini gösteriyor.',
    darkNoteAlert:
      'Metin rengin koyu bir zeminde okunması zor. Çoğu istemci koyu modda renkleri uyarlar — ' +
      'bu önizleme uyarlamayan birini gösteriyor.',
  },
  steps: {
    info: {
      identity: {
        groupTitle: 'Kimlik',
        fullName: 'Ad soyad',
        jobTitle: 'Ünvan',
        department: 'Departman',
        company: 'Şirket',
      },
      contact: {
        groupTitle: 'İletişim',
        email: 'E-posta',
        phone: 'Telefon',
        mobile: 'Cep telefonu',
        website: 'Web sitesi',
        address: 'Adres',
      },
      cta: {
        groupTitle: 'Eylem çağrısı',
        buttonLabel: 'Buton etiketi',
        buttonLabelPlaceholder: 'Toplantı ayarla',
        buttonLink: 'Buton bağlantısı',
        buttonLinkPlaceholder: 'https://...',
      },
      customFields: {
        groupTitle: 'Özel alanlar',
        labelPlaceholder: 'Etiket',
        valuePlaceholder: 'Değer',
        urlPlaceholder: 'URL (opsiyonel)',
        labelAria: (n: number) => `${n}. özel alan etiketi`,
        valueAria: (n: number) => `${n}. özel alan değeri`,
        linkAria: (n: number) => `${n}. özel alan bağlantısı`,
        deleteAria: (n: number) => `${n}. özel alanı sil`,
        addField: 'Alan ekle',
      },
      legal: {
        groupTitle: 'Yasal metin',
        label: 'Feragatname / gizlilik notu',
      },
    },
    social: {
      emptyNote:
        'Henüz sosyal medya bağlantısı yok. Bir tane eklediğinde ikonlar senin ikon renginle üretilir.',
      platformAria: (n: number) => `${n}. sosyal medya platformu`,
      urlPlaceholder: 'https://...',
      urlAria: (n: number) => `${n}. sosyal medya bağlantısı URL’si`,
      moveUp: 'Yukarı taşı',
      moveDown: 'Aşağı taşı',
      deleteAria: (n: number) => `${n}. sosyal medya bağlantısını sil`,
      addLink: 'Sosyal medya bağlantısı ekle',
    },
    style: {
      contrastHeading: 'Kontrast',
      contrastWhiteBg: (name: string) => `${name} beyaz zeminde okunması zor.`,
      contrastNearBlack: (name: string) =>
        `${name} saf siyaha çok yakın ve koyu modda kaybolabilir.`,
      template: {
        groupTitle: 'Şablon',
        classicHorizontalName: 'Klasik',
        classicHorizontalBlurb: 'Solda fotoğraf, sağda detaylar.',
        stackedMinimalName: 'Alt Alta',
        stackedMinimalBlurb: 'Tek dar sütun — görseller üstte.',
        cardBorderedName: 'Kart',
        cardBorderedBlurb: 'Marka renginde vurgu çubuğu olan çerçeveli kart.',
      },
      colors: {
        groupTitle: 'Renkler',
        brandColor: 'Marka rengi',
        textColor: 'Metin rengi',
        mutedColor: 'İkincil metin rengi',
        iconColor: 'İkon rengi',
        pickerAria: (label: string) => `${label} seçici`,
        hexAria: (label: string) => `${label} hex değeri`,
      },
      typography: {
        groupTitle: 'Tipografi ve yerleşim',
        font: 'Yazı tipi',
        size: 'Boyut',
        sizeSmall: 'Küçük',
        sizeMedium: 'Orta',
        sizeLarge: 'Büyük',
        showDividers: 'Ayraç çizgilerini göster',
        iconStyle: 'İkon stili',
        iconStyleFilled: 'Dolu',
        iconStyleOutline: 'Çizgi',
        iconStyleMono: 'Tek renk',
        filledNote:
          'Dolu ikonlar her platformun kendi renklerini kullanır — bu stilde ikon rengi kullanılmaz.',
        lowContrastNote: 'İkon rengin açık — ikonlar beyaz zeminde soluk görünebilir.',
      },
    },
    visuals: {
      slots: {
        avatarUrl: { title: 'Profil fotoğrafı', hint: '180px, hedef 40KB altı' },
        logoUrl: { title: 'Şirket logosu', hint: '360px, hedef 60KB altı' },
        handSignatureUrl: { title: 'El yazısı imza', hint: '300px, hedef 50KB altı' },
      },
      formatHint: (hint: string) => `PNG, JPG ya da SVG · en fazla 5MB · ${hint}`,
      uploadAria: (title: string) => `${title} yükle`,
      remove: 'Kaldır',
      uploading: 'Yükleniyor…',
      uploadFailed: 'Yükleme başarısız.',
      networkError: 'Ağ hatası — tekrar dene.',
    },
  },
};

export const builder = { en, tr } as const;

/**
 * StyleStep'teki saf yardımcı fonksiyonlar (`templateLooks`, `ColorField`)
 * `builder[lang]`'ın şeklini parametre olarak alır. `Mirror<typeof en>`
 * kullanılır (bire bir `typeof en` DEĞİL) — `builder[lang]` bir union
 * (`typeof en | typeof tr`) döndürür ve yalnız `en`'in literal string
 * tipleri `tr`'ninkilerle uyuşmaz; `Mirror` iki tarafı da kapsayan geniş
 * (widen edilmiş) ortak tip.
 */
export type BuilderDict = Mirror<typeof en>;

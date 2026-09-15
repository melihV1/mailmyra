export interface SignatureData {
  identity: {
    fullName: string;
    jobTitle?: string;
    department?: string;
    company?: string;
  };

  contact: {
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: string;
  };

  visuals: {
    avatarUrl?: string;
    logoUrl?: string;
    handSignatureUrl?: string;
    brandColor: string;
    /**
     * Sosyal ikonların rengi (outline + mono). brandColor'dan AYRIDIR:
     * kullanıcı ikon rengini bağımsız seçer (karar: 2026-07-27, Hüseyin).
     * `filled` stili bu alanı kullanmaz — o platform renklerinde sabittir.
     */
    iconColor: string;
    textColor: string;
    mutedColor: string;
    fontFamily: WebSafeFont;
  };

  social: Array<{
    platform:
      | 'linkedin'
      | 'x'
      | 'instagram'
      | 'facebook'
      | 'youtube'
      | 'github'
      | 'behance'
      | 'dribbble';
    url: string;
  }>;

  extras?: {
    ctaLabel?: string;
    ctaUrl?: string;
    disclaimer?: string;
    customFields?: Array<{ label: string; value: string; url?: string }>;
  };

  layout: {
    templateId: string;
    size: 'small' | 'medium' | 'large';
    iconStyle: 'filled' | 'outline' | 'mono';
    showDividers: boolean;
    /**
     * Fotoğraf yokken baş harf bloğu gösterilsin mi.
     * Alan YOKSA 'auto' sayılır — kayıtlı eski imzalar da monogram kazanır.
     * 'off' saf metin görünümü isteyenler içindir.
     * `visuals.avatarUrl` VARSA bu alan ne olursa olsun monogram basılmaz.
     */
    monogram?: 'auto' | 'off';
    /**
     * İsim satırı büyük harfe çevrilsin ve harf aralığı açılsın mı.
     * Alan yoksa 'normal' sayılır — kişisel stil tercihi, herkesin ismini
     * zorla versal yapmak saldırgan olurdu (uzun isimler versal hâlde sarar).
     */
    nameCase?: 'normal' | 'upper';
    /**
     * Şablonun aksan alanı çizilsin mi. YERİ şablonun kararı, VARLIĞI
     * kullanıcının. Alan yoksa 'auto' sayılır: aksan şablonun karakteridir,
     * kapalı varsayılan galeriyi bugünkü hâlinde bırakırdı.
     * Yeri tanımlı olmayan şablonlarda (classic-horizontal, divider-columns,
     * stacked-minimal) ve cta-banner'da SESSİZCE yok sayılır.
     */
    accentBand?: 'auto' | 'off';
  };
}

export type WebSafeFont =
  | 'Arial, Helvetica, sans-serif'
  | 'Georgia, serif'
  | 'Times New Roman, serif'
  | 'Verdana, Geneva, sans-serif'
  | 'Tahoma, Geneva, sans-serif'
  | 'Trebuchet MS, sans-serif';

/** renderSignature için isteğe bağlı render ayarları. */
export interface RenderOptions {
  /**
   * Sosyal ikon PNG'lerinin kök URL'i (ör. https://cdn.mailmyra.com).
   * Verilmezse sosyal satır metin-link olarak basılır (geriye uyumlu).
   */
  iconBaseUrl?: string;
}

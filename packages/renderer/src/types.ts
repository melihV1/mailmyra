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

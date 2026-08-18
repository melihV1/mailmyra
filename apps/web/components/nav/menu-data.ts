/**
 * Header'ın tek içerik kaynağı — docs/page-plan.md'deki 10 sayfalık site
 * haritasının nav'a yansıyan alt kümesi (blog, KVKK/Gizlilik/Şartlar ve
 * İletişim burada yok; onlar footer'ın işi, bkz. design-system.md §3.4 —
 * footer bu adımda yazılmıyor). home.content.ts'teki "JSX'ten ayrı tek
 * sözlük" deseninin nav karşılığı.
 *
 * Bazı hedefler (`/urun`, `/sablonlar`, `/ajanslar`, ...) henüz kodlanmamış
 * sayfalara işaret eder — step1-manifesto.md bu adımda "hiçbir page.tsx
 * yazılmaz" diyor, bu dosya yalnız bilgi mimarisini (IA) tanımlıyor; Hafta
 * 3'te sayfalar geldikçe bu URL'ler dolacak.
 */

/**
 * Pazarlama sitesi AYRI BİR ALAN ADINDA yaşıyor (statik site, `mailmyra.com`);
 * panel `app.mailmyra.com`'da. Bu yüzden pazarlama linkleri MUTLAK olmak
 * zorunda — göreli yazılırsa `app.mailmyra.com/pricing`'e gider ve 404 olur.
 *
 * Adresler uzantısız: dosyalar diskte `pricing.html` ama site kökündeki
 * `web.config` temiz adresi ona çeviriyor. Üç ad dosyayla birebir aynı
 * DEĞİL, karşılıkları yorumlarda yazılı (ör. "Setup guides" -> `setup.html`).
 *
 * `/builder` ve `/login` uygulamanın kendi sayfaları — göreli kalır.
 */
const SITE = 'https://mailmyra.com';

export interface MegaMenuLink {
  label: string;
  href: string;
  description: string;
}

export interface MegaMenuSection {
  heading: string;
  links: MegaMenuLink[];
}

export interface MegaMenuFeatured {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface MegaMenuItem {
  id: string;
  label: string;
  type: 'menu';
  sections: MegaMenuSection[];
  featured: MegaMenuFeatured;
}

export interface PlainNavLink {
  id: string;
  label: string;
  type: 'link';
  href: string;
}

export type NavItem = MegaMenuItem | PlainNavLink;

/* Etiketler ve HEDEFLER İngilizce (karar 2026-08-17, Hüseyin): ürün dili EN
   ve bu URL'lerin hiçbirinde henüz sayfa YOK — slug'ları şimdi çevirmenin
   maliyeti sıfır, sayfalar yazıldıktan sonra taşıma + yönlendirme demekti. */
export const primaryNav: NavItem[] = [
  {
    id: 'product',
    label: 'Product',
    type: 'menu',
    sections: [
      {
        heading: 'Product',
        links: [
          {
            label: 'How it works',
            href: `${SITE}/how-it-works`,
            description: 'Design, preview, roll out — in three steps.',
          },
          {
            label: 'Features',
            href: `${SITE}/features`,
            description: 'Rich fields, Outlook compatibility, a real export path.',
          },
          {
            label: 'Template gallery',
            href: `${SITE}/templates`,
            description: 'Real renders, not screenshots.',
          },
        ],
      },
    ],
    featured: {
      title: 'Live builder',
      description: 'Try it without signing up — preview your signature as you type.',
      href: '/builder',
      ctaLabel: 'Open the builder',
    },
  },
  {
    id: 'solutions',
    label: 'Solutions',
    type: 'menu',
    sections: [
      {
        heading: 'Solutions',
        links: [
          {
            label: 'For agencies',
            href: `${SITE}/solutions-agencies`,
            description: 'Pooled seats and white-label management.',
          },
          {
            label: 'For companies',
            href: `${SITE}/solutions-teams`,
            description: 'Transparent per-seat pricing, tested in 6 mail clients.',
          },
        ],
      },
    ],
    featured: {
      title: 'See the pricing',
      description: 'One price per active sender. Nothing hidden.',
      href: `${SITE}/pricing`,
      ctaLabel: 'View pricing',
    },
  },
  { id: 'pricing', label: 'Pricing', type: 'link', href: `${SITE}/pricing` },
  { id: 'setup-guides', label: 'Setup guides', type: 'link', href: `${SITE}/setup` },
  { id: 'faq', label: 'FAQ', type: 'link', href: `${SITE}/faq` },
];

export const utilityNav = {
  login: { label: 'Log in', href: '/login' },
  cta: { label: 'Try the builder', href: '/builder' },
};

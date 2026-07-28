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

export const primaryNav: NavItem[] = [
  {
    id: 'urun',
    label: 'Ürün',
    type: 'menu',
    sections: [
      {
        heading: 'Ürün',
        links: [
          {
            label: 'Nasıl çalışır',
            href: '/nasil-calisir',
            description: 'Tasarla, önizle, dağıt — üç adımda.',
          },
          {
            label: 'Özellikler',
            href: '/urun',
            description: 'Alan zenginliği, Outlook uyumu, export mekanizması.',
          },
          {
            label: 'Şablon galerisi',
            href: '/sablonlar',
            description: 'Gerçek render, ekran görüntüsü değil.',
          },
        ],
      },
    ],
    featured: {
      title: 'Canlı builder',
      description: 'Kaydolmadan dene — imzanı gerçek zamanlı önizle.',
      href: '/builder',
      ctaLabel: "Builder'ı aç",
    },
  },
  {
    id: 'cozumler',
    label: 'Çözümler',
    type: 'menu',
    sections: [
      {
        heading: 'Çözümler',
        links: [
          {
            label: 'Ajanslar için',
            href: '/ajanslar',
            description: 'Havuzlanmış koltuk + white-label yönetimi.',
          },
          {
            label: 'Kurumsal için',
            href: '/kurumsal',
            description: 'Koltuk bazlı şeffaf fiyat, 6 istemci test matrisi.',
          },
        ],
      },
    ],
    featured: {
      title: 'Fiyatlandırmayı gör',
      description: 'Koltuk başına şeffaf fiyat, saklama yok.',
      href: '/fiyatlandirma',
      ctaLabel: 'Fiyatları incele',
    },
  },
  { id: 'fiyatlandirma', label: 'Fiyatlandırma', type: 'link', href: '/fiyatlandirma' },
  { id: 'kurulum', label: 'Kurulum Rehberleri', type: 'link', href: '/kurulum' },
  { id: 'sss', label: 'SSS', type: 'link', href: '/sss' },
];

export const utilityNav = {
  login: { label: 'Giriş yap', href: '/login' },
  cta: { label: "Builder'ı Dene", href: '/builder' },
};

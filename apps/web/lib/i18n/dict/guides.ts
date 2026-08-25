import type { Mirror } from '../types';

/**
 * Kurulum rehberleri KABUĞU (app/(app)/app/guides/): sayfa başlığı,
 * özet kartı, kapsam (dürüstlük) notu, paylaşım kartı, rozet etiketleri.
 * Rehber İÇERİĞİ burada değil — `guides-content.en.ts`/`.tr.ts`,
 * girişleri `getGuides`/`getExportChain`; iskelet eşliğinin bekçisi
 * `test/guides-parity.test.ts`.
 */

const en = {
  pageTitle: 'Setup guides — Mailmyra',
  page: {
    heading: 'Setup guides',
    subheading: 'How a finished signature gets installed in each mail client we test against.',
  },
  exportCard: {
    title: 'How exporting works',
    subtitle:
      'Three steps get a signature out of Mailmyra. Everything after that happens in the mail client.',
    // Ürün kapsamı — CLAUDE.md §YAPILMAYACAKLAR. İki dilde de vaat yok.
    scopeNote:
      'Mailmyra never touches your mail server. There is no directory sync, no Outlook add-in and no server-side rule that rewrites outgoing mail — you send the copied HTML or the exported file to the person, and they install it in their own client. These guides are what you forward to them.',
  },
  sharing: {
    title: 'Sharing a guide',
    body: 'Every client has its own address. Copy the URL from the address bar and send it to whoever is installing the signature.',
  },
  fidelity: {
    rich: 'Full HTML signature',
    text: 'Plain text only',
  },
  uses: (what: string) => `Uses: ${what}`,
  goodToKnow: 'Good to know',
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Kurulum rehberleri — Mailmyra',
  page: {
    heading: 'Kurulum rehberleri',
    subheading: 'Bitmiş bir imza, test ettiğimiz her e-posta istemcisine nasıl kurulur.',
  },
  exportCard: {
    title: 'Dışa aktarım nasıl işler',
    subtitle:
      'Bir imzayı Mailmyra\'dan çıkarmak üç adımdır. Sonrası tamamen e-posta istemcisinde olur.',
    scopeNote:
      'Mailmyra posta sunucuna asla dokunmaz. Directory sync yok, Outlook eklentisi yok, giden postayı yeniden yazan sunucu tarafı kural yok — kopyalanan HTML\'i ya da dışa aktarılan dosyayı kişiye sen gönderirsin, o da kendi istemcisine kendisi kurar. Bu rehberler, ona ileteceğin şeydir.',
  },
  sharing: {
    title: 'Rehber paylaşmak',
    body: 'Her istemcinin kendi adresi var. Adres çubuğundaki URL\'yi kopyala ve imzayı kuracak kişiye gönder.',
  },
  fidelity: {
    rich: 'Tam HTML imza',
    text: 'Yalnız düz metin',
  },
  uses: (what: string) => `Kullandığı: ${what}`,
  goodToKnow: 'Bilmekte fayda var',
};

export const guides = { en, tr } as const;

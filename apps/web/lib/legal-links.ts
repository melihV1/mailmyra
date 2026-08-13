/** Hukuki sayfaların tek kaynağı. Sürüm = yürürlük günü; metin değişince
 *  burası güncellenir, kabul kayıtları hangi sürüme onay verildiğini tutar. */
export const LEGAL = {
  terms: { path: '/terms', version: '2026-08-13', title: 'Terms of Service' },
  privacy: { path: '/privacy', version: '2026-08-13', title: 'Privacy Policy' },
  kvkk: { path: '/kvkk', version: '2026-08-13', title: 'KVKK Aydınlatma Metni' },
} as const;

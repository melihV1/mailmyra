/**
 * Tekli ".htm indir" ile toplu zip'in ORTAK sarmalayıcısı. İki üretim yolu
 * birbirinden sapamasın diye tek kaynak (spec §5). İçerik e-posta kuralı
 * taşımıyor — dosya tarayıcı/istemciye açılan basit bir kabuk.
 */
export function wrapExportDoc(fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${fragment}</body></html>`;
}

/**
 * Zip girdi adları (spec §6). ASCII'ye indirgenir: UTF-8 bayrağını yok
 * sayan zip açıcılar (özellikle eski Windows) Türkçe adları bozuyor;
 * dağıtılacak dosyada bu risk alınmaz.
 */

export interface ExportNameInput {
  senderName: string;
  senderEmail: string;
  signatureName: string;
  /** Göndericinin zip'e girecek imza sayısı — 1 ise imza adı eklenmez. */
  senderSignatureCount: number;
}

const TR: Record<string, string> = { ş: 's', ı: 'i', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' };

export function slugify(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/[şığüöç]/g, (ch) => TR[ch] ?? ch)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function nameExportFiles(inputs: ReadonlyArray<ExportNameInput>): string[] {
  // `baseCount`: aynı base'in kaçıncı görülüşü olduğu (ilk aday adı üretmek
  // için). `usedNames`: gerçekten atanmış SONUÇ adları — reviewer bulgusu:
  // yalnız base bazında sayınca "Ali Yılmaz" iki kez + "Ali Yılmaz 2" bir kez
  // ikisi de "ali-yilmaz-2.htm"e düşüyordu ve jszip sessizce üzerine
  // yazıyordu. Son adı da bu Set'e karşı kontrol edip çakışırsa sayaç
  // artırılana kadar bumpluyoruz.
  const baseCount = new Map<string, number>();
  const usedNames = new Set<string>();
  return inputs.map((f) => {
    let base = slugify(f.senderName) || slugify(f.senderEmail.split('@')[0] ?? '') || 'imza';
    if (f.senderSignatureCount > 1) {
      const sig = slugify(f.signatureName);
      if (sig) base = `${base}--${sig}`;
    }
    const n = (baseCount.get(base) ?? 0) + 1;
    baseCount.set(base, n);

    let suffix = n;
    let candidate = suffix === 1 ? `${base}.htm` : `${base}-${suffix}.htm`;
    while (usedNames.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}.htm`;
    }
    usedNames.add(candidate);
    return candidate;
  });
}

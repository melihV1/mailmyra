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
  const used = new Map<string, number>();
  return inputs.map((f) => {
    let base = slugify(f.senderName) || slugify(f.senderEmail.split('@')[0] ?? '') || 'imza';
    if (f.senderSignatureCount > 1) {
      const sig = slugify(f.signatureName);
      if (sig) base = `${base}--${sig}`;
    }
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? `${base}.htm` : `${base}-${n}.htm`;
  });
}

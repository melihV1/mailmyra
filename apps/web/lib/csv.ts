/**
 * CSV içe aktarma — saf katman (DOM yok, DB yok).
 *
 * Bağımlılık almadık çünkü ihtiyaç dar: başlıklı bir tablo, tırnaklı alanlar,
 * Excel'in iki kötü huyu (BOM + CRLF) ve Türkçe bölge ayarının noktalı
 * virgülü. Tam RFC 4180 değil; imza listesi içe aktarmak için gerekeni yapar.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** `;` mi `,` mi? İlk satırda hangisi çoksa o — Türkçe Excel `;` yazar. */
function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

export function parseCsv(text: string): ParsedCsv {
  // Windows Excel'in görünmez hediyeleri: BOM ilk başlığı bozar,
  // \r her hücre sonuna yapışır.
  const clean = text.replace(/^﻿/, '');
  const firstLineEnd = clean.indexOf('\n');
  const delimiter = detectDelimiter(firstLineEnd === -1 ? clean : clean.slice(0, firstLineEnd));

  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    // Boş satır hayalet kayıt üretmesin.
    if (record.some((c) => c.trim() !== '')) records.push(record);
    record = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++; // "" → tek tırnak
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === '\n') {
      pushRecord();
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || record.length > 0) pushRecord();

  const [headers = [], ...rows] = records;
  return { headers: headers.map((h) => h.trim()), rows };
}

// ─── Sütun eşleme ────────────────────────────────────────────────────────

export interface ColumnMapping {
  displayName: number | null;
  email: number | null;
  jobTitle: number | null;
}

/** Alan başına tanınan başlıklar — küçük harfe indirilerek karşılaştırılır. */
const HEADER_ALIASES: Record<keyof ColumnMapping, string[]> = {
  displayName: ['name', 'full name', 'fullname', 'ad soyad', 'adsoyad', 'ad', 'isim', 'display name'],
  email: ['email', 'e-mail', 'mail', 'e-posta', 'eposta', 'email address'],
  jobTitle: ['title', 'job title', 'jobtitle', 'ünvan', 'unvan', 'gorev', 'görev', 'position'],
};

/**
 * Başlıklardan otomatik eşleme tahmini. Tanımadığını `null` bırakır —
 * yanlış tahminle sessizce saçma veri basmaktansa kullanıcıya sormak iyidir.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const find = (aliases: string[]) => {
    const idx = lower.findIndex((h) => aliases.includes(h));
    return idx === -1 ? null : idx;
  };
  return {
    displayName: find(HEADER_ALIASES.displayName),
    email: find(HEADER_ALIASES.email),
    jobTitle: find(HEADER_ALIASES.jobTitle),
  };
}

// ─── Satır doğrulama ─────────────────────────────────────────────────────

export interface ValidRow {
  displayName: string;
  email: string;
  jobTitle: string | undefined;
}

export interface RowError {
  /** İNSAN dilinde satır numarası: başlık 1. satırdır, ilk veri 2. */
  line: number;
  reason: 'missing_name' | 'invalid_email' | 'duplicate_in_file';
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRows(
  rows: string[][],
  mapping: ColumnMapping,
): { valid: ValidRow[]; errors: RowError[] } {
  const valid: ValidRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const line = i + 2; // başlık + 1-tabanlı sayım
    const displayName = (mapping.displayName !== null ? (row[mapping.displayName] ?? '') : '').trim();
    const email = (mapping.email !== null ? (row[mapping.email] ?? '') : '')
      .trim()
      .toLowerCase();
    const jobTitleRaw = mapping.jobTitle !== null ? (row[mapping.jobTitle] ?? '').trim() : '';

    if (!displayName) return void errors.push({ line, reason: 'missing_name' });
    if (!EMAIL_SHAPE.test(email)) return void errors.push({ line, reason: 'invalid_email' });
    if (seen.has(email)) return void errors.push({ line, reason: 'duplicate_in_file' });

    seen.add(email);
    valid.push({ displayName, email, jobTitle: jobTitleRaw || undefined });
  });

  return { valid, errors };
}

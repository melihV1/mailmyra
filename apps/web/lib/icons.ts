import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  siBehance,
  siDribbble,
  siFacebook,
  siGithub,
  siInstagram,
  siLinkedin,
  siX,
  siYoutube,
} from 'simple-icons';
import { contrastRatio, normalizeHex, type SignatureData } from '@mailmyra/renderer';

type SocialPlatform = SignatureData['social'][number]['platform'];

// simple-icons ^13'e SABİT: v14.0.0 linkedin ikonunu kaldırdı (marka talebi).
// Upgrade etmeden önce 8 platformun tamamının pakette olduğunu doğrula.
const ICONS: Record<SocialPlatform, { hex: string; path: string }> = {
  linkedin: siLinkedin,
  x: siX,
  instagram: siInstagram,
  facebook: siFacebook,
  youtube: siYoutube,
  github: siGithub,
  behance: siBehance,
  dribbble: siDribbble,
};

export const ICON_PLATFORMS = Object.keys(ICONS) as SocialPlatform[];

/**
 * Beyaz zeminde "açık ton" uyarı eşiği. UYARI amaçlıdır — renk ASLA
 * değiştirilmez (spec 2026-07-27: marka rengi korunur, yalnız uyarılır).
 * Not: istemci tarafı bu değeri `BuilderClient.tsx` içinde kendi kopyası
 * olarak tutar (`ICON_LOW_CONTRAST_ON_WHITE`) — ikisi elle senkron kalmalı.
 */
const LOW_CONTRAST_ON_WHITE = 3;

const CANVAS = 48; // 2x retina; HTML'de 24x24 kullanılır
const FILLED_GLYPH = 30; // yuvarlatılmış kare içinde glif boyutu
const FILLED_RADIUS = 10;

// SVG yalnızca sharp'a SUNUCU tarafı girdidir — çıktı daima PNG
// (e-posta HTML kısıtı: çıktıda SVG olamaz). simple-icons path'leri 24x24.
function svgFilled(glyphPath: string, brandHex: string): string {
  const scale = FILLED_GLYPH / 24;
  const offset = (CANVAS - FILLED_GLYPH) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<rect width="${CANVAS}" height="${CANVAS}" rx="${FILLED_RADIUS}" fill="#${brandHex}"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${scale})"><path d="${glyphPath}" fill="#ffffff"/></g>` +
    `</svg>`
  );
}

function svgGlyph(glyphPath: string, colorHex: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<g transform="scale(${CANVAS / 24})"><path d="${glyphPath}" fill="#${colorHex}"/></g>` +
    `</svg>`
  );
}

const OUTLINE_STROKE = 3;

/**
 * Kontur: seçilen renkte yuvarlatılmış kare ÇERÇEVE + şeffaf iç + aynı
 * renkte glif. Çerçeve PNG'ye rasterize edilir (CSS değil), bu yüzden
 * Outlook'ta `border-radius` desteği gerekmez — düz bir görsel olarak gelir.
 */
function svgOutline(glyphPath: string, colorHex: string): string {
  const scale = FILLED_GLYPH / 24;
  const offset = (CANVAS - FILLED_GLYPH) / 2;
  const inset = OUTLINE_STROKE / 2; // stroke kırpılmasın diye içe kaydır
  const side = CANVAS - OUTLINE_STROKE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<rect x="${inset}" y="${inset}" width="${side}" height="${side}" rx="${FILLED_RADIUS}" ` +
    `fill="none" stroke="#${colorHex}" stroke-width="${OUTLINE_STROKE}"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${scale})"><path d="${glyphPath}" fill="#${colorHex}"/></g>` +
    `</svg>`
  );
}

async function renderIconPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Değişmezlik: var olan dosya asla yeniden yazılmaz. 'wx' + EEXIST-atla,
 * storage.ts'teki content-hash dosyalarıyla aynı disiplin — ama ikonlar
 * deterministik üretildiği için EEXIST çakışma değil dedup'tır.
 * Dönüş: dosya gerçekten yazıldı mı.
 */
async function writeIconFile(dir: string, filename: string, buf: Buffer): Promise<boolean> {
  await mkdir(dir, { recursive: true });
  try {
    await writeFile(join(dir, filename), buf, { flag: 'wx' });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** filled statik seti (platform resmi renkleri). Deploy adımı, elle koşulur. */
export async function generateStaticIcons(
  cdnWritePath: string,
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  const dir = join(cdnWritePath, 'icons', 'filled');
  for (const platform of ICON_PLATFORMS) {
    const icon = ICONS[platform];
    if (await fileExists(join(dir, `${platform}.png`))) {
      skipped += 1;
      continue;
    }
    const wrote = await writeIconFile(
      dir,
      `${platform}.png`,
      await renderIconPng(svgFilled(icon.path, icon.hex.toLowerCase())),
    );
    if (wrote) written += 1;
    else skipped += 1;
  }
  return { written, skipped };
}

/**
 * Kullanıcının brandColor'ı için outline + mono setleri (16 dosya).
 *
 * İkisi BİRLİKTE üretilir: kullanıcı stiller arasında gezinirken yeni istek
 * atılmasın, builder'da tek "hazır mı" durumu olsun.
 *
 * Renk ASLA değiştirilmez (spec 2026-07-27). `lowContrast` yalnız bilgi
 * amaçlıdır; renkten deterministik hesaplandığı için dedup yolunda da doğrudur.
 */
export async function generateColoredIcons(
  cdnWritePath: string,
  color: string,
): Promise<{ lowContrast: boolean }> {
  const hex6 = normalizeHex(color).slice(1);
  const lowContrast = contrastRatio(`#${hex6}`, '#ffffff') < LOW_CONTRAST_ON_WHITE;

  const variants: Array<{ dir: string; svg: (p: string) => string }> = [
    { dir: join(cdnWritePath, 'icons', `outline-${hex6}`), svg: (p) => svgOutline(p, hex6) },
    { dir: join(cdnWritePath, 'icons', `mono-${hex6}`), svg: (p) => svgGlyph(p, hex6) },
  ];

  for (const variant of variants) {
    for (const platform of ICON_PLATFORMS) {
      if (await fileExists(join(variant.dir, `${platform}.png`))) continue;
      await writeIconFile(
        variant.dir,
        `${platform}.png`,
        await renderIconPng(variant.svg(ICONS[platform].path)),
      );
    }
  }
  return { lowContrast };
}

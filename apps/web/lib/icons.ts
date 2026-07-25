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

/** Açık marka renginde mono glifin düşürüldüğü koyu gri (spec §3b). */
export const DEGRADED_GLYPH_HEX = '666666';
const DEGRADE_MIN_CONTRAST_ON_WHITE = 3;

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

/** filled + outline statik setleri. Deploy prosedürünün parçası (elle koşulur). */
export async function generateStaticIcons(
  cdnWritePath: string,
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  for (const platform of ICON_PLATFORMS) {
    const icon = ICONS[platform];
    const brandHex = icon.hex.toLowerCase();
    const jobs: Array<{ dir: string; svg: string }> = [
      { dir: join(cdnWritePath, 'icons', 'filled'), svg: svgFilled(icon.path, brandHex) },
      { dir: join(cdnWritePath, 'icons', 'outline'), svg: svgGlyph(icon.path, brandHex) },
    ];
    for (const job of jobs) {
      const target = join(job.dir, `${platform}.png`);
      if (await fileExists(target)) {
        skipped += 1;
        continue;
      }
      const wrote = await writeIconFile(job.dir, `${platform}.png`, await renderIconPng(job.svg));
      if (wrote) written += 1;
      else skipped += 1;
    }
  }
  return { written, skipped };
}

/**
 * Kullanıcı brandColor'ı ile 8 mono ikon. Beyaza karşı kontrast < 3 ise glif
 * #666666'ya düşürülür ama YOL orijinal hex'te kalır (URL deterministik).
 * Tüm dosyalar zaten varsa üretim atlanır (dedup) — degraded bayrağı renkten
 * deterministik hesaplandığı için dedup yolunda da doğru döner.
 */
export async function generateMonoIcons(
  cdnWritePath: string,
  color: string,
): Promise<{ degraded: boolean }> {
  const hex6 = normalizeHex(color).slice(1);
  const degraded = contrastRatio(`#${hex6}`, '#ffffff') < DEGRADE_MIN_CONTRAST_ON_WHITE;
  const glyphHex = degraded ? DEGRADED_GLYPH_HEX : hex6;
  const dir = join(cdnWritePath, 'icons', `mono-${hex6}`);

  const allExist = (
    await Promise.all(ICON_PLATFORMS.map((p) => fileExists(join(dir, `${p}.png`))))
  ).every(Boolean);
  if (allExist) return { degraded };

  for (const platform of ICON_PLATFORMS) {
    if (await fileExists(join(dir, `${platform}.png`))) continue;
    await writeIconFile(
      dir,
      `${platform}.png`,
      await renderIconPng(svgGlyph(ICONS[platform].path, glyphHex)),
    );
  }
  return { degraded };
}

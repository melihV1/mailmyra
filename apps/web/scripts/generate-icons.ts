import { generateStaticIcons } from '../lib/icons';

async function main(): Promise<void> {
  const dir = process.env.CDN_WRITE_PATH;
  if (!dir) {
    console.error('CDN_WRITE_PATH tanımlı değil.');
    process.exit(1);
  }
  const res = await generateStaticIcons(dir);
  console.log(`icons: ${res.written} yazıldı, ${res.skipped} atlandı (mevcut).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Panel dostu build + TAM log — `npm run build:log`
//
// Plesk paneli konsol çıktısını kırpar; asıl bilgi (yığın izinin alt satırları)
// kaybolur. Bu script build'i çalıştırır ve TÜM çıktıyı repo kökündeki
// `build.log` dosyasına yazar — dosya yöneticisiyle açıp tamamını okuyabilir
// veya olduğu gibi paylaşabilirsin.
//
// Ayrıca teşhis için iki ayar açar:
//   --stack-trace-limit=100  -> yığın izi 10 kareyle kesilmez
//   --enable-source-maps     -> .next içindeki derlenmiş dosyalar yerine
//                               gerçek kaynak konumları görünür
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const logPath = path.join(repoRoot, 'build.log');

const out = fs.createWriteStream(logPath, { flags: 'w' });
const header = [
  `# mailmyra build log`,
  `# node       ${process.version}`,
  `# platform   ${process.platform} ${process.arch}`,
  `# cwd        ${repoRoot}`,
  `# başlangıç  ${new Date().toISOString()}`,
  '',
  '',
].join('\n');
out.write(header);
process.stdout.write(header);

const child = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'build', '-w', 'apps/web'],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --stack-trace-limit=100 --enable-source-maps`.trim(),
      // Next'in kendi ayrıntılı çıktısı
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  },
);

function pipe(stream, label) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    out.write(text);
    process.stdout.write(text);
  });
  stream.on('error', (err) => {
    const text = `\n[${label} stream hatası] ${err.message}\n`;
    out.write(text);
    process.stdout.write(text);
  });
}

pipe(child.stdout, 'stdout');
pipe(child.stderr, 'stderr');

child.on('close', (code) => {
  const footer = [
    '',
    '',
    `# bitiş      ${new Date().toISOString()}`,
    `# çıkış kodu ${code}`,
    '',
  ].join('\n');
  out.end(footer);
  process.stdout.write(footer);
  process.stdout.write(
    `\nTAM LOG YAZILDI: ${logPath}\n` +
      'Dosya yöneticisinde aç, içeriğin TAMAMINI paylaş (özellikle "at ..." satırları).\n',
  );
  process.exitCode = code ?? 1;
});

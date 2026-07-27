// iisnode TEŞHİS dosyası — Next'ten tamamen bağımsız.
//
// https://<site>/hello.js adresini aç:
//
//   Sayfa geliyorsa  -> iisnode + node.exe ÇALIŞIYOR. Sorun Next uygulamasında
//                       (server.js / .next / .env.local tarafında) demektir.
//   500 geliyorsa    -> iisnode node sürecini hiç başlatamıyor. Sebep genelde
//                       web.config'deki nodeProcessCommandLine (boşluklu yol
//                       tırnaksızsa süreç doğmaz) ya da klasör yazma izni.
//
// PORT'u iisnode named pipe olarak verir (TCP portu değil) — bu yüzden
// process.env.PORT'a olduğu gibi listen ediyoruz, sayıya çevirmiyoruz.
const http = require('http');

http
  .createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(
      [
        'iisnode CALISIYOR',
        '',
        `node        ${process.version}`,
        `platform    ${process.platform} ${process.arch}`,
        `cwd         ${process.cwd()}`,
        `__dirname   ${__dirname}`,
        `NODE_ENV    ${process.env.NODE_ENV}`,
        `PORT        ${process.env.PORT}`,
        '',
        '.env.local okundu mu (Next yükler, bu dosya yüklemez):',
        `CDN_PUBLIC_URL   ${process.env.CDN_PUBLIC_URL ?? '(bu süreçte tanımsız — normal)'}`,
        '',
        'Bu sayfa geliyorsa iisnode saglikli; sorun Next tarafinda.',
      ].join('\n'),
    );
  })
  .listen(process.env.PORT || 3000);

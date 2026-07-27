// iisnode giriş noktası (Windows/IIS deploy). `next start` yerine bu dosya
// çalışır: iisnode PORT'a bir named pipe (string) verir, Next'in kendi CLI'ı
// bunu kabul etmediği için http sunucusunu kendimiz kurarız.
// Yerel geliştirmede KULLANILMAZ (dev akışı: npm run dev -w apps/web).
const http = require('http');
const next = require('next');

const port = process.env.PORT || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, () => {
        console.log(`mailmyra web ready on ${port}`);
      });
  })
  .catch((err) => {
    console.error('next prepare failed:', err);
    process.exit(1);
  });

/**
 * Kurulum rehberlerinin "adım 01" karesini çeker: builder, demo imzasıyla
 * dolu, sağda "Copy signature" düğmesi görünür.
 *
 * Neden Chrome'u elle sürüyoruz: projede playwright/puppeteer bağımlılığı
 * YOK ve 30 karelik bir iş için 150MB'lık tarayıcı indirmesi eklemek doğru
 * değil. Node 24'ün global `WebSocket`i + Chrome'un CDP'si yetiyor,
 * sıfır bağımlılık.
 *
 * Kullanım:
 *   node shoot-builder.mjs <çıktı-klasörü>
 *
 * Demo verisi BİLEREK nötr: `.example` alan adı RFC 2606 ile bu iş için
 * ayrılmış, kimseye ait olamaz. 6 istemci testindeki imzalar gerçek adres
 * ve telefon taşıyor — halka açık sayfaya onlar KONULMAZ.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const OUT_DIR = process.argv[2];
if (!OUT_DIR) {
  console.error('Kullanım: node shoot-builder.mjs <çıktı-klasörü>');
  process.exit(1);
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_ = 'https://app.mailmyra.com/builder';
const PORT = 9333;
const WIDTH = 1440;
const HEIGHT = 900;
/* 2x: rehber sayfası görselleri küçülterek gösteriyor, retina ekranda
   bulanıklaşmasın (aynı kural imzaların kendi görsellerinde de var). */
const SCALE = 2;

/** Aynı kare dört rehbere de giriyor — adım 01 hepsinde aynı ekran. */
const TARGETS = [
  'outlook-classic-step-01.png',
  'outlook-new-step-01.png',
  'gmail-step-01.png',
  'apple-mail-step-01.png',
];

const FIELDS = [
  ['Full name', 'Alex Morgan'],
  ['Job title', 'Brand Director'],
  ['Department', 'Brand Studio'],
  ['Company', 'Northwind Studio'],
  ['E-mail', 'alex@northwind.example'],
  ['Phone', '+1 555 0142'],
  ['Mobile', '+1 555 0188'],
  ['Website', 'https://northwind.example'],
  ['Address', '18 Harbour Row, Bristol BS1 4RN'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      const p = this.pending.get(msg.id);
      if (p) {
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP zaman aşımı: ${method}`));
      }, 30_000);
    });
  }
}

/* React kontrollü input'a `el.value = x` yazmak YETMEZ — React kendi
   izlediği değeri güncellemez ve bir sonraki render'da yazdığını siler.
   Native setter + `input` olayı, React'in dinlediği yol. */
const FILL_FN = `
(fields) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const controls = [...document.querySelectorAll('.form-control')];
  const missing = [];
  for (const [label, value] of fields) {
    const el = controls.find((c) => {
      const grp = c.closest('[class*=col]') || c.parentElement;
      const lab = grp && grp.querySelector('label');
      return lab && lab.textContent.trim().replace(/\\s*\\*$/, '') === label;
    });
    if (!el) { missing.push(label); continue; }
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return missing;
}`;

async function main() {
  const userDataDir = path.join(os.tmpdir(), `mm-shoot-${process.pid}`);
  await mkdir(OUT_DIR, { recursive: true });

  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    URL_,
  ], { stdio: 'ignore' });

  try {
    // CDP portunun açılmasını bekle.
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try { targets = await cdpTargets(); if (targets.length) break; } catch { /* henüz yok */ }
      await sleep(250);
    }
    if (!targets?.length) throw new Error('Chrome CDP portu açılmadı.');

    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    const cdp = new Cdp(ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false,
    });

    // Sayfa zaten yükleniyordu; formun basılmasını bekle.
    for (let i = 0; i < 40; i++) {
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: `document.querySelectorAll('.form-control').length`,
        returnByValue: true,
      });
      if (result.value >= 9) break;
      await sleep(250);
    }

    const { result: fillRes } = await cdp.send('Runtime.callFunctionOn', {
      functionDeclaration: FILL_FN,
      executionContextId: undefined,
      arguments: [{ value: FIELDS }],
      returnByValue: true,
      objectGroup: 'shoot',
    }).catch(async () => {
      // callFunctionOn executionContext ister; basit yol: evaluate ile sar.
      return cdp.send('Runtime.evaluate', {
        expression: `(${FILL_FN})(${JSON.stringify(FIELDS)})`,
        returnByValue: true,
      });
    });

    if (fillRes?.value?.length) {
      throw new Error(`Doldurulamayan alanlar: ${fillRes.value.join(', ')}`);
    }

    // Önizleme iframe'inin imzayı çizmesini bekle.
    let drew = false;
    for (let i = 0; i < 40; i++) {
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: `(() => { const f = document.querySelector('iframe');
          if (!f || !f.contentDocument) return false;
          return /Alex Morgan/.test(f.contentDocument.body.textContent || ''); })()`,
        returnByValue: true,
      });
      if (result.value) { drew = true; break; }
      await sleep(250);
    }
    if (!drew) throw new Error('Önizlemede imza görünmedi — kare çekilmedi.');

    // Animasyonlar otursun.
    await sleep(800);

    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const buf = Buffer.from(shot.data, 'base64');

    for (const name of TARGETS) {
      const file = path.join(OUT_DIR, name);
      await writeFile(file, buf);
      console.log(`  ${name}  ${(buf.length / 1024).toFixed(0)} KB`);
    }
    console.log(`\n${TARGETS.length} kare yazıldı -> ${OUT_DIR}`);
    ws.close();
  } finally {
    chrome.kill();
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`\nHATA: ${err.message}`);
  process.exitCode = 1;
});

# SMTP/CDN Sağlık Probu — Tasarım

Tarih: 2026-08-21 · Onay: Hüseyin (sohbet) · Durum: onaylı

## Amaç

Platform → Services ekranında dürüstçe `unknown` duran SMTP ve CDN
satırlarını gerçek ölçüme bağlamak. Yaklaşım: **sayfa yüklenirken canlı
prob** (DB ping emsali) — arka plan işi/tablo yok (YAGNI), UI değişmez
(ekran `operational/degraded/outage/unknown` durumlarını zaten çizer).

## Modül: `apps/web/lib/reports`ten bağımsız — `apps/web/lib/health-probes.ts`

```ts
interface ProbeResult {
  state: 'operational' | 'degraded' | 'outage' | 'unknown';
  latencyMs: number | null;
  detail: string | null; // UI kullanmıyor; test/teşhis için
}

probeSmtp(env = process.env, timeoutMs = 3000, deps?): Promise<ProbeResult>
probeCdn(url = process.env.CDN_PUBLIC_URL, timeoutMs = 3000, deps?): Promise<ProbeResult>
```

- **probeSmtp:** `readSmtpConfig` ile ayar okunur; yapılandırılmamışsa
  `unknown` (ağa hiç çıkılmaz — CI güvenliği). Yapılandırılmışsa nodemailer
  `verify()` (bağlan + EHLO) süresi ölçülür: başarı = `operational` +
  gecikme; hata = `outage` + kısa sebep; zaman aşımı = `outage`/`timeout`.
  Transport seçenekleri smtp.ts'ten paylaşılır (`smtpTransportOptions`
  export'u — kendinden imzalı TLS istisnası dahil tek kaynak).
- **probeCdn:** URL yoksa `unknown`. Varsa `GET` (no-store,
  `AbortSignal.timeout`): herhangi bir HTTP yanıtı `<500` = `operational`
  (vhost servis veriyor; 403/404 de kanıttır), `5xx` = `degraded`, ağ
  hatası/zaman aşımı = `outage`.
- `deps` enjeksiyonu (verify/fetch) yalnız test için; üretim varsayılanları
  gerçek.

## Bağlama

`getPlatformTelemetry` (admin.ts) iki probu DB ping ile paralel koşar;
smtp/cdn satırları sonuçla dolar, `checkedAt` = probe koşulduysa şimdi,
`unknown`sa null. `uptime` **null kalır** — tarihçe defteri yok, uydurma
yüzde yazılmaz. Baş yorumdaki "SMTP/CDN probu yok" notu güncellenir.

## Bilinen risk (bilinçli kabul)

CDN probu sunucunun KENDİ public adresine istek atar; Windows hairpin-NAT
engellerse canlıda `outage` görünür ama CDN dışarıdan sağlamdır. Öyle
çıkarsa prob içeriden (loopback + Host başlığı) çözülür — v1 basit.

## Test planı

`test/health-probes.test.ts` — sahte verify/fetch ile: yapılandırmasız →
`unknown` (verify hiç çağrılmaz) · başarı → `operational` + latency ·
hata → `outage` + sebep · zaman aşımı → `outage`/`timeout` · CDN 200 →
`operational`, 503 → `degraded`, ağ hatası → `outage`, URL yok → `unknown`.
Bağlama için ayrı repo testi yok: prob birim testli, bağlama 6 satır,
kapı enumeration testinde.

## Kapsam dışı

Uptime yüzdesi · prob tarihçesi/tablosu · UI değişikliği · "şimdi yokla"
düğmesi · alarm (Plesk görev bildirimi zaten var).

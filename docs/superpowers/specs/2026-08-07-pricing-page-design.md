# Pricing sayfası — tasarım kararı

Tarih: 2026-08-07 · Karar sahibi: Hüseyin · Yazan: Claude

## Amaç

`/pricing` sayfasını kurmak. Sitenin en yüksek niyetli sayfası; ajans/kurumsal alıcı
kararı burada veriyor. Sayfa bugün 404 ama mega-menü ona dört ayrı linkle gidiyor.

Sayfanın 1 numaralı işi **"ucuzu satmak" değil** — `$1` fiyatının uyandırdığı
"bir bit yeniği var" refleksini çürütmek. Alıcının üç sorusu: ciddi bir ürün mü ·
yarın kapanır mı · görünmeyen maliyet var mı. Her bölüm bunlardan birine cevap verir.

## Model çatallanması ve çözümü

İşin zor kısmı sayfa değil, modeli tekilleştirmekti. Üç yerde üç fiyat yaşıyordu:

| Kaynak | Model |
|---|---|
| `CLAUDE.md` | Pro $5/ay · Team $1/koltuk/**ay** min 5 · Business $0.83/$0.75 |
| Mega-menü (9 sayfada canlı) | Aynısı, kelimesi kelimesine |
| `~/Downloads` içindeki 4 brief | `$1/aktif gönderici/**yıl**`, min 1, tek plan + Free |

Menüye dokunmadan brief'in sayfasını kurmak, **sayfanın kendi header'ının gövdesini
yalanlaması** demekti (menüde "$1 per seat/mo", gövdede "$1/year"). Bu yüzden iş
üç parçalı: sayfa + menü senkronu + anayasa senkronu.

### Kilitlenen kararlar (Hüseyin, 2026-08-07)

1. **`$1 / aktif gönderici / yıl`**, min 1, yalnız yıllık, 7 gün kartsız tam deneme.
2. **Free plan YOK.** CLAUDE.md'nin 2026-07-24 kararı geçerli; brief'lerdeki Free
   yok sayıldı. Tek kart, tek fiyat — "önce dene" işini deneme görüyor.
   `EXPORT_REQUIRES_AUTH` politikasına dokunulmadı.
3. **Uyumluluk dili kanıt iddiası DEĞİL, yapım gerçeği.** Test matrisi koşulmadığı
   için "verified/tested" yasak. Yerine: *"Built for Outlook, Gmail & Apple Mail"* +
   *"Table-based, inline CSS — written against Outlook's Word engine."*
   Matris geçilince "verified"e yükseltilir.
4. **Dil İngilizce** — diğer 9 sayfayla tutarlı. Brief §13'ün TR gövdesi ve EN/TR
   çift dil mimarisi kapsam dışı.

### Claude'un kararları (tek satırla döner)

- **`LAUNCH_OFFER["active"] = False` ile çıkılıyor.** Kutu kurulu ve çalışır durumda
  ama kapalı. Gerekçe: "tek kart, tek fiyat" mesaj sadeliği seçildi; Team Launch 10
  ikinci bir para nesnesi koyup onu bulandırır.
- **USD + "Taxes calculated at invoice".** TL dönüşümü yok.
- **Hesaplayıcı** 1000'de clamp, **500+**'ta "Talk to us" satırı.
- **Bölüm sınıfı `.mm-tariff`** — planda `.mm-pr` yazıyordu, değiştirildi: `mm-pr`
  alt dizge olarak `mm-proof`/`mm-process`'e takılıyor (367 eşleşme) ve ileriki
  grep'leri güvenilmez kılıyor. `mm-tariff` CSS'te ve HTML'de 0.

## Sayfa

**Dosya `pricing.html` → `/pricing`.** Kabuk `works-with.html`'den satır aralığı +
assert ile dilinir (`faq.html` ile aynı yöntem): `head = 1..622`, `tail = 1128..son`.
Hero/header/footer/preloader değişmez.

| # | Bölüm | Zemin | İşi |
|---|---|---|---|
| 1 | Hero (kabuk) | koyu | "One price. Every way you work." |
| 2 | `__trust` — 3 madde | kâğıt | 7-day full trial · No card required · Email never routed through us |
| 3 | `__plan` — **tek kart** | kâğıt | $1 · per active sender · per year · all features · CTA |
| 4 | `__calc` — hesaplayıcı | kâğıt | per-seat mantığını elle oynatarak anlat |
| 5 | `__seat` — "What is a seat?" | kâğıt | ajansın mercek altına aldığı tanım + 4 örnek |
| 6 | `__modes` — Pro/Team/Agency | kâğıt | "hangi paket bana uyar" kaygısını yok et |
| 7 | `__why` — "Why only $1?" | **koyu slab** | fiyatı indirime değil ürün mimarisine bağla |
| 8 | `__built` — Built-for bandı | kâğıt | yetkinlik, kanıt iddiası olmadan |
| 9 | `__faq` — 7 soru | kâğıt | şüphe ağacının kalanını kapat |
| 10 | `__cta` — kapanış | **koyu slab** | Builder + Contact. **Checkout YOK.** |

Ritim FAQ'la aynı mantık: uzun okuma kâğıt, iki koyu ada vurgu için. Koyu slab
reçetesi index `.mm-proof` (72px ızgara + `135deg #050914→#071120→#100a1d` + mavi hale).
Kart dili kilitli reçete; **fiyat kartında dönen conic kenar sürekli açık** — sayfanın
kahraman nesnesi o.

## Config sözleşmesi

Brief §12 `config/pricing.ts` istiyor; o Next kavramı, pazarlama sitesi statik HTML.
Karşılığı **build script'indeki Python sabitleri = tek kaynak**:

```python
PRICE_PER_SEAT_YEAR_CENTS = 100
CURRENCY = "USD"; MIN_SEATS = 1; MAX_SEATS_UI = 1000
CONTACT_ABOVE = 500; TRIAL_DAYS = 7
LAUNCH_OFFER = {"active": False, "seats": 10,
                "first_year_cents": 800, "renew_cents": 1000}
```

Script bunları **iki yere birden** yazar:
1. **HTML'e** — JS kapalıyken de fiyat görünmeli (SEO + erişilebilirlik).
   Brief bunu düşünmemiş; şart.
2. **`MM_PRICING` JS objesine** — hesaplayıcı oradan okur.

`active=False` iken teklif kutusu HTML'e **hiç yazılmaz** (gizlenmez, yok).

## Hesaplayıcı

`seats × PRICE_PER_SEAT_YEAR_CENTS`, kademe/çarpan yok. `<input type="number">` +
−/+ butonları, tamamı klavyeyle. Toplam `aria-live="polite"`. Boş/0/negatif/harf →
1'e sabitle, **hata gösterme**. 1000 üstü clamp; `>=500` iken kurumsal kapı satırı.
Tekil/çoğul. `$` + tam sayı. **Teklif kutusuna bağlanmaz** (eşik mantığı motor işi).

## Dürüstlük kuralları (bağlayıcı)

- "verified · tested · cheap · bargain · kelepir" **geçmez**.
- Sahte kıtlık, geri sayım, sahte logo/sertifika/yorum **yok**.
- Yenileme fiyatı ödemeden önce görünür.
- Fiyat, indirim olarak değil **sade ürün mimarisinin sonucu** olarak sunulur.

## Yan senkronlar (atlanamaz)

**Menü** — 9 dosyada iki yerde (masaüstü `mm-mega` + mobil `mmnav__mega`):
Pro/Team/Business satırları yeni modelle değişir, `#business` → `#agency`,
`agencies.html` (404) → `contact.html`.

**FAQ** — `/faq`'ın 05 "Teams, plans & billing" kategorisi eski modele göre yazıldı
ve artık yanlış (min 5 koltuk · aylık · kademeli fiyat · ayrı ajans planı).
`build-faq-page.py` içindeki `CATEGORIES[4]` yeniden yazılır.

**CLAUDE.md** — fiyat tablosu yeni modelle değişir; "ücretsiz plan yok" kararı
**aynen kalır**, bu tur onu doğruluyor.

## Doğrulama

- 1440 · 1199 · 992 · 768 · 390: yatay taşma 0, konsol temiz (her genişlikte reload).
- Hesaplayıcı: klavye, `aria-live`, sınır durumları (boş/0/negatif/harf/1001/500).
- **JS kapalı:** fiyat ve kart metinleri hâlâ görünüyor.
- `LAUNCH_OFFER.active` True ve False ile ayrı ayrı üretilip kontrol edilir.
- Menü 9 sayfada güncel, `agencies.html` linki kalmadı.
- FAQ 05 yeni modelle tutarlı, JSON-LD geçerli.
- `design:accessibility-review` sayfa ayaktayken koşulur (AA kontrast, klavye,
  rozet semantiği).

## Açık kalanlar

- **Ticari risk (bir kez kayda geçiyor):** $1/koltuk/yıl'da 200 koltukluk kurumsal
  müşteri yılda $200 ödüyor; eski modelde ~$1.800. Ayrıca "ilk 10 müşteri manuel
  faturalanacak" kararı $8'lık siparişle çelişiyor — fatura kesmek satıştan pahalı.
  v3 bunu "kârdan önce pazar payı" diye bilinçli seçmiş; karar Hüseyin'in.
- Menüde hâlâ 5 ölü link kalıyor: `agencies.html`, `templates-teams.html`,
  `templates-agencies.html`, `business.html`, `builder.html`.
- Checkout yok; ücretli akış `contact.html`'e gidiyor.

# Apple Mail kurulum görselleri — uygulama planı

> **Ajan çalışanlar için:** ZORUNLU ALT BECERİ: `superpowers:subagent-driven-development`
> ya da `superpowers:executing-plans`. Adımlar checkbox (`- [ ]`) taşır.
>
> 🔴 **Task 2 DELEGE EDİLEMEZ.** Ekran yakalama izni oturuma verilir, alt ajanlara
> geçmez; ayrıca Mail'in arayüzünü sürmek ve kadrajı değerlendirmek etkileşimli bir
> iştir. Task 1 ve Task 3 subagent'a verilebilir, Task 2 kontrolörün kendi işidir.

**Amaç:** `setup-apple-mail.html`'in altı ekran görüntüsünü üretip sayfaya bağlamak.

**Mimari:** Yakalama `screencapture` ile; kapatma/vurgulama/yeniden kodlama saf
Python bir modülle (bu makinede görsel işleme aracı kurulu değil ve kurulmayacak);
sayfa tarafında `aspect-ratio` kuralı silinmeden bir modifier sınıfıyla geçersiz
kılınır.

**Teknoloji:** Python 3 (`zlib`, `struct` — stdlib), `screencapture` (macOS), statik HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-09-16-kurulum-gorselleri-design.md` (bu depoda)

## Global kısıtlar

- ⚠️ **Uygulama pazarlama sitesi deposunda:** `~/Desktop/mailmyra edit`
  (remote `mailmyra-site`). Yol BOŞLUK içerir — her komutta tırnakla.
  Bu plan ve spec uygulama deposunda durur, oraya KOPYALANMAZ.
- `main.css` baştan üretilmez, **yalnız sonuna eklenir**. Yerinde düzenleme YOK.
- `scripts/build-pricing-page.py` ve diğer üreteçler KOŞULMAZ.
- Python modülü **scratchpad'e** yazılır, site deposuna değil — üretim aracıdır,
  yayın setine girmez.
- Yeni bağımlılık YOK. `pngquant`/`optipng`/ImageMagick kurulu değil (ölçüldü).
- Görsel başına **300KB tavan**; aşılırsa rapor et, sessizce geçme.
- `alt` metni görselin GERÇEKTEN gösterdiği şeyi anlatır — bu sitenin
  `scripts/audit.mjs`'i doğruluk kapısıdır.
- Çıkış kodunu `| grep`/`| tail` ile maskeleme.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `<scratchpad>/shotkit.py` | **yeni** — PNG çöz/kodla + blok + vurgu çerçevesi |
| `<scratchpad>/test_shotkit.py` | **yeni** — modülün testleri |
| `~/Desktop/mailmyra edit/assets/img/setup/apple-mail-*.png` | 6 görsel (Task 2) |
| `~/Desktop/mailmyra edit/assets/css/main.css` | sona tek kural (Task 3) |
| `~/Desktop/mailmyra edit/setup-apple-mail.html` | 6 figür (Task 3) |

---

## Task 1: `shotkit.py` — PNG düzenleme modülü

**Dosyalar:**
- Oluştur: `<scratchpad>/shotkit.py`
- Test: `<scratchpad>/test_shotkit.py`

**Arayüzler:**
- Tüketir: yok (ilk görev)
- Üretir:
  - `load_png(path) -> (w:int, h:int, ch:int, px:bytearray)` — `ch` 3 (RGB) veya 4 (RGBA); `px` satır satır, filtresiz.
  - `save_png(path, w, h, ch, px) -> int` (yazılan bayt)
  - `fill_rect(px, w, h, ch, x, y, rw, rh, rgb:tuple) -> None` — yerinde boyar
  - `stroke_round_rect(px, w, h, ch, x, y, rw, rh, radius, thickness, rgb) -> None` — yerinde çizer, kenarlar yumuşatılmış

- [ ] **Adım 1: Başarısız testi yaz**

`<scratchpad>/test_shotkit.py`:

```python
import os, sys, zlib, struct, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shotkit import load_png, save_png, fill_rect, stroke_round_rect

def _synth(path, w, h, ch, filt):
    """Bilinen icerikli bir PNG uret — her satir farkli bir FILTRE kullansin,
    cozucunun bes filtreyi de dogru uyguladigini sinayabilelim."""
    def pix(x, y):
        return (x % 256, y % 256, (x + y) % 256, 255)[:ch]
    raw = b''
    prev = bytearray(w * ch)
    for y in range(h):
        line = bytearray()
        for x in range(w):
            line += bytes(pix(x, y))
        f = filt(y)
        enc = bytearray(line)
        if f == 1:
            for i in range(len(line) - 1, ch - 1, -1):
                enc[i] = (line[i] - line[i - ch]) & 255
        elif f == 2:
            for i in range(len(line)):
                enc[i] = (line[i] - prev[i]) & 255
        elif f == 3:
            for i in range(len(line)):
                a = line[i - ch] if i >= ch else 0
                enc[i] = (line[i] - ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(len(line)):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                enc[i] = (line[i] - pr) & 255
        raw += bytes([f]) + bytes(enc)
        prev = line
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ct = 2 if ch == 3 else 6
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, ct, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b''))

def _get(px, w, ch, x, y):
    i = (y * w + x) * ch
    return tuple(px[i:i + 3])

def test_decodes_all_five_filters():
    # DIKKAT: tek filtreyle sinamak yetmez — cozucu yalnizca filtre 0'i dogru
    # uygulayip digerlerini bozsa da o test gecerdi.
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'a.png')
        _synth(p, 23, 17, 4, lambda y: y % 5)
        w, h, ch, px = load_png(p)
        assert (w, h, ch) == (23, 17, 4)
        for y in range(h):
            for x in range(w):
                assert _get(px, w, ch, x, y) == (x % 256, y % 256, (x + y) % 256), (x, y)

def test_round_trips_rgb_and_rgba():
    with tempfile.TemporaryDirectory() as d:
        for ch in (3, 4):
            p = os.path.join(d, f'{ch}.png')
            q = os.path.join(d, f'{ch}-out.png')
            _synth(p, 9, 7, ch, lambda y: 0)
            w, h, c, px = load_png(p)
            save_png(q, w, h, c, px)
            w2, h2, c2, px2 = load_png(q)
            assert (w2, h2, c2) == (w, h, c)
            assert px2 == px

def test_fill_rect_paints_only_inside():
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'a.png')
        _synth(p, 20, 20, 4, lambda y: 0)
        w, h, ch, px = load_png(p)
        before_outside = _get(px, w, ch, 2, 2)
        fill_rect(px, w, h, ch, 5, 5, 4, 4, (7, 8, 9))
        assert _get(px, w, ch, 5, 5) == (7, 8, 9)
        assert _get(px, w, ch, 8, 8) == (7, 8, 9)
        # Sinirin BIR DISI bozulmamali — off-by-one'i yakalar.
        assert _get(px, w, ch, 9, 8) != (7, 8, 9)
        assert _get(px, w, ch, 4, 5) != (7, 8, 9)
        assert _get(px, w, ch, 2, 2) == before_outside

def test_fill_rect_clips_at_edges():
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'a.png')
        _synth(p, 10, 10, 3, lambda y: 0)
        w, h, ch, px = load_png(p)
        fill_rect(px, w, h, ch, 8, 8, 50, 50, (1, 2, 3))   # tasar
        fill_rect(px, w, h, ch, -5, -5, 7, 7, (4, 5, 6))   # negatif
        assert _get(px, w, ch, 9, 9) == (1, 2, 3)
        assert _get(px, w, ch, 0, 0) == (4, 5, 6)

def test_stroke_draws_border_and_leaves_interior():
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'a.png')
        _synth(p, 40, 40, 4, lambda y: 0)
        w, h, ch, px = load_png(p)
        mid = _get(px, w, ch, 20, 20)
        stroke_round_rect(px, w, h, ch, 10, 10, 20, 20, radius=4, thickness=2, rgb=(200, 30, 40))
        # Ust kenarin ortasi cizilmeli
        assert _get(px, w, ch, 20, 10) == (200, 30, 40)
        # Ic bolge DOKUNULMAMIS olmali — dolu dikdortgen cizen bir hata bunu yakalar
        assert _get(px, w, ch, 20, 20) == mid
        # Kose, yaricap yuzunden cizgiden UZAK olmali
        assert _get(px, w, ch, 10, 10) != (200, 30, 40)
```

- [ ] **Adım 2: Testi koş, başarısız olduğunu gör**

```bash
cd "<scratchpad>" && python3 -m pytest test_shotkit.py -q
```
Beklenen: FAIL — `shotkit` modülü yok. (pytest yoksa: `python3 -c "import test_shotkit as t; [getattr(t,n)() for n in dir(t) if n.startswith('test_')]; print('OK')"`)

- [ ] **Adım 3: Modülü yaz**

`<scratchpad>/shotkit.py`:

```python
"""Ekran goruntusu duzenleme — saf stdlib.

Bu makinede pngquant/optipng/ImageMagick KURULU DEGIL ve yeni bagimlilik
kurulmayacak (spec Karar 5), o yuzden PNG cozme/kodlama elle yapiliyor.
Kapsam bilerek dar: bit derinligi 8, renk tipi 2 (RGB) veya 6 (RGBA),
interlace yok — `screencapture`in urettigi sey bu. Baska bir sey gelirse
SESSIZCE yanlis is yapmak yerine hata veriyoruz.
"""
import struct
import zlib

_SIG = b'\x89PNG\r\n\x1a\n'


def load_png(path):
    data = open(path, 'rb').read()
    if data[:8] != _SIG:
        raise ValueError(f'{path}: PNG degil')
    pos, idat, ihdr = 8, [], None
    while pos + 8 <= len(data):
        (ln,) = struct.unpack('>I', data[pos:pos + 4])
        typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            ihdr = struct.unpack('>IIBBBBB', body)
        elif typ == b'IDAT':
            idat.append(body)
        elif typ == b'IEND':
            break
        pos += 12 + ln
    if ihdr is None:
        raise ValueError(f'{path}: IHDR yok')
    w, h, depth, ctype, _comp, _filt, interlace = ihdr
    if depth != 8 or ctype not in (2, 6) or interlace != 0:
        raise ValueError(
            f'{path}: desteklenmeyen PNG (depth={depth} ctype={ctype} '
            f'interlace={interlace}); bu modul 8-bit RGB/RGBA, interlace yok bekler')
    ch = 3 if ctype == 2 else 4
    raw = zlib.decompress(b''.join(idat))
    stride = w * ch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    i = 0
    for y in range(h):
        f = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        if f == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x - ch]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        elif f != 0:
            raise ValueError(f'{path}: bilinmeyen satir filtresi {f}')
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, out


def save_png(path, w, h, ch, px):
    stride = w * ch
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filtre 0 — zlib zaten sikistiriyor, filtre aramaya deger yok
        raw += px[y * stride:(y + 1) * stride]

    def chunk(typ, body):
        c = typ + body
        return struct.pack('>I', len(body)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ctype = 2 if ch == 3 else 6
    blob = (_SIG
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, ctype, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
            + chunk(b'IEND', b''))
    open(path, 'wb').write(blob)
    return len(blob)


def _clip(x, y, rw, rh, w, h):
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(w, x + rw), min(h, y + rh)
    return x0, y0, x1, y1


def fill_rect(px, w, h, ch, x, y, rw, rh, rgb):
    x0, y0, x1, y1 = _clip(x, y, rw, rh, w, h)
    r, g, b = rgb
    for yy in range(y0, y1):
        base = (yy * w + x0) * ch
        for xx in range(x1 - x0):
            i = base + xx * ch
            px[i], px[i + 1], px[i + 2] = r, g, b


def _blend(px, i, rgb, a):
    """a: 0..1 kapsama. Alfa kanali varsa DOKUNULMAZ — `screencapture -o`
    opak uretiyor, ve saydamligi degistirmek golgesiz kadraji bozar."""
    if a <= 0:
        return
    if a >= 1:
        px[i], px[i + 1], px[i + 2] = rgb
        return
    for k in range(3):
        px[i + k] = int(round(px[i + k] * (1 - a) + rgb[k] * a))


def stroke_round_rect(px, w, h, ch, x, y, rw, rh, radius, thickness, rgb):
    """Yuvarlak koseli cerceve, kenarlari yumusatilmis.

    Her pikselin dikdortgenin KENARINA olan isaretli uzakligi hesaplanir;
    |uzaklik| < kalinlik/2 ise piksel boyanir, sinirda kismi kapsama ile
    karistirilir. Yumusatma bilerek var: 2x retina bir gorselde tirtikli
    cerceve pazarlama sayfasinda goze batar.
    """
    rad = max(0, min(radius, rw / 2, rh / 2))
    cx0, cy0 = x + rad, y + rad
    cx1, cy1 = x + rw - rad, y + rh - rad
    half = thickness / 2.0
    pad = int(half) + 2
    x0, y0, x1, y1 = _clip(x - pad, y - pad, rw + 2 * pad, rh + 2 * pad, w, h)
    for yy in range(y0, y1):
        py = yy + 0.5
        for xx in range(x0, x1):
            pxx = xx + 0.5
            dx = max(cx0 - pxx, 0.0, pxx - cx1)
            dy = max(cy0 - py, 0.0, py - cy1)
            if dx == 0.0 and dy == 0.0:
                dist = -min(pxx - x, x + rw - pxx, py - y, y + rh - py)
            else:
                dist = (dx * dx + dy * dy) ** 0.5 - rad
            cover = min(1.0, max(0.0, half - abs(dist) + 0.5))
            _blend(px, (yy * w + xx) * ch, rgb, cover)
```

- [ ] **Adım 4: Testleri koş**

```bash
cd "<scratchpad>" && python3 -m pytest test_shotkit.py -q
```
Beklenen: 5 passed.

- [ ] **Adım 5: İğnelerin ısırdığını MUTASYONLA kanıtla**

Sırayla uygula, KIRMIZI gör, GERİ AL. Her birinde önce desenin benzersiz
olduğunu `grep -c` ile doğrula — bu projede benzersiz olmayan bir desen
yüzünden mutasyon sessizce atlandı ve "kilit yok" diye okundu.

1. `load_png`'de filtre 4 (Paeth) dalını `pass` yap → `test_decodes_all_five_filters` kırmızı.
2. `fill_rect`'te `x1 = min(w, x + rw)` yerine `x + rw + 1` → sınır testi kırmızı.
3. `stroke_round_rect`'te `cover` hesabını `1.0` sabitine çevir (dolu dikdörtgen) → iç bölge testi kırmızı.
4. `save_png`'de `raw.append(0)` satırını sil → round-trip testi kırmızı.

- [ ] **Adım 6: Gerçek bir `screencapture` çıktısıyla dene**

Modül sentetik PNG'lerde çalışıyor; asıl gireceği veri `screencapture`ın
ürettiği dosya. Herhangi bir pencereyi yakala, `load_png` ile aç, boyutları
`sips -g pixelWidth -g pixelHeight` ile karşılaştır, `save_png` ile geri yaz
ve yeniden okunabildiğini doğrula. **Raporunda bu çıktıyı göster** — sentetik
testin kapsamadığı tek şey gerçek kodlayıcının ürettiği chunk düzenidir.

- [ ] **Adım 7: Commit**

Modül scratchpad'de, git'e girmez. Bu görevde commit YOK — raporun çıktısı
modülün kendisi ve test kanıtı.

---

## Task 2: Altı çekimi al 🔴 KONTROLÖRÜN KENDİ İŞİ

**Delege edilemez:** ekran erişimi oturuma verilir, alt ajana geçmez.

**Dosyalar:**
- Oluştur: `~/Desktop/mailmyra edit/assets/img/setup/apple-mail-step-01..05.png`, `apple-mail-result.png`

**Arayüzler:**
- Tüketir: Task 1'in `shotkit.py`'si.
- Üretir: altı PNG. Task 3 bunların GERÇEK piksel boyutlarını `width`/`height`
  attribute'u olarak yazacak; boyutları rapora geçir.

- [ ] **Adım 1: Kadrajı hazırla**

Builder çekimi için `https://app.mailmyra.com/builder`, tarayıcı penceresi
**1440×900** (mevcut çekim 2880×1800 = bunun 2x'i). Forma spec'teki kurgusal
kimliği gir — **Alex Morgan / Brand Director / Northwind Studio /
alex@northwind.example / +1 555 0142 / northwind.example** — mevcut görselle
aynı kişi olsun, rehber boyunca kimlik değişmesin.

- [ ] **Adım 2: Altı pencereyi yakala**

Her biri için `app_list_windows` ile pencere kimliğini al, sonra:

```bash
screencapture -o -l<windowID> "<scratchpad>/raw/apple-mail-step-0N.png"
```

Hangi pencerede ne olacağı spec Karar 1'deki tabloda. `-o` gölgeyi atar,
`-l` tek pencereyi alır.

- [ ] **Adım 3: Hesap adreslerini kapat**

`step-02`, `step-03`, `step-05` ve `result`'ta Mail'in hesap listesi/gönderen
alanı görünür. Her adresin dikdörtgenini `shotkit.fill_rect` ile düz renkle
kapat. Renk: o bölgenin kendi arka planına yakın nötr bir gri
(ör. `(226, 226, 228)`), böylece blok bir sansür şeridi gibi değil boş alan
gibi okunur.

🔴 Bulanıklaştırma YOK (spec Karar 2).

- [ ] **Adım 4: Vurgu çerçevesini çiz**

`step-01`, `step-02`, `step-03`, `step-05`'e — tabloda "—" yazan ikisine DEĞİL:

```python
stroke_round_rect(px, w, h, ch, X, Y, RW, RH, radius=10, thickness=6, rgb=(123, 159, 211))
```

`(123, 159, 211)` = `#7b9fd3`, markanın rengi. Koordinatlar her görselde
gözle belirlenir; çizdikten sonra görseli AÇ ve çerçevenin doğru kontrolü
sardığını doğrula.

- [ ] **Adım 5: Boyut tavanını ölç**

```bash
ls -l "~/Desktop/mailmyra edit/assets/img/setup/" | awk '{print $5, $9}'
```
Her dosya **300KB altında** olmalı. Aşan olursa rapor et — sessizce geçme,
ve çözümü (kırpma mı, ölçek mi) sormadan uygulama.

- [ ] **Adım 6: Gözle denetle**

Altı görseli de aç ve bak: okunabilir hiçbir gerçek adres kaldı mı, çerçeve
doğru kontrolü mü sarıyor, kadrajda masaüstü/duvar kâğıdı var mı.

- [ ] **Adım 7: Commit**

```bash
cd "/Users/mmacstudio/Desktop/mailmyra edit"
git add assets/img/setup/apple-mail-*.png
git commit -m "assets: capture the six Apple Mail setup screenshots

The guide has carried hidden placeholders since it was written. These are
the real thing, taken from Mail itself at retina resolution with the window
captured alone so no desktop shows.

Account addresses are covered with a flat block rather than blurred —
blurred text of a known font and a narrow character set can be recovered.
The one control each step names carries a brand-coloured frame; nothing
inside the image is text, so a translated guide can reuse these unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Sayfaya bağla

**Dosyalar:**
- Değiştir: `~/Desktop/mailmyra edit/assets/css/main.css` (SONUNA ekle)
- Değiştir: `~/Desktop/mailmyra edit/setup-apple-mail.html` (6 figür)

**Arayüzler:**
- Tüketir: Task 2'nin ürettiği altı PNG ve onların gerçek piksel boyutları.
- Üretir: yayına hazır sayfa.

- [ ] **Adım 1: CSS kuralını ekle**

`assets/css/main.css`'in **EN SONUNA** (yerinde düzenleme YOK — bu temada
`main.css` yalnız sonuna eklenir):

```css
/* KURULUM GORSELLERI: gorsel gelen figurde oran SERBEST.

   `.mm-sg-shot` (main.css icinde, yukarida) `aspect-ratio: 16 / 10` tasiyor.
   O kural YER TUTUCU kutulari icin dogru — icerigi olmayan bir figurun tek
   yukseklik kaynagi odur. Ama gercek ekran goruntuleri 16:10 degil: Mail'in
   ayar penceresi kare-msi, iOS ekrani dikey. Oran orada zorlanirsa gorsel
   ya esner ya kirpilir.

   Bu yuzden kural SILINMIYOR, yalnizca gorsel TASIYAN figurde geciyor. */
.mm-sg-shot--img {
  aspect-ratio: auto;
}
```

- [ ] **Adım 2: Altı figürü değiştir**

`setup-apple-mail.html` içinde, altı `data-shot` figürünün her biri. Gizli
olanlar şu biçimde:

```html
<figure class="mm-sg-shot" data-shot="apple-mail-step-02.png" hidden>
    <span class="mm-sg-shot__label">Screenshot</span>
    <span class="mm-sg-shot__file">apple-mail-step-02.png</span>
</figure>
```

Yerine (tek satır, mevcut `step-01` markup'ıyla aynı biçim + modifier):

```html
<figure class="mm-sg-shot mm-sg-shot--img" data-shot="apple-mail-step-02.png"><img src="assets/img/setup/apple-mail-step-02.png" alt="Mail settings with the Signatures tab selected" width="W" height="H" loading="lazy" decoding="async"></figure>
```

`W`/`H` = dosyanın GERÇEK piksel boyutları (Task 2 raporundan; `sips -g
pixelWidth -g pixelHeight <dosya>` ile teyit et). Yanlış değer düzeni zıplatır.

**Altı `alt` metni** — her biri görselde gerçekten olan şeyi anlatır:

| Dosya | alt |
|---|---|
| `step-01` | `The Mailmyra builder with a finished signature and the Copy signature button` |
| `step-02` | `Mail settings with the Signatures tab selected` |
| `step-03` | `The Signatures pane with the account list and the add button` |
| `step-04` | `The signature editor with the pasted Mailmyra signature` |
| `step-05` | `The Choose Signature menu on a mail account` |
| `result` | `A new message in Mail with the signature at the bottom` |

Mevcut `step-01` figürü de `mm-sg-shot--img` sınıfını alır (`alt` metni
zaten doğru, değiştirme).

- [ ] **Adım 3: Denetimi koş**

```bash
cd "/Users/mmacstudio/Desktop/mailmyra edit" && node scripts/audit.mjs > /tmp/audit.log 2>&1; echo "AUDIT EXIT=$?"; tail -20 /tmp/audit.log
```
Beklenen: çıkış kodu 0. `missing-assets` kuralı altı dosyayı da diskte
bulmalı; `claims` kuralı `alt` metinlerinden şikâyet etmemeli.

- [ ] **Adım 4: Tarayıcıda doğrula**

Sayfayı aç (`setup-apple-mail.html`) ve DOM'dan doğrula — ekran görüntüsü
değil, iddia:

```js
[...document.querySelectorAll('.mm-sg-shot')].map(f => ({
  shot: f.dataset.shot,
  hidden: f.hidden,
  img: !!f.querySelector('img'),
  yuklendi: f.querySelector('img')?.naturalWidth > 0,
  attrEn: f.querySelector('img')?.getAttribute('width'),
  gercekEn: f.querySelector('img')?.naturalWidth,
}))
```

Altı satırın altısında da `hidden:false`, `img:true`, `yuklendi:true` ve
`attrEn === gercekEn` olmalı. Son eşitlik önemli: attribute ile gerçek
boyut ayrışırsa tarayıcı yanlış yer ayırır ve sayfa yüklenirken zıplar.

- [ ] **Adım 5: Commit**

```bash
cd "/Users/mmacstudio/Desktop/mailmyra edit"
git add assets/css/main.css setup-apple-mail.html
git commit -m "feat(setup): show the six Apple Mail screenshots

The figures have been hidden since the guide shipped, so the steps carried
no evidence. They now carry the real captures.

The 16/10 rule is overridden for figures that hold an image rather than
deleted, because it is the only height a placeholder box has, and this
theme's stylesheet is only ever appended to. Each img states the file's
true pixel size so the browser reserves the right space and the page does
not jump as the shots load.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Öz-denetim notları (plan yazarından)

- **Spec kapsamı:** Karar 1 → Task 2 Adım 2. Karar 2 → Task 1 (`fill_rect`) +
  Task 2 Adım 3. Karar 3 → Task 1 (`stroke_round_rect`) + Task 2 Adım 4.
  Karar 4 → Task 3 Adım 1. Karar 5 → Task 1 + Task 2 Adım 2. Karar 6 → Task 3 Adım 2.
- **Tip tutarlılığı:** `load_png` → `(w, h, ch, px)` dörtlüsü; `save_png`,
  `fill_rect`, `stroke_round_rect` hepsi aynı `(px, w, h, ch, …)` sırasını
  kullanıyor. Task 2 ve Task 3 bu adlara birebir atıf yapıyor.
- **Bilinçli boşluk:** vurgu çerçevesinin KOORDİNATLARI planda yazılamaz —
  hangi pikselde durduğu çekime bağlı. Task 2 Adım 4 bunu "gözle belirle,
  sonra çizip DOĞRULA" diye bırakıyor; kapatılamayan tek yer burası.
- **Task 2 neden delege edilemez:** ekran erişim izni oturuma bağlı, alt
  ajanlara geçmiyor. Plan başında da yazılı.

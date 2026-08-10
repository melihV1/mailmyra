# E-posta gönderimi

Doğrulama, şifre sıfırlama ve davet e-postaları buradan çıkar.

**Sağlayıcı kararı açık.** Bu yüzden uygulama sağlayıcıya özel hiçbir SDK
kullanmıyor: standart SMTP konuşuyor, bağlantı bilgisi ortam değişkenlerinden
geliyor. Plesk'in yerel rölesinden Google Workspace'e geçmek `.env` düzenlemek
ve uygulamayı yeniden başlatmaktan ibaret — kod değişmiyor, deploy gerekmiyor.

## Ortam değişkenleri

| Değişken | Zorunlu | Not |
|---|---|---|
| `MAIL_HOST` | ✅ | ör. `localhost`, `smtp.gmail.com` |
| `MAIL_FROM` | ✅ | ör. `Mailmyra <no-reply@mailmyra.com>` |
| `MAIL_PORT` | — | varsayılan `587` |
| `MAIL_USER` | — | röle kimlik doğrulaması istiyorsa |
| `MAIL_PASS` | — | `MAIL_USER` varsa **zorunlu** |
| `MAIL_SECURE` | — | port tahminini ezer (`465` → örtük TLS, gerisi STARTTLS) |

Kullanıcı ve parola ya birlikte var ya da birlikte yok. Parolası düşmüş bir
yapılandırmada sessizce kimliksiz bağlanmak, teşhisi zor bir "neden gitmiyor"
hatası üretirdi; uygulama bunun yerine `MAIL_PASS eksik` diye durur.

**Yapılandırma yoksa:** geliştirmede mesaj gönderilmez, konsola yazılır —
kimse röle kurmadan çalışabilsin diye. **Üretimde uygulama başlamaz.** Sessizce
log'a düşmek, hiçbir doğrulama e-postasının gitmediğini kimsenin fark etmemesi
demek olurdu.

## Aday 1 — Plesk'in kendi SMTP'si

```
MAIL_HOST=localhost
MAIL_PORT=25
MAIL_FROM=Mailmyra <no-reply@mailmyra.com>
# MAIL_USER / MAIL_PASS genelde gerekmez: localhost'tan gelen bağlantıya
# Plesk zaten güveniyor.
```

Artısı: ek maliyet yok, dışarı bağımlılık yok. Eksisi: **teslimat itibarı
tamamen sunucunun IP'sine bağlı.** Paylaşımlı ya da yeni bir IP'de Gmail ve
Outlook doğrudan spam'e atabilir; bunu ancak gerçek gönderimle anlarsın.

## Aday 2 — Google Workspace

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=no-reply@mailmyra.com
MAIL_PASS=<uygulama parolası>
MAIL_FROM=Mailmyra <no-reply@mailmyra.com>
```

Normal hesap parolası **çalışmaz**; iki adımlı doğrulama açılıp bir uygulama
parolası üretilmeli. Günlük gönderim sınırı var (hesap tipine göre 500–2000);
ilk 10 müşteri için fazlasıyla yeter.

Artısı: teslimat itibarı Google'ın. Eksisi: `MAIL_FROM` gerçek bir Workspace
kutusu olmak zorunda ve sınır aşılırsa gönderim durur.

## İkisinde de gereken: SPF ve DKIM

Hangisi seçilirse seçilsin, `mailmyra.com` DNS'inde SPF ve DKIM kayıtları
olmadan bu e-postalar spam'e düşer. Kayıtlar sağlayıcıya göre değişir, ihtiyaç
değişmez.

Gönderen adres: `no-reply@mailmyra.com`.

## Nasıl test edilir

Kod tarafı ağ gerektirmiyor: taşıyıcı testleri nodemailer'ın `jsonTransport`
kipiyle zarfı gerçekten göndermeden kuruyor, şablon testleri de saf.

```bash
npm test -w apps/web
```

Gerçek teslimatı ancak gerçek gönderimle anlarsın. Sağlayıcı seçilince
Gmail, Outlook.com ve bir kurumsal Exchange kutusuna birer doğrulama
e-postası atılıp spam klasörleri kontrol edilecek.

## Şablonlar

`apps/web/lib/mail/templates/` — sağlayıcıdan bağımsız, yalnız
`{ subject, html, text }` üretiyorlar.

Bu e-postalar da e-posta HTML'i: imzalara uyguladığımız kısıtların aynısı
geçerli ve testler bunu zorluyor — tablo tabanlı yerleşim (`<div>` yok), bütün
CSS satır içi (`<style>` yok), her tabloda açıkça `border="0"` (Outlook 2512
aksi hâlde istenmeyen kenarlık ekliyor), her mesajda düz metin karşılığı.

**Metinler İngilizce** (karar: 2026-08-10, Hüseyin) — panel ve e-postalar
sitenin diliyle aynı. Çift dil kapsam dışı; gerekirse değişecek tek yer
`templates/`.

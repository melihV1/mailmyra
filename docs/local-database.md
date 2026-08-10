# Yerel veritabanı kurulumu

Prod veritabanı **yalnız yerel bağlantı** kabul ediyor (kilitli karar) — Mac'ten
ona bağlanılmaz. Geliştirme kendi makinendeki MariaDB'ye karşı yapılır.

Sürüm önemli: prod **MariaDB 11.8.3**. Homebrew'in varsayılan `mariadb`
formülü bir major sürüm ileride (12.x) ve migration yerelde geçip sunucuda
patlayabilir. Bu yüzden versiyonlu formül kullanılıyor.

## Kurulum

```bash
brew install mariadb@11.8 && brew services start mariadb@11.8
```

Formül keg-only; komutlar PATH'e girmez. Ya tam yol kullan ya da kabuğuna ekle:

```bash
export PATH="/opt/homebrew/opt/mariadb@11.8/bin:$PATH"
```

## Veritabanları ve kullanıcı

`mariadb` (parametresiz) OS kullanıcısıyla `unix_socket` üzerinden yönetici
olarak bağlanır. Parolayı sen üret, aşağıdaki `PAROLA`nın yerine koy:

```sql
CREATE DATABASE mailmyra_dev    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE mailmyra_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mailmyra'@'localhost' IDENTIFIED BY 'PAROLA';
GRANT ALL PRIVILEGES ON mailmyra_dev.*    TO 'mailmyra'@'localhost';
GRANT ALL PRIVILEGES ON mailmyra_shadow.* TO 'mailmyra'@'localhost';
```

Sonra `.env.example`'ı `apps/web/.env.local` olarak kopyalayıp iki
`DATABASE_URL` satırındaki parolayı doldur. Dosya `.gitignore`'da.

### Üç ayrıntı, üçü de bilerek

**Gölge veritabanı ayrı ve elle kuruluyor.** `prisma migrate dev`, şemayı
doğrulamak için geçici bir veritabanı yaratıp siler; bunu kendi yapması
`CREATE DATABASE` yetkisi ister. `mailmyra_shadow`'u önden verince uygulama
kullanıcısı dar yetkiyle kalıyor ve prod'daki hâline benziyor.

**Bağlantı `127.0.0.1` üzerinden, soket üzerinden değil.** Prod'da uygulama
TCP ile bağlanacak; yerelde de öyle yaparsak parola doğrulaması, karakter seti
pazarlığı ve bağlantı havuzu aynı yolu izler.

**Collation veritabanı düzeyinde pinlendi.** Sunucu varsayılanına
güvenilmiyor: 11.8.8'de ölçtük, `utf8mb4_general_ci` çıktı. `uca1400_*`
collation'lar derlenmiş durumda ama MariaDB'ye özel ve Prisma'nın onlarla
şema kayması üretme ihtimali var; `utf8mb4_unicode_ci` her iki motorda da var.

Doğrulanan davranış — `UNIQUE(email)` üzerinde ölçüldü:

| Girdi çifti | Sonuç | İstenen mi |
|---|---|---|
| `Ali@Voldi.NET` / `ali@voldi.net` | mükerrer, reddedildi | ✅ harf duyarsız tekillik |
| `ali@voldi.net` / `alı@voldi.net` | ayrı kayıt | ✅ noktasız ı farklı karakter |

Yine de e-posta uygulama kodunda küçük harfe normalize edilir. Collation
karşılaştırmayı halleder, *depolanan* değeri değil.

## Servisi durdurma

```bash
brew services stop mariadb@11.8
```

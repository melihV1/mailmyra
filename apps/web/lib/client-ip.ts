/**
 * Gerçek istemci IP'sini iki kaynaktan biri verir; ikisi de yoksa yerele düşer.
 *
 * **Önümüzde ne var:** IIS + iisnode (Plesk Windows). Zincire ekleme yapan
 * (append eden) bir ters proxy YOK — bkz. `apps/web/web.config`: orada yalnız
 * iisnode handler'ı ve bir rewrite kuralı var, hiçbir katman `X-Forwarded-For`
 * yazmıyor. Bu yüzden `X-Forwarded-For`e koşulsuz güvenmek tam bir bypass'tı:
 * istemci başlığı kendisi yazıp yolluyor, Node'a öylece ulaşıyordu.
 *
 * Kanıt (2026-09-14, docs/client-ip-never-captured.md): (a) "Aktif oturumlar"
 * tablosundaki HER satır, launch'tan beri, `local` — gerçek bir IP hiç
 * kaydedilmemiş; (b) `/api/leads`'e sahte `X-Forwarded-For` göndermek YENİ bir
 * rate-limit kovası açıyor — IIS zincire kendi gördüğü adresi ekliyor olsaydı
 * bu mümkün olmazdı.
 *
 * **Öncelik sırası:**
 * 1. `x-iisnode-remote_addr` — YALNIZ `TRUST_IISNODE_REMOTE_ADDR` açıkken.
 *    Fikir: iisnode IIS'in `REMOTE_ADDR`ini header olarak öne sürer
 *    (`web.config`'te `<iisnode promoteServerVars="REMOTE_ADDR" />`) ve bu,
 *    istemcinin GÖNDERDİĞİ değil sunucunun ÖLÇTÜĞÜ adres olur.
 *    ⚠️ 2026-09-14 itibarıyla BU KURULUMDA ÇALIŞMIYOR: ayar web.config'te
 *    olmasına rağmen iisnode başlığı yazmıyor, dolayısıyla bayrak KAPALI.
 *    Açmadan önce doğrula (bkz. `isTrustIisnodeEnabled` yorumu).
 * 2. `x-forwarded-for` — YALNIZ `TRUST_PROXY` env'i açıkken ('1' ya da
 *    'true'). Varsayılan KAPALI: önümüzde XFF'e ekleme yapan güvenilir bir
 *    proxy olmadığı sürece açmak yukarıdaki bypass'ı yeniden açar. Açıldığı
 *    gün zincirin en sağındaki (son eklenen) girdi kullanılır — o yeni
 *    kurulumda istemciye en yakın güvenilir sıçrama olur.
 * 3. `'local'` — yerel geliştirme ve hiçbir başlığın gelmediği her durum.
 *
 * İki kaynak da `env`e bağlı olduğu için ikinci parametre `env` alır
 * (`marketingOrigin()`/`appUrl()` ile aynı desen, bkz.
 * `apps/web/app/api/auth/_shared.ts`) — `process.env`i mutasyona uğratmadan
 * test edilebilsin diye.
 */
export function clientIp(
  req: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  if (isTrustIisnodeEnabled(env)) {
    const fromIisnode = normalise(req.headers.get('x-iisnode-remote_addr'));
    if (fromIisnode) return fromIisnode;
  }

  if (isTrustProxyEnabled(env)) {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
      // Sağ taraf, zincire EKLEME yapan (append eden) güvenilen proxy'nin
      // en son yazdığı girdi — sol taraf istemcinin kendisi ve serbestçe
      // sahtelenebilir (spoofable). Yalnız TRUST_PROXY açıkken buraya
      // girildiği için "güvenilen proxy var" varsayımı burada geçerli.
      const rightmost = normalise(xff.split(',').pop());
      if (rightmost) return rightmost;
    }
  }

  return 'local';
}

/**
 * `Session.ip` / `LegalAcceptance.ip` / `AuthAttempt.ip` / `AdminAction.ip`
 * — hepsi `apps/web/prisma/schema.prisma`'da `@db.VarChar(45)`. 45, IPv6'nın
 * metin gösteriminin (IPv4-mapped biçimi dahil) alabileceği en uzun hâli;
 * normalde hiçbir gerçek adres bunu aşmaz ama başlık değeri istemciden
 * geldiği için elle kesmeden DB'ye güvenmiyoruz.
 */
const MAX_IP_LENGTH = 45;

/** `TRUST_PROXY=1` ya da `TRUST_PROXY=true` (büyük/küçük harf duyarsız). */
function isTrustProxyEnabled(env: Record<string, string | undefined>): boolean {
  return isOn(env.TRUST_PROXY);
}

/**
 * `TRUST_IISNODE_REMOTE_ADDR` — yalnız iisnode'un başlığı GERÇEKTEN yazdığı
 * (ve istemciden geleni EZDİĞİ) doğrulanmış bir kurulumda açılır.
 *
 * Neden bayrak arkasında: 2026-09-14'te canlıda ölçüldü — `web.config`'e
 * `<iisnode promoteServerVars="REMOTE_ADDR" />` eklendiği hâlde iisnode
 * başlığı YAZMIYOR. Kanıt: kendi gerçek genel IP'miz sahte başlık olarak
 * gönderildiğinde AYRI bir rate-limit kovası açıldı; iletim çalışsaydı
 * iisnode üstüne kendi ölçtüğü adresi yazar ve aynı kovaya düşerdi.
 * İletim yokken başlığa güvenmek, istemcinin kendi anahtarını seçmesine
 * izin vermek olurdu — kapattığımız XFF açığının aynısı.
 */
function isTrustIisnodeEnabled(env: Record<string, string | undefined>): boolean {
  return isOn(env.TRUST_IISNODE_REMOTE_ADDR);
}

function isOn(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase();
  return value === '1' || value === 'true';
}

/**
 * Başlık değerini kırpar, IPv4-mapped IPv6'yı ('::ffff:203.0.113.5') düz
 * IPv4'e ('203.0.113.5') indirger ve DB kolon sınırına keser.
 *
 * Boş ya da yalnız boşluktan oluşan değer için '' döner — çağıran bunu
 * "bu kaynak yok" sayıp bir sonraki kaynağa düşer; asla '' üst katmana
 * sızmaz (üst katman '' ile 'local'ı ayıramazdı).
 */
function normalise(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // IIS/iisnode IPv4 adreslerini sık sık bu biçimde verir; dönüştürülmezse
  // oturumlar tablosunda sıradan bir IPv4 ziyaretçi bile yabancı görünür.
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(trimmed);
  if (mapped?.[1]) return mapped[1];

  return trimmed.slice(0, MAX_IP_LENGTH);
}

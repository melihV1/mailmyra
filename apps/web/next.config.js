/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mailmyra/renderer'],

  /**
   * app.mailmyra.com'un KÖKÜ pazarlama sitesine gider.
   *
   * Sebep: bu rota hâlâ Hafta 3'ün Türkçe landing sayfasını sunuyordu
   * (`app/(marketing)/page.tsx`) — Agntix sitesi yokken ürünün tek yüzü
   * oydu, mailmyra.com devralınca yerinde kaldı. Bugün üç sorun birden
   * yaratıyordu: (a) pazarlama sitesi İngilizce kalır kararına aykırı
   * Türkçe içerik, (b) kendi menüsüyle gerçek siteyi taklit ediyor,
   * (c) canonical'ı ve robots yönergesi olmadığı için mailmyra.com ile
   * AYNI kelimeler için yarışıyordu (siteye 29 canonical eklendiği gün
   * ölçüldü).
   *
   * Kapsam KASITLI olarak yalnız kök: `/privacy`, `/terms` ve `/kvkk` de
   * bu grupta ama onlar kayıt onayı akışına bağlı (`lib/legal-links.ts` →
   * `SignupForm`), ve app'teki sürüm sitedekinden FARKLI bir belge
   * ("Effective 2026-08-13 · Draft, not yet reviewed by counsel" ↔ site
   * "Last updated: August 14, 2026"). Onları yönlendirmek, geçmiş
   * `LegalAcceptance` kayıtlarının çözümlendiği metni sessizce
   * değiştirirdi — ayrı bir karar, burada yapılmaz.
   *
   * `Header`ın logo linki (`href="/"`) yalnız bu grupta; auth ve panel
   * kendi kabuklarını kullandığı için etkilenmez.
   */
  async redirects() {
    return [
      { source: '/', destination: 'https://mailmyra.com/', permanent: true },
      // Hukuki metinler artik SITEDE yasiyor (karar 2026-09-14). App'in
      // kendi kopyalari kaldirildi; bu satirlar yer imleri, eski e-posta
      // linkleri ve arama sonuclari icin duruyor. `lib/legal-links.ts`
      // zaten MUTLAK adres verdigi icin urun ici linkler buraya hic
      // ugramaz.
      { source: '/privacy', destination: 'https://mailmyra.com/privacy', permanent: true },
      { source: '/terms', destination: 'https://mailmyra.com/terms', permanent: true },
      { source: '/kvkk', destination: 'https://mailmyra.com/kvkk', permanent: true },
    ];
  },
  webpack: (config, { isServer }) => {
    // TUZAK: `instrumentation.ts` içindeki `await import('./lib/db')`,
    // Next'in "instrument" webpack katmanından geçiyor (bkz.
    // `WEBPACK_LAYERS_NAMES.instrument === 'instrument'`,
    // node_modules/next/dist/lib/constants.js). Bu katman hem node hem edge
    // sunucu çalışma zamanı için TEK bir derleme — edge derleyicisi de bu
    // dosyayı statik olarak paketliyor; `onRequestError` içindeki
    // `NEXT_RUNTIME !== 'nodejs'` kontrolü yalnız ÇALIŞMA ZAMANINDA devreye
    // girer, DERLEME aşamasını hiç etkilemez (mariadb'nin içindeki
    // `node:crypto`/`node:stream` importu tam da bu yüzden edge derlemesinde
    // hata veriyordu — bu satır sayesinde bulundu). `serverExternalPackages`
    // next.config alanı bu katmanı KAPSAMAZ (denendi, aynı hatayı verdi)
    // çünkü bu katman paketleri GRUP olarak her zaman paketliyor. Çözüm:
    // `mariadb` ve `@prisma/adapter-mariadb` sürücülerini webpack
    // `externals` ile elle dışarıda bırakmak — böylece bundler bu iki
    // paketin içine hiç girmiyor (dolayısıyla `stream` gibi Node
    // yerleşiklerini hiç aramıyor) ve gerçek çalışma zamanında Node'un
    // kendi `require`'ı devreye giriyor (Node'da `stream` zaten var).
    //
    // Kapsam KASITLI olarak yalnız `instrument` katmanına daraltıldı
    // (`contextInfo.issuerLayer === 'instrument'`) — `isServer` tek başına
    // hem node hem edge derlemesinde true olduğu için bu daraltma olmadan
    // kural TÜM server derlemelerine (app/api route'ları, middleware —
    // üretimdeki gerçek trafik dahil) sızıyor ve mariadb'yi orada da
    // inline paketlenmekten runtime require'a çeviriyordu. Katman koşuluyla
    // üretim rotalarının bundle'ı bu değişiklikten ETKİLENMİYOR, mariadb
    // orada eskisi gibi inline kalıyor. `node:` önekli modülleri dışlama
    // kuralı da aynı nedenle yalnız bu katmanda geçerli — genel
    // uygulansaydı ileride bir edge route'un yanlışlıkla `node:` modülü
    // import etmesi sessizce maskelenebilirdi. BU BLOĞU SİLME: silinirse
    // `next dev` yeniden HER rotada 500 döner (bkz. görev raporu:
    // .superpowers/sdd/task-0-report.md).
    if (isServer) {
      const originalExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      config.externals = [
        ({ request, contextInfo }, callback) => {
          if (
            contextInfo?.issuerLayer === 'instrument' &&
            (request === 'mariadb' ||
              request === '@prisma/adapter-mariadb' ||
              request?.startsWith('node:'))
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
        ...originalExternals,
      ];
    }
    return config;
  },
};

module.exports = nextConfig;

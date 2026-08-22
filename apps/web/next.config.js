/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mailmyra/renderer'],
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

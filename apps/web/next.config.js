/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mailmyra/renderer'],
  webpack: (config, { isServer }) => {
    // TUZAK: `instrumentation.ts` içindeki `await import('./lib/db')`
    // Next'in "instrument" webpack katmanından (hem node hem edge sunucu
    // derlemesi — RSC benzeri, Node çekirdek modülleri polyfill'siz)
    // geçiyor. `serverExternalPackages` next.config alanı bu katmanı
    // KAPSAMAZ (denendi, aynı hatayı verdi) çünkü bu katman paketleri
    // GRUP olarak her zaman paketliyor. Çözüm: mariadb sürücüsünü webpack
    // `externals` ile elle dışarıda bırakmak — böylece bundler mariadb'nin
    // içine hiç girmiyor (dolayısıyla `stream` gibi Node yerleşiklerini
    // hiç aramıyor) ve gerçek çalışma zamanında Node'un kendi `require`'ı
    // devreye giriyor (Node'da `stream` zaten var). `isServer` hem node
    // hem edge derlemesinde true olduğu için ikisini de kapsar — edge
    // derlemesinde bu satıra hiç ulaşılmıyor zaten çünkü `onRequestError`
    // en başta `NEXT_RUNTIME !== 'nodejs'` ise dönüyor. BU BLOĞU SİLME:
    // silinirse `next dev` yeniden HER rotada 500 döner (bkz. görev
    // raporu: .superpowers/sdd/task-0-report.md).
    if (isServer) {
      const originalExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      config.externals = [
        ({ request }, callback) => {
          if (
            request === 'mariadb' ||
            request === '@prisma/adapter-mariadb' ||
            request?.startsWith('node:')
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

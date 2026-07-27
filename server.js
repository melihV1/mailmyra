// Kök giriş noktası — YALNIZCA Plesk'in "Uygulamayı Başlatma Dosyası" alanı
// alt klasör yolu (apps/web/server.js) kabul etmediğinde gerekir.
//
// Tercih edilen kurulum, bu dosyaya İHTİYAÇ DUYMAZ:
//   Uygulama Kökü          /httpdocs
//   Belge kökü             /httpdocs/apps/web
//   Başlatma dosyası       apps/web/server.js
//
// Alan alt klasörü reddederse başlatma dosyasını `server.js` bırak; bu dosya
// gerçek sunucuyu devralır. `dir: __dirname` orada apps/web'e çözüldüğü için
// Next doğru klasörden (.next ve .env.local dahil) yüklenir — bu dosyanın
// konumu onu etkilemez.
require('./apps/web/server.js');

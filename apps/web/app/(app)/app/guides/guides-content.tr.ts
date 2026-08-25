/**
 * Kurulum rehberleri — TÜRKÇE içerik (`guides-content.en.ts`nin çeviri eşi).
 *
 * Metinlerde iki kural pazarlıksız:
 *  1. CLAUDE.md §Test matrisi'ndeki 6 istemci birebir karşılanır.
 *  2. Ürün kapsamı dışındaki hiçbir şey vaat edilmez: directory sync,
 *    Outlook eklentisi, sunucu tarafı transport rule YOK (CLAUDE.md
 *    §YAPILMAYACAKLAR). Anlatılan akış her yerde aynı: yönetici imzayı
 *    üretir/iletir, kişi kendi istemcisine elle kurar.
 *
 * Çeviri kuralları (Dalga B, spec 2026-08-24):
 *  · İstemci UI menü adları İngilizce kalır; rehber içinde ilk geçtiği
 *    yerde parantezle Türkçe karşılık verilir — kullanıcı o menüyü kendi
 *    (çoğu zaman İngilizce) istemcisinde arayacak.
 *  · `backtick` → <code> tek işaretlemedir; yerleşim EN ile aynıdır.
 *  · slug/icon/fidelity ve grup/adım iskeleti EN ile birebir —
 *    bekçi `test/guides-parity.test.ts`.
 */

import type { Guide, GuideStep } from './guides.data';

export const EXPORT_CHAIN_TR: readonly GuideStep[] = [
  {
    title: 'Tasarla ve kaydet',
    body: 'İmzayı Builder\'da kur. Taslak olarak kaydedilir ve taslağın maliyeti yoktur — gönderici yayına alınana kadar koltuk kullanılmaz.',
  },
  {
    title: 'Ata ve yayına al',
    body: 'Göndericiler ekranında imzayı bir göndericiye ata ve göndericiyi yayına al. Dışa aktarımın içine giren şey, imzası atanmış yayındaki göndericidir.',
  },
  {
    title: 'Kopyala ya da indir',
    body: 'İmzayı panoya biçimlendirilmiş HTML olarak kopyala, tek bir `.htm` dosyası olarak indir ya da Göndericiler ekranından yayındaki tüm göndericilerin `.zip`ini al.',
  },
];

export const GUIDES_TR = [
  /* ---------------------------------------------------------------- */
  {
    slug: 'outlook-classic',
    label: 'Outlook Classic',
    icon: 'tabler-brand-windows',
    headline: 'Outlook Classic (Windows)',
    blurb: 'Postayı Word motoruyla çizen masaüstü Outlook — şablonlarımızı asıl ona karşı sağlamlaştırıyoruz.',
    fidelity: 'rich',
    uses: '.htm dosyası ya da pano',
    groups: [
      {
        title: 'Seçenek 1 — .htm dosyasını Signatures klasörüne bırak',
        note: 'Daha temiz yol; bir iş arkadaşına bitmiş dosya veriyorsan kullanacağın yol da bu.',
        steps: [
          {
            title: 'Dosyayı indir',
            body: 'Builder\'da önizlemenin altındaki `.htm` indirmesini kullan. Ekibin tamamı içinse Göndericiler ekranını aç ve Zip dışa aktar\'ı kullan — arşivde yayındaki her gönderici için birer `.htm` bulunur.',
          },
          {
            title: 'Outlook\'u tamamen kapat',
            body: 'Outlook, Signatures klasörünü açılırken okur. Dosyayı kopyalamadan önce Outlook\'tan tamamen çık; yoksa yeni dosya görmezden gelinir.',
          },
          {
            title: 'Signatures klasörünü aç',
            body: '`Windows`+`R`\'ye bas, `%APPDATA%\\Microsoft\\Signatures` yolunu yapıştır ve Enter\'a bas.',
          },
          {
            title: 'Dosyayı klasöre kopyala',
            body: '`.htm` dosyasını bu klasöre koy. Dosya adı Outlook içinde imzanın adı olur; bu yüzden tanıyacağın bir adla yeniden adlandır — örneğin `Firma 2026.htm`.',
          },
          {
            title: 'Outlook\'u başlat ve imzayı seç',
            body: 'File (Dosya) → Options (Seçenekler) → Mail (Posta) → Signatures… (İmzalar) yolunu izle. Hesabı seç, sonra imzayı New messages (Yeni iletiler) ve Replies/forwards (Yanıtlar/iletmeler) için ayarla.',
          },
          {
            title: 'Kendine bir test gönder',
            body: 'Kendi adresine bir posta at; başkalarına dağıtmadan önce sonucu masaüstünün yanında telefonda da aç.',
          },
        ],
      },
      {
        title: 'Seçenek 2 — yapıştırarak kur',
        note: 'Signatures klasörüne ulaşamıyorsan ya da imzalar hesapta saklanıyorsa bunu kullan.',
        steps: [
          {
            title: 'Builder\'dan kopyala',
            body: 'Önizlemenin altındaki kopyala düğmesini kullan. Panoya gerçek HTML yazar (`text/html`); yapıştırılan imzanın kod olarak değil, düzeniyle gelmesinin sebebi bu.',
          },
          {
            title: 'İmza düzenleyicisini aç',
            body: 'File → Options → Mail → Signatures… → New (Yeni) yolunu izle ve imzaya bir ad ver.',
          },
          {
            title: 'Yapıştır ve kaydet',
            body: 'Büyük düzenleme kutusuna tıkla, `Ctrl`+`V`\'ye bas, sonra OK (Tamam). Hazır oradayken imzayı New messages ve Replies/forwards için varsayılan yap.',
          },
          {
            title: 'Önizlemeyle karşılaştır',
            body: 'Outlook yapıştırdığını yeniden yazar. Boşluklar, renkler ya da logo kayarsa yukarıdaki `.htm` yolunu kullan — o dosya Outlook\'a el değmeden ulaşır.',
          },
        ],
      },
    ],
    notes: [
      'İmza listesinde hiçbir şey görünmüyor mu? Yeni Microsoft 365 sürümleri imzaları yerel klasör yerine posta kutusunda tutuyor; o zaman klasör görmezden gelinir. Bu durumda yapıştırma yolunu kullan.',
      'Düzenin çevresindeki ince çizgiler, imza tablolarına kenarlık ekleyen bir Outlook 2512 hatası. Şablonlarımız her tabloda `border="0"` ve `border:none` değerlerini zaten ayarlıyor — HTML\'i elle düzeltmek yerine yeniden dışa aktar.',
      'Görünmeyen görseller genellikle alıcının ayarındandır: Outlook, henüz güvenmediği göndericilerden gelen uzak görselleri engeller. İmzanın kendisinde sorun yok.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'new-outlook',
    label: 'New Outlook',
    icon: 'tabler-mail',
    headline: 'New Outlook ve Outlook.com',
    blurb: 'Baştan yazılan Windows uygulaması ile web istemcisi tek ayar ekranını — ve posta kutusunda saklanan tek imzayı — paylaşır.',
    fidelity: 'rich',
    uses: 'Pano',
    groups: [
      {
        title: 'İmzayı posta kutusu ayarlarına yapıştır',
        note: 'Burada Signatures klasörü yok, `.htm` dosyasının gidecek yeri de yok — içeri giriş yolu pano.',
        steps: [
          {
            title: 'Builder\'dan kopyala',
            body: 'İmzayı Builder\'da aç ve önizlemenin altındaki kopyala düğmesini kullan.',
          },
          {
            title: 'Settings (Ayarlar) ekranını aç',
            body: 'Sağ üstteki dişli simgesine tıkla, sonra Mail (Posta) → Compose and reply (Oluştur ve yanıtla) yolunu izle.',
          },
          {
            title: 'Bir imza oluştur',
            body: 'Email signature (E-posta imzası) altında New signature (Yeni imza) seçeneğini seç ve imzaya bir ad ver.',
          },
          {
            title: 'Yapıştır',
            body: 'Düzenleyiciye tıkla ve `Ctrl`+`V`\'ye bas (Mac\'te `Cmd`+`V`). Düzen, renkler ve logo olduğu gibi gelir.',
          },
          {
            title: 'Ne zaman kullanılacağını seç',
            body: 'New messages (Yeni iletiler) ve Replies/forwards (Yanıtlar/iletmeler) açılır listelerini ayarla, sonra Save (Kaydet) düğmesine bas.',
          },
          {
            title: 'Kendine bir test gönder',
            body: 'Kendi adresine bir posta yaz; rehberi ekibin geri kalanıyla paylaşmadan önce sonucu kontrol et.',
          },
        ],
      },
    ],
    notes: [
      'İmza posta kutusunda saklanır; bu yüzden yeni Outlook uygulaması ile tarayıcıdaki outlook.com aynı listeyi gösterir.',
      'Outlook Classic\'in bunu alıp almayacağı Microsoft 365 sürümüne bağlı. Aldığını varsayma — o istemciyi ayrıca kontrol et, liste boşsa imzayı orada da kur.',
      'Yapıştırma düz metin olarak düşüyorsa panoya yazma engellenmiş demektir. Builder\'ı yeniden yükle, tarayıcı sorduğunda pano erişimine izin ver ve tekrar kopyala.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'gmail-web',
    label: 'Gmail (web)',
    icon: 'tabler-brand-google',
    headline: 'Web\'de Gmail',
    blurb: 'Gmail her adres için biçimlendirilmiş bir imza tutar ve tarayıcıda posta yazarken onu uygular.',
    fidelity: 'rich',
    uses: 'Pano',
    groups: [
      {
        title: 'Gmail ayarlarına yapıştır',
        steps: [
          {
            title: 'Önce imzayı kopyala',
            body: 'Builder önizlemesinin altındaki kopyala düğmesini kullan. Gmail ayar kutusunu açmadan önce imza panoda olmalı — orada dosya yükleme yok.',
          },
          {
            title: 'Ayarları aç',
            body: 'Sağ üstteki dişli simgesi → See all settings (Tüm ayarları gör) → General (Genel) sekmesi.',
          },
          {
            title: 'Signature (İmza) bölümünü bul',
            body: 'Signature bölümüne kadar in, Create new (Yeni oluştur) seçeneğini seç ve imzaya ad ver.',
          },
          {
            title: 'Yapıştır',
            body: 'İmza düzenleyicisine tıkla ve `Ctrl`+`V`\'ye bas (Mac\'te `Cmd`+`V`).',
          },
          {
            title: 'Varsayılanları ayarla',
            body: 'Signature defaults (İmza varsayılanları) altında New emails use (yeni e-postalar için) ve On reply/forward use (yanıt/yönlendirme için) alanlarında imzayı seç.',
          },
          {
            title: 'Değişiklikleri kaydet',
            body: 'Sayfanın en altına in ve Save Changes (Değişiklikleri Kaydet) düğmesine bas. Basmadan sayfadan ayrılmak imzayı çöpe atar.',
          },
          {
            title: 'Kendine bir test gönder',
            body: 'Kendi adresine posta at, sonra telefonda da aç — kırpılan ya da taşan imzalar önce orada ortaya çıkar.',
          },
        ],
      },
    ],
    notes: [
      'Gmail imzayı 10.000 karakterle sınırlar. Tek bir imza bunun çok altındadır; tavana çarpan, tek kutuya birden fazla imza yapıştırmaktır.',
      'İmzanın uzun yazışmalarda en alta itilmesini istemiyorsan “Insert this signature before quoted text in replies” (Bu imzayı yanıtlarda alıntılanan metinden önce ekle) kutusunu işaretle.',
      'Gmail uzun iletileri “View entire message” (İletinin tamamını görüntüle) bağlantısının arkasına kırpar. Şablonlarımızın görselleri gömmek yerine CDN\'den bağlamasının bir sebebi de imzayı küçük tutmak.',
      'Google Workspace yöneticileri Admin console (Yönetici konsolu) üzerinden tüm giden postalara altbilgi ekleyebilir. Bu, Google\'ın kendi özelliğidir ve Mailmyra\'dan bağımsızdır — biz kimsenin posta kutusuna imza itmeyiz.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'gmail-mobile',
    label: 'Gmail (mobil)',
    icon: 'tabler-device-mobile',
    headline: 'Android ve iOS\'ta Gmail',
    blurb: 'Önce dürüst cevap: Gmail uygulaması biçimlendirilmiş imza tutamaz. Burası için kısa bir metin satırı planla.',
    fidelity: 'text',
    uses: 'Düz metin',
    groups: [
      {
        title: 'Düz metin mobil imza ayarla',
        note: 'Gmail uygulamasının kendi Mobile Signature (Mobil imza) ayarı var ve yalnız metin kabul eder — logo yok, renk yok, bağlantı yok.',
        steps: [
          {
            title: 'Uygulama ayarlarını aç',
            body: 'Gmail uygulaması → menü (üç çizgi, sol üst) → Settings (Ayarlar) → kurduğun hesaba dokun.',
          },
          {
            title: 'İmza ayarını aç',
            body: 'Android\'de adı Mobile Signature; iOS\'ta o hesabın Signature settings (İmza ayarları) bölümünün altında.',
          },
          {
            title: 'İki üç satır yaz',
            body: 'Ad, ünvan ve bir telefon numarası yeter. İkisi birbiriyle çelişmesin diye tam imzayla tutarlı tut.',
          },
          {
            title: 'Ya da tamamen kapat',
            body: 'Boş bırakmak (iOS\'ta Mobile Signature\'ı kapatmak), telefondan giden yanıtların hiçbir şey taşımaması ve markalı imzanın yalnız masaüstü postasında görünmesi demek. Çoğu ekip için daha derli toplu seçim bu.',
          },
        ],
      },
    ],
    notes: [
      'mail.google.com\'da ayarladığın biçimlendirilmiş imza orada posta yazarken uygulanır. Gmail uygulaması onu devralmaz — bu Gmail\'in davranışı ve hiçbir imza aracı bunu değiştiremez.',
      'Ekibin çoğunlukla telefondan yanıtlıyorsa beklentiyi ona göre kur: markalı imza önce masaüstü için var.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'apple-mail',
    label: 'Apple Mail',
    icon: 'tabler-brand-apple',
    headline: 'macOS\'ta Apple Mail',
    blurb: 'Apple Mail yapıştırılan biçimlendirmeyi korur — ama önce onu soyacak tek bir ayarı kapatman gerekir.',
    fidelity: 'rich',
    uses: 'Pano',
    groups: [
      {
        title: 'İmza düzenleyicisine yapıştır',
        steps: [
          {
            title: 'Builder\'dan kopyala',
            body: 'Önizlemenin altındaki kopyala düğmesini kullan; tekrar kopyalaman gerekirse diye tarayıcı sekmesini açık bırak.',
          },
          {
            title: 'İmza ayarlarını aç',
            body: 'Mail → Settings… (Ayarlar; eski macOS sürümlerinde Preferences/Tercihler) → Signatures (İmzalar) sekmesi.',
          },
          {
            title: 'Hesabı seç ve imza ekle',
            body: 'Sol sütundan posta hesabını seç, `+` düğmesine bas ve yeni imzaya bir ad ver.',
          },
          {
            title: 'Önce font eşlemeyi kapat',
            body: '“Always match my default message font” (Her zaman saptanmış ileti fontumu kullan) kutusunun işaretini kaldır. Açık kalırsa Mail, yapıştırdığın anda fontlarını ve renklerini soyar.',
          },
          {
            title: 'Yapıştır',
            body: 'Sağdaki önizleme alanına tıkla ve `Cmd`+`V`\'ye bas.',
          },
          {
            title: 'Varsayılan yap',
            body: 'Hesap hâlâ seçiliyken Choose Signature (İmza Seç) ayarını yeni imzaya getir; böylece giden postaya kendiliğinden eklenir.',
          },
          {
            title: 'Kendine bir test gönder',
            body: 'Gelen postayı Builder önizlemesiyle karşılaştır — bir şeyi değiştirmiş olması en muhtemel adım Mail\'in düzenleyicisidir.',
          },
        ],
      },
    ],
    notes: [
      'Mail\'in düzenleyicisi huysuzdur: bir tablo hücresini düşürebilir ya da bir görseli kaydırabilir. Test postası yanlış görünüyorsa imzayı yerinde düzeltmeye çalışmak yerine sil ve yeniden yapıştır.',
      'İleri düzey çare: Mail\'den çık, `~/Library/Mail/V*/MailData/Signatures/` altındaki `.mailsignature` dosyalarını düzenle, sonra Mail yeniden yazmasın diye dosyayı kilitle. Tam yol macOS sürümleri arasında değişir; bunu son çare say.',
      'Burada ayarlanan imzalar bu Mac\'e aittir. iPhone ya da iPad\'de görünmezler — onları iOS Mail rehberiyle ayrıca kur.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'ios-mail',
    label: 'iOS Mail',
    icon: 'tabler-device-mobile-message',
    headline: 'iPhone ve iPad\'de Mail',
    blurb: 'iOS imza alanı düz metin kutusudur. İçine HTML yapıştırmak biçimlendirilmiş imza üretmez.',
    fidelity: 'text',
    uses: 'Düz metin',
    groups: [
      {
        title: 'Düz metin imza ayarla',
        steps: [
          {
            title: 'Ayarı aç',
            body: 'Settings (Ayarlar) → Apps (Uygulamalar) → Mail → Signature (İmza). 18 öncesi iOS sürümlerinde yol Settings → Mail → Signature.',
          },
          {
            title: 'Kapsamı seç',
            body: 'All Accounts (Tüm Hesaplar) her posta kutusu için tek satır kullanır; Per Account (Hesap Başına) iş ve kişisel postanın ayrışmasına izin verir.',
          },
          {
            title: 'İki üç satır yaz',
            body: 'Ad, ünvan, telefon. İkisi aynı kişi gibi okunsun diye masaüstü imzasının ifadesiyle eşleştir.',
          },
          {
            title: 'Kendine bir test gönder',
            body: 'Telefondan kendi adresine posta at ve satırların beklediğin yerde kırıldığını doğrula.',
          },
        ],
      },
    ],
    notes: [
      'Ortalıkta dolaşan numara — imzayı kendine postala, aç, görüntülenen bloğu kopyala ve Signature alanına yapıştır — bazen biçimlendirmenin bir kısmını korur; ama görseller ve bağlantılar o kadar sık kırılır ki şirket çapında bir dağıtım için önermiyoruz.',
      'Telefondaki bir Exchange ya da Microsoft 365 hesabı, masaüstünde Outlook\'ta ayarladığın imzayı çekmez. iOS Mail her zaman bu alanı kullanır.',
      'Mobildeki Gmail\'le aynı kural: markalı imza masaüstü istemcileri içindir; temiz iki satırlık metin imzası da onun dürüst mobil karşılığıdır.',
    ],
  },
] as const satisfies readonly Guide[];

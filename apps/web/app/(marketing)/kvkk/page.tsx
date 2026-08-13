import { LEGAL } from '../../../lib/legal-links';
import { legalStyles as styles, LegalDoc, LegalSection } from '../legal/LegalDoc';

export const metadata = { title: 'KVKK Aydınlatma Metni — Mailmyra' };

/**
 * Task 7 brief: 6698 sayılı KVKK, veri sorumlusu Voldi Creative, veri
 * işleyen/veri sorumlusu rol ayrımı açık, md. 11 hakları + e-posta ile
 * başvuru, saklama/silme politikası (görseller dahil tam imha), yalnız
 * zorunlu oturum çerezi. Taslak — hukukçu incelemesinden geçmedi.
 */
export default function KvkkPage() {
  return (
    <LegalDoc
      eyebrow="Hukuki"
      title="KVKK Aydınlatma Metni"
      versionLine={`Yürürlük tarihi: ${LEGAL.kvkk.version}`}
      draftNotice={
        <>
          <strong>Taslak</strong> — bu metin henüz hukukçu incelemesinden geçmemiştir.
        </>
      }
    >
      <LegalSection title="1. Veri sorumlusu">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca, hesap
          e-posta adresinize ilişkin veri sorumlusu, Konya merkezli{' '}
          <strong>Voldi Creative</strong>{' '}
          <span className={styles.placeholder}>
            [tam ticaret unvanı, MERSİS/vergi no ve açık adres — teyit edilecek]
          </span>
          &apos;dır (&ldquo;Mailmyra&rdquo;, &ldquo;biz&rdquo;).
        </p>
      </LegalSection>

      <LegalSection title="2. Bu metnin kapsamı">
        <p>
          Bu aydınlatma metni, Mailmyra e-posta imzası oluşturma ve barındırma hizmetini
          kullanırken işlenen kişisel verileri, işleme amaçlarını, aktarıldığı yerleri ve KVKK
          madde 11 kapsamındaki haklarınızı açıklar.
        </p>
      </LegalSection>

      <LegalSection title="3. İşlenen kişisel veri kategorileri">
        <ul>
          <li>
            <strong>Hesap sahibinin verisi:</strong> hesap açarken verdiğiniz e-posta adresi ve
            (şifrenizin kendisi değil, geri döndürülemez şekilde özetlenmiş) şifre karması.
          </li>
          <li>
            <strong>Çalışan verisi (müşteri tarafından girilen):</strong> imza oluşturucuya
            girdiğiniz ad, ünvan, departman, şirket, telefon, e-posta, web sitesi, adres ve
            benzeri iletişim bilgileri — bunlar sizin (işvereninizin) çalışanlarınıza ait
            verilerdir.
          </li>
          <li>
            <strong>Yüklenen görseller:</strong> logo, profil fotoğrafı ve el imzası görselleri,
            <code> cdn.mailmyra.com</code> üzerinde barındırılır.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Veri işleyen / veri sorumlusu ayrımı">
        <p>
          Hesap e-postanız için Mailmyra <strong>veri sorumlusudur</strong>. Ancak imza
          oluşturucuya girdiğiniz çalışan ad/ünvan/e-posta bilgileri için durum farklıdır:
          bu veriler sizin çalışanlarınıza ait olduğundan, o veriler bakımından{' '}
          <strong>siz (işvereniniz) veri sorumlusu</strong>, <strong>Mailmyra ise yalnızca
          veri işleyen</strong> sıfatıyla hareket eder — veriyi yalnızca sizin talimatınızla,
          imza üretmek ve hesabınızda saklamak amacıyla işler. Çalışanlarınızın kendi KVKK
          talepleri için önce işvereni olarak size (veri sorumlusuna) başvurmaları gerekir.
        </p>
      </LegalSection>

      <LegalSection title="5. İşleme amaçları">
        <ul>
          <li>Hizmetin sunulması (imza oluşturma, önizleme, dışa aktarma).</li>
          <li>Kimlik doğrulama ve hesap güvenliği (oturum açma, şifre sıfırlama).</li>
          <li>
            İşlemsel e-posta gönderimi (e-posta doğrulama, davet, şifre sıfırlama bildirimleri) —
            pazarlama veya reklam amaçlı e-posta gönderilmez.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Hukuki sebep">
        <p>
          Hesap verileriniz, aramızdaki hizmet sözleşmesinin kurulması ve ifası için
          (KVKK m. 5/2-c) işlenir. Çalışan verileri, sizinle aramızdaki hizmet sözleşmesi
          kapsamında, sizin talimatınızla ve sizin adınıza işlenir.
        </p>
      </LegalSection>

      <LegalSection title="7. Aktarım">
        <p>
          Kişisel veriler yurt içinde, kendi sunucularımızda barındırılır. Verileriniz
          reklam, analitik veya profil çıkarma amacıyla hiçbir üçüncü tarafla paylaşılmaz;
          sitede ve panelde üçüncü taraf analitik veya izleme betiği çalışmaz. Veriler yalnızca
          hizmetin çalışması için zorunlu olan barındırma ve e-posta gönderim altyapısı ile
          paylaşılır.
        </p>
      </LegalSection>

      <LegalSection title="8. Saklama ve imha süresi">
        <p>
          Verileriniz, hesabınız var olduğu sürece saklanır. Hesabınızı sildiğinizde işlem{' '}
          <strong>geri alınamaz</strong>: gönderici kayıtları, imzalar ve{' '}
          <strong>cdn.mailmyra.com üzerindeki tüm görseller dahil</strong> olmak üzere her şey
          tamamen imha edilir. Bu, o ana kadar alıcıların e-posta istemcilerine yapıştırılmış
          imzalardaki görsellerin kırık görünmeye başlayacağı anlamına gelir — silme işlemi
          bilinçli olarak tam ve geri dönüşsüzdür.
        </p>
      </LegalSection>

      <LegalSection title="9. Çerezler">
        <p>
          Yalnızca oturumunuzu açık tutan, hizmetin çalışması için zorunlu tek bir oturum
          çerezi kullanılır. Analitik, pazarlama veya izleme amaçlı hiçbir çerez
          kullanılmadığından ayrı bir çerez onay bandına ihtiyaç yoktur.
        </p>
      </LegalSection>

      <LegalSection title="10. KVKK madde 11 kapsamındaki haklarınız">
        <p>Kişisel verisi işlenen ilgili kişi olarak aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verinizin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
          <li>
            KVKK m. 7&apos;deki şartlar oluştuğunda silinmesini veya yok edilmesini isteme,
          </li>
          <li>
            Düzeltme/silme işlemlerinin, verinin aktarıldığı üçüncü kişilere bildirilmesini
            isteme,
          </li>
          <li>
            İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize
            bir sonuç ortaya çıkmasına itiraz etme,
          </li>
          <li>
            Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep
            etme.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Başvuru yolu">
        <p>
          Yukarıdaki haklarınızı kullanmak için talebinizi{' '}
          <span className={styles.placeholder}>[başvuru e-posta adresi — teyit edilecek]</span>{' '}
          adresine, kimliğinizi tespit edecek bilgilerle birlikte yazılı olarak iletebilirsiniz.
          Talebiniz, niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır.
        </p>
      </LegalSection>

      <LegalSection title="12. Değişiklikler">
        <p>
          Bu metin değiştiğinde yukarıdaki yürürlük tarihi güncellenir — tek kaynağı kod
          tabanımızdaki <code>lib/legal-links.ts</code> dosyasıdır. İngilizce sürümler için bkz.{' '}
          <a href={LEGAL.terms.path}>Terms of Service</a> ve{' '}
          <a href={LEGAL.privacy.path}>Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}

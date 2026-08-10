/**
 * Gönderim soyutlaması.
 *
 * Sağlayıcı kararı açık (Plesk SMTP / Google Workspace / başkası). Bu yüzden
 * uygulamanın gördüğü tek şey `Mailer`; altındakinin standart SMTP konuştuğu
 * varsayılıyor ve sağlayıcı bilgisi ortam değişkenlerinden geliyor. Sağlayıcıya
 * özel bir SDK'ya bağlanmıyoruz — dönmek istediğimizde tek ayar değişecek,
 * tek satır kod değil.
 */

/** Şablonların ürettiği kısım. Alıcıyı çağıran belirler. */
export interface MailBody {
  subject: string;
  html: string;
  text: string;
}

export interface OutgoingMail extends MailBody {
  to: string;
}

export interface Mailer {
  /** Hangi taşıyıcının devrede olduğu — log'da ve testte teşhis için. */
  readonly kind: 'smtp' | 'log' | 'memory';
  send(mail: OutgoingMail): Promise<void>;
}

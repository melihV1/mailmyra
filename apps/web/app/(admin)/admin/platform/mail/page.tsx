import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminPlatform } from '../../../../../lib/i18n/dict/admin-platform';
import { MailDeliveryView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

/** Task 12 backfill — önceden `metadata` yoktu; başlık menü adıyla aynı. */
export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.platformMailDelivery} — Mailmyra staff` };
}

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminPlatform[lang].pages.mail;
  return (
    <PlatformPage
      path="/admin/platform/mail"
      crumb={`${nav.platform} / ${nav.platformMailDelivery}`}
      title={nav.platformMailDelivery}
      support={t.support}
      render={(source) => <MailDeliveryView source={source} />}
    />
  );
}

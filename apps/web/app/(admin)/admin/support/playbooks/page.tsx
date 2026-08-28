import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminSupport } from '../../../../../lib/i18n/dict/admin-support';
import { SupportPlaybooksView } from '../../../ui/SupportOperationsViews';
import { SupportPage } from '../SupportPage';

/** Task 12 backfill — önceden `metadata` yoktu; başlık menü adıyla aynı. */
export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.supportPlaybooks} — Mailmyra staff` };
}

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSupport[lang].pages.playbooks;
  return (
    <SupportPage
      path="/admin/support/playbooks"
      crumb={`${nav.support} / ${nav.supportPlaybooks}`}
      title={nav.supportPlaybooks}
      support={t.support}
      render={() => <SupportPlaybooksView />}
    />
  );
}

import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminSupport } from '../../../../../lib/i18n/dict/admin-support';
import { SupportOnboardingView } from '../../../ui/SupportOperationsViews';
import { SupportPage } from '../SupportPage';

/** Task 12 backfill — önceden `metadata` yoktu; başlık menü adıyla aynı. */
export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.supportOnboarding} — Mailmyra staff` };
}

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSupport[lang].pages.onboarding;
  return (
    <SupportPage
      path="/admin/support/onboarding"
      crumb={`${nav.support} / ${nav.supportOnboarding}`}
      title={nav.supportOnboarding}
      support={t.support}
      render={(source, now) => <SupportOnboardingView source={source} now={now} />}
    />
  );
}

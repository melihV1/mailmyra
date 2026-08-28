import { getLang } from '../../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../../lib/i18n/dict/admin-nav';
import { adminGrowth } from '../../../../../../lib/i18n/dict/admin-growth';
import { PagesSeoView } from '../../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../../GrowthPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.growthPagesSeo} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminGrowth[lang].pages.pagesSeo;
  return (
    <GrowthPage
      path="/admin/growth/content/pages"
      crumb={`${nav.growth} / ${nav.growthPagesSeo}`}
      title={nav.growthPagesSeo}
      support={t.support}
      render={() => <PagesSeoView />}
    />
  );
}

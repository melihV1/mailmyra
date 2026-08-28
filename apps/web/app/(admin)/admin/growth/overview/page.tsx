import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminGrowth } from '../../../../../lib/i18n/dict/admin-growth';
import { GrowthOverviewView } from '../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../GrowthPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.growthOverview} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminGrowth[lang].pages.overview;
  return (
    <GrowthPage
      path="/admin/growth/overview"
      crumb={`${nav.growth} / ${t.crumbLeaf}`}
      title={nav.growthOverview}
      support={t.support}
      render={(source, now) => <GrowthOverviewView source={source} now={now} />}
    />
  );
}

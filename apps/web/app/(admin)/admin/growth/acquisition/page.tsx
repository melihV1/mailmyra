import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminGrowth } from '../../../../../lib/i18n/dict/admin-growth';
import { AcquisitionView } from '../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../GrowthPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.growthAcquisition} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminGrowth[lang].pages.acquisition;
  return (
    <GrowthPage
      path="/admin/growth/acquisition"
      crumb={`${nav.growth} / ${nav.growthAcquisition}`}
      title={nav.growthAcquisition}
      support={t.support}
      render={(source, now) => <AcquisitionView source={source} now={now} />}
    />
  );
}

import { getLang } from '../../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../../lib/i18n/dict/admin-nav';
import { adminGrowth } from '../../../../../../lib/i18n/dict/admin-growth';
import { MediaLibraryView } from '../../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../../GrowthPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.growthMediaLibrary} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminGrowth[lang].pages.mediaLibrary;
  return (
    <GrowthPage
      path="/admin/growth/content/media"
      crumb={`${nav.growth} / ${nav.growthMediaLibrary}`}
      title={nav.growthMediaLibrary}
      support={t.support}
      render={() => <MediaLibraryView />}
    />
  );
}

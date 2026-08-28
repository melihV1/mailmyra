import { getLang } from '../../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../../lib/i18n/dict/admin-nav';
import { adminGrowth } from '../../../../../../lib/i18n/dict/admin-growth';
import { LegalContentView } from '../../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../../GrowthPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.growthLegalContent} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminGrowth[lang].pages.legalContent;
  return (
    <GrowthPage
      path="/admin/growth/content/legal"
      crumb={`${nav.growth} / ${nav.growthLegalContent}`}
      title={nav.growthLegalContent}
      support={t.support}
      render={() => <LegalContentView />}
    />
  );
}

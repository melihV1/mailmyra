import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminPlatform } from '../../../../../lib/i18n/dict/admin-platform';
import { ExportPipelineView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

/** Task 12 backfill — önceden `metadata` yoktu; başlık menü adıyla aynı. */
export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.platformExportPipeline} — Mailmyra staff` };
}

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminPlatform[lang].pages.exports;
  return (
    <PlatformPage
      path="/admin/platform/exports"
      crumb={`${nav.platform} / ${nav.platformExportPipeline}`}
      title={nav.platformExportPipeline}
      support={t.support}
      render={(source) => <ExportPipelineView source={source} />}
    />
  );
}

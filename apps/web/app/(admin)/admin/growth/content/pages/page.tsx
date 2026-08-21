import { PagesSeoView } from '../../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../../GrowthPage';

export const metadata = { title: 'Pages & SEO — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <GrowthPage path="/admin/growth/content/pages" crumb="Growth & content / Pages & SEO" title="Pages & SEO" support="Review the source-owned public route and metadata registry." render={() => <PagesSeoView />} />;
}

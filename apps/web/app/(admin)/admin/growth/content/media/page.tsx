import { MediaLibraryView } from '../../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../../GrowthPage';

export const metadata = { title: 'Media library — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <GrowthPage path="/admin/growth/content/media" crumb="Growth & content / Media library" title="Media library" support="Inventory approved public brand media without exposing customer assets." render={() => <MediaLibraryView />} />;
}

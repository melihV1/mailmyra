import { MediaLibraryView } from '../../../../../(admin)/ui/GrowthOperationsViews';
import { GrowthPreviewPage } from '../../GrowthPreviewPage';

export default function Page() { return <GrowthPreviewPage crumb="Growth & content / Media library" title="Media library" support="Inventory approved public brand media without exposing customer assets." render={() => <MediaLibraryView preview />} />; }

import { MailDeliveryView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / Mail delivery" title="Mail delivery" support="Review transactional delivery outcomes without exposing message content." render={(source) => <MailDeliveryView source={source} preview />} />; }

import { MailDeliveryView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/mail" crumb="Platform / Mail delivery" title="Mail delivery" support="Review transactional delivery outcomes without exposing message content." render={(source) => <MailDeliveryView source={source} />} />; }

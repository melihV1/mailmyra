import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { DataRequestsView } from '../../../../(admin)/ui/GovernanceOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewDataRequests, previewNow } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Security & governance / KVKK requests" title="KVKK requests" support="Preview statutory data-subject work with ownership, due dates and evidence." /><DataRequestsView rows={previewDataRequests} now={previewNow} preview /></section></PreviewFrame>; }

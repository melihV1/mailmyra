import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { ApprovalsView } from '../../../../(admin)/ui/GovernanceOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewApprovals } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Security & governance / Approvals" title="Approvals" support="Preview the future controlled decision queue for high-risk administrative changes." /><ApprovalsView rows={previewApprovals} preview /></section></PreviewFrame>; }

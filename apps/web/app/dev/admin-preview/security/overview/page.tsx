import { notFound } from 'next/navigation';

import { buildGovernanceOverview } from '../../../../(admin)/governance-overview-model';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { SecurityOverviewView } from '../../../../(admin)/ui/GovernanceOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewGovernanceAccess, previewGovernanceActions } from '../../governance-fixtures';
import { previewApprovals, previewDataRequests, previewNow, previewStaff } from '../../operations-fixtures';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  const snapshot = buildGovernanceOverview({ staff: previewStaff, access: previewGovernanceAccess, actions: previewGovernanceActions, approvals: previewApprovals, requests: previewDataRequests, now: previewNow, sources: { staff: true, access: true, actions: true, approvals: true, requests: true } });
  return <PreviewFrame><section><AdminPageHeader crumb="Security & governance / Overview" title="Security overview" support="Monitor staff access, privileged change evidence, decision policy and statutory work from one source-aware control surface." /><SecurityOverviewView snapshot={snapshot} preview /></section></PreviewFrame>;
}

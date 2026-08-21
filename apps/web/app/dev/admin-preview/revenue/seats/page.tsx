import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { SeatLedgerView } from '../../../../(admin)/ui/RevenueOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewOrganizations } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Revenue / Seat ledger" title="Seat ledger" support="Compare authoritative active seats with the entitlement assigned to each billing organization." /><SeatLedgerView rows={previewOrganizations} /></section></PreviewFrame>; }

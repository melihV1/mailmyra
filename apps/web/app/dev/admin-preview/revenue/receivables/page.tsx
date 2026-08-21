import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { ReceivablesView } from '../../../../(admin)/ui/RevenueOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewInvoices, previewNow } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Revenue / Receivables" title="Receivables" support="Prioritize open balances by due date and aging without mixing currency ledgers." /><ReceivablesView rows={previewInvoices} now={previewNow} /></section></PreviewFrame>; }

import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { RevenueOverviewView } from '../../../../(admin)/ui/RevenueOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewInvoices, previewNow, previewOrganizations } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Revenue / Overview" title="Revenue overview" support="Read recorded billing performance by currency, customer and invoice status." /><RevenueOverviewView invoices={previewInvoices} organizations={previewOrganizations} now={previewNow} /></section></PreviewFrame>; }

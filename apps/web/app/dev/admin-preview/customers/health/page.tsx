import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { CustomerHealthView } from '../../../../(admin)/ui/CustomerOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewNow, previewOrganizations } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Customers / Health" title="Customer health" support="Use explainable operational signals to focus intervention work; no opaque churn score." /><CustomerHealthView rows={previewOrganizations} now={previewNow} /></section></PreviewFrame>; }

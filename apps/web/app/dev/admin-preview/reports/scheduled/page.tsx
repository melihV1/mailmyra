import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { ScheduledReportsView } from '../../../../(admin)/ui/ReportingOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewNow } from '../../operations-fixtures';
import { previewReportSchedules } from '../../reporting-fixtures';
export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Reports / Scheduled" title="Scheduled reports" support="Govern report cadence, recipients, delivery format and execution history." /><ScheduledReportsView rows={previewReportSchedules} now={previewNow} preview /></section></PreviewFrame>; }

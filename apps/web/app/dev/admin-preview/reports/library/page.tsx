import { notFound } from 'next/navigation';
import { REPORT_LIBRARY } from '../../../../(admin)/reporting-model';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { ReportLibraryView } from '../../../../(admin)/ui/ReportingOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Reports / Library" title="Report library" support="Use a governed catalog of operating reports with explicit owners, sources and metric contracts." /><ReportLibraryView rows={REPORT_LIBRARY} /></section></PreviewFrame>; }

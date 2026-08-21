import { notFound } from 'next/navigation';
import { KPI_DEFINITIONS } from '../../../../(admin)/reporting-model';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { KpiDefinitionsView } from '../../../../(admin)/ui/ReportingOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Reports / KPI definitions" title="KPI definitions" support="Keep formulas, denominators, sources, grain, freshness and interpretation guardrails in one shared dictionary." /><KpiDefinitionsView rows={KPI_DEFINITIONS} /></section></PreviewFrame>; }

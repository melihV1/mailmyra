import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { StaffRolesView } from '../../../../(admin)/ui/GovernanceOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewStaff } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Security & governance / Staff" title="Staff and roles" support="Review control-plane accounts and the current permission boundary." /><StaffRolesView rows={previewStaff} /></section></PreviewFrame>; }

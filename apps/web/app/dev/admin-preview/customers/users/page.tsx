import { notFound } from 'next/navigation';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { CustomerUsersView } from '../../../../(admin)/ui/CustomerOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewUsers } from '../../operations-fixtures';

export default function Page() { if (process.env.NODE_ENV === 'production') notFound(); return <PreviewFrame><section><AdminPageHeader crumb="Customers / Users" title="Customer users" support="Find customer identities and workspace membership without exposing edit controls." /><CustomerUsersView rows={previewUsers} /></section></PreviewFrame>; }

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import type { PlatformOperationsSnapshot } from '../../../(admin)/platform-operations-model';
import { AdminPageHeader } from '../../../(admin)/ui/AdminPageHeader';
import { PreviewFrame } from '../PreviewFrame';
import { platformPreviewSource } from '../platform-fixtures';

export function PlatformPreviewPage({ crumb, title, support, render }: { crumb: string; title: string; support: string; render: (source: PlatformOperationsSnapshot) => ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PreviewFrame><section><AdminPageHeader crumb={crumb} title={title} support={support} />{render(platformPreviewSource)}</section></PreviewFrame>;
}

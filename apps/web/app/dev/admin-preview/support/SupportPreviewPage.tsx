import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import type { ProductAnalyticsSnapshot } from '../../../(admin)/product-analytics-model';
import { AdminPageHeader } from '../../../(admin)/ui/AdminPageHeader';
import { PreviewFrame } from '../PreviewFrame';
import { productPreviewNow, productPreviewSource } from '../product-fixtures';

export function SupportPreviewPage({ crumb, title, support, render }: { crumb: string; title: string; support: string; render: (source: ProductAnalyticsSnapshot, now: number) => ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PreviewFrame><section><AdminPageHeader crumb={crumb} title={title} support={support} />{render(productPreviewSource, productPreviewNow)}</section></PreviewFrame>;
}

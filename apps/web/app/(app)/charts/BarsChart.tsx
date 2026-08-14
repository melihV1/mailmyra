'use client';

import { useEffect, useRef } from 'react';
import type ApexCharts from 'apexcharts';

/**
 * Yuvarlak köşeli çubuk grafik — temanın dashboard'larındaki haftalık
 * seri dili. Ayrıntılar için DonutChart'taki notlara bak (SSR, tema
 * değişimi, ApexCharts kararı).
 */
export function BarsChart({
  categories,
  seriesName,
  data,
  color,
  height = 220,
}: {
  categories: string[];
  seriesName: string;
  data: number[];
  color: string;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const dataKey = JSON.stringify(data);

  useEffect(() => {
    let chart: ApexCharts | null = null;
    let observer: MutationObserver | null = null;
    let cancelled = false;

    void (async () => {
      const { default: Apex } = await import('apexcharts');
      if (cancelled || !el.current) return;
      const foreColor = () => (el.current ? getComputedStyle(el.current).color : '#6d6b77');

      const instance = new Apex(el.current, {
        chart: {
          type: 'bar',
          height,
          foreColor: foreColor(),
          parentHeightOffset: 0,
          toolbar: { show: false },
        },
        series: [{ name: seriesName, data }],
        colors: [color],
        plotOptions: {
          bar: { columnWidth: '42%', borderRadius: 6, borderRadiusApplication: 'end' },
        },
        dataLabels: { enabled: false },
        xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) }, tickAmount: 3 },
        grid: { strokeDashArray: 6, padding: { top: -8 } },
        tooltip: { y: { formatter: (v: number) => String(Math.round(v)) } },
      });
      chart = instance;
      await instance.render();

      const panel = el.current.closest('.mm-panel');
      if (panel) {
        observer = new MutationObserver(() => {
          instance.updateOptions({ chart: { foreColor: foreColor() } });
        });
        observer.observe(panel, { attributes: true, attributeFilter: ['data-bs-theme'] });
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      chart?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- diziler içerikçe karşılaştırılır
  }, [dataKey, seriesName, color, height]);

  return <div ref={el} />;
}

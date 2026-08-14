'use client';

import { useEffect, useRef } from 'react';
import type ApexCharts from 'apexcharts';

/**
 * Küçük donut sarmalayıcısı — ApexCharts (jQuery değil; karar 2026-08-13,
 * temanın kendi grafik kütüphanesi). SSR'da window yok, o yüzden dinamik
 * import + yalnız istemcide render. Tema değişince (data-bs-theme) yazı
 * renkleri MutationObserver ile tazelenir — kütüphane CSS değişkeni okumaz.
 */
export function DonutChart({
  labels,
  series,
  colors,
  centerLabel,
  height = 200,
}: {
  labels: string[];
  series: number[];
  colors: string[];
  centerLabel: string;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const seriesKey = JSON.stringify(series);

  useEffect(() => {
    let chart: ApexCharts | null = null;
    let observer: MutationObserver | null = null;
    let cancelled = false;

    void (async () => {
      const { default: Apex } = await import('apexcharts');
      if (cancelled || !el.current) return;
      const foreColor = () => (el.current ? getComputedStyle(el.current).color : '#6d6b77');

      const instance = new Apex(el.current, {
        chart: { type: 'donut', height, foreColor: foreColor(), parentHeightOffset: 0 },
        labels,
        series,
        colors,
        stroke: { width: 0 },
        legend: { position: 'bottom' },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: '75%',
              labels: {
                show: true,
                name: { show: true, offsetY: 20, fontSize: '13px' },
                value: { show: true, offsetY: -16, fontSize: '22px', fontWeight: 600 },
                total: {
                  show: true,
                  label: centerLabel,
                  formatter: () => String(series.reduce((a, b) => a + b, 0)),
                },
              },
            },
          },
        },
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
  }, [seriesKey, centerLabel, height]);

  return <div ref={el} />;
}

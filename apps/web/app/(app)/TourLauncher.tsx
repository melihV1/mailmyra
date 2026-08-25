'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { useLang } from '../../lib/i18n/LangProvider';
import { nav } from '../../lib/i18n/dict/nav';
import type { Lang } from '../../lib/i18n/types';

/**
 * Panel turu — temanın Extended UI "Tour" bileşeni (driver.js, MIT; jQuery
 * değil). Dashboard'a konur: yeni hesap ilk gelişte otomatik başlar
 * (localStorage bekçisi), sonra Getting started kartındaki düğmeden her an
 * yeniden izlenir. Hedef seçiciler kabuğun sabit kancaları.
 *
 * Bildirim zili seçicisi ID'ye bağlı (#tour-notifications), aria-label metin
 * eşleşmesine DEĞİL — aria-label artık dile göre değişiyor ("Notifications"/
 * "Bildirimler"), metin eşleşmesi TR'de kırılırdı.
 */

const TOUR_KEY = 'mm-tour-done';

function startTour(lang: Lang) {
  const t = nav[lang].tour;
  localStorage.setItem(TOUR_KEY, '1');
  driver({
    showProgress: true,
    nextBtnText: t.next,
    prevBtnText: t.back,
    doneBtnText: t.done,
    steps: [
      {
        element: '#layout-menu',
        popover: {
          title: t.menu.title,
          description: t.menu.description,
          side: 'right',
        },
      },
      {
        element: '#tour-seats',
        popover: {
          title: t.seats.title,
          description: t.seats.description,
        },
      },
      {
        element: '#tour-quick',
        popover: {
          title: t.quick.title,
          description: t.quick.description,
        },
      },
      {
        element: '#tour-notifications',
        popover: {
          title: t.notifications.title,
          description: t.notifications.description,
          side: 'bottom',
        },
      },
      {
        element: '.navbar-search-wrapper',
        popover: {
          title: t.search.title,
          description: t.search.description,
          side: 'bottom',
        },
      },
    ],
  }).drive();
}

export function TourLauncher() {
  const lang = useLang();

  // İlk geliş: tur bir kez kendiliğinden — sonrası düğmeye kalır.
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) startTour(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız ilk gelişte, dil sonradan değişse de tekrar tetiklenmesin
  }, []);

  return (
    <button type="button" className="btn btn-sm btn-label-primary" onClick={() => startTour(lang)}>
      <i className="icon-base ti tabler-route me-1" aria-hidden="true" />
      {nav[lang].tour.startTour}
    </button>
  );
}

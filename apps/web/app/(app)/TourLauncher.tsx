'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/**
 * Panel turu — temanın Extended UI "Tour" bileşeni (driver.js, MIT; jQuery
 * değil). Dashboard'a konur: yeni hesap ilk gelişte otomatik başlar
 * (localStorage bekçisi), sonra Getting started kartındaki düğmeden her an
 * yeniden izlenir. Hedef seçiciler kabuğun sabit kancaları.
 */

const TOUR_KEY = 'mm-tour-done';

function startTour() {
  localStorage.setItem(TOUR_KEY, '1');
  driver({
    showProgress: true,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    steps: [
      {
        element: '#layout-menu',
        popover: {
          title: 'Your menu',
          description:
            'Everything lives here — signatures, senders, members and brand settings.',
          side: 'right',
        },
      },
      {
        element: '#tour-seats',
        popover: {
          title: 'Seats',
          description:
            'A seat is used only while a sender is live. Drafts are always free.',
        },
      },
      {
        element: '#tour-quick',
        popover: {
          title: 'Quick actions',
          description: 'Jump straight into the builder or add your first sender from here.',
        },
      },
      {
        element: '[aria-label^="Notifications"]',
        popover: {
          title: 'Notifications',
          description: 'Publishes, invitations and seat warnings land on this bell.',
          side: 'bottom',
        },
      },
      {
        element: '.navbar-search-wrapper',
        popover: {
          title: 'Search',
          description: 'Press Ctrl+K (⌘K) anywhere to find signatures, senders or pages.',
          side: 'bottom',
        },
      },
    ],
  }).drive();
}

export function TourLauncher() {
  // İlk geliş: tur bir kez kendiliğinden — sonrası düğmeye kalır.
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) startTour();
  }, []);

  return (
    <button type="button" className="btn btn-sm btn-label-primary" onClick={startTour}>
      <i className="icon-base ti tabler-route me-1" aria-hidden="true" />
      Start tour
    </button>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Bootstrap JS'siz dropdown durumu: aç/kapa + dışarı tıklamada kapanış.
 * Her menü kendi durumunu taşır — başka bir menünün düğmesine tıklamak
 * "dışarı" sayıldığı için aynı anda iki menü açık kalamaz.
 */
export function useDropdown<T extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return { open, setOpen, ref };
}

'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Tema toast'ları (ui-toasts; Hüseyin, 2026-08-14): başarı geri bildirimleri
 * artık sağ alttan tonlu toast olarak düşer. HATALAR toast DEĞİL — formda
 * kalır (kullanıcı düzeltecek şeyin yanında görsün). Bootstrap JS yok;
 * yığın React state'i, 4.5 sn'de kendiliğinden düşer, X ile erken kapanır.
 */

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'primary';

interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  message: string;
}

const TONE_ICON: Record<Tone, string> = {
  success: 'tabler-check',
  danger: 'tabler-alert-triangle',
  warning: 'tabler-alert-triangle',
  info: 'tabler-info-circle',
  primary: 'tabler-bell',
};

const DEFAULT_TITLE: Record<Tone, string> = {
  success: 'Success',
  danger: 'Something went wrong',
  warning: 'Heads up',
  info: 'Info',
  primary: 'Mailmyra',
};

const TOAST_MS = 4500;

const ToastContext = createContext<(tone: Tone, message: string, title?: string) => void>(() => {
  /* sağlayıcı dışında sessiz — panel dışı bileşen yanlışlıkla çağırırsa kırılmasın */
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (tone: Tone, message: string, title?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, title: title ?? DEFAULT_TITLE[tone], message }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Konum sol üst (Hüseyin, 2026-08-14) — ofsetler panel-overrides'ta:
          navbar'ın altına, sidebar'ın sağına düşer, ray moduna uyum sağlar. */}
      <div className="toast-container mm-toast-container d-grid gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`bs-toast toast fade show bg-${t.tone}`} role="status">
            <div className="toast-header">
              <i className={`icon-base ti ${TONE_ICON[t.tone]} icon-sm me-2`} aria-hidden="true" />
              <div className="me-auto fw-medium">{t.title}</div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => dismiss(t.id)}
              />
            </div>
            <div className="toast-body">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

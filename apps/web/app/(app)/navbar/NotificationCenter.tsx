'use client';

import { useEffect, useState } from 'react';

import { useBsPresence } from '../../../components/ui/useBsPresence';
import { NOTIFICATION_LOOKS, timeAgo } from '../notification-looks';

/**
 * Bildirim merkezi — temanın offcanvas'ı (sağdan tam boy panel; Hüseyin,
 * 2026-08-14). Zil kısa listedir; "View all" buraya açılır: gün gruplu tam
 * liste. Bootstrap JS yok — açık/kapalı React'ten, Escape ve zemin tıkı kapatır.
 */

interface NotificationItem {
  id: string;
  type: 'sender_published' | 'seat_warning' | 'invitation_accepted';
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

/** Gün başlığı: Today / Yesterday / 12 Aug 2026 — panel dili EN. */
function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  // Tema geçişi: `show`suz mount → reflow → `show` (sağdan kayarak girer);
  // kapanışta `show` düşer, panel kayarak çıkınca DOM'dan kalkar.
  const { mounted, shown } = useBsPresence(open);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    void fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { items: NotificationItem[] } | null) => {
        if (body) setItems(body.items);
      })
      .catch(() => setItems([]));

    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);

  if (!mounted) return null;

  const groups: Array<{ label: string; items: NotificationItem[] }> = [];
  for (const n of items ?? []) {
    const label = dayLabel(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <>
      <div
        className={`offcanvas offcanvas-end${shown ? ' show' : ''}`}
        style={{ visibility: 'visible' }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">Notifications</h5>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="offcanvas-body p-0">
          {items === null ? (
            <div className="p-4">
              {[1, 2, 3].map((k) => (
                <div key={k} className="placeholder-glow mb-4">
                  <span className="placeholder col-3 d-block mb-2" />
                  <span className="placeholder col-10 d-block" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-body-secondary">
              Nothing yet — publishes, invitations and seat warnings will show up here.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <h6 className="text-uppercase small text-body-secondary px-4 pt-4 pb-1 mb-0">
                  {g.label}
                </h6>
                <ul className="list-unstyled mb-0">
                  {g.items.map((n) => {
                    const look = NOTIFICATION_LOOKS[n.type];
                    return (
                      <li key={n.id} className="d-flex align-items-start gap-3 px-4 py-3">
                        <div className="avatar avatar-sm flex-shrink-0">
                          <span className={`avatar-initial rounded-circle bg-label-${look.tone}`}>
                            <i
                              className={`icon-base ti ${look.icon} icon-18px`}
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                        <div className="flex-grow-1">
                          <span className="d-block fw-medium text-heading small">
                            {look.title}
                            {!n.readAt && (
                              <span className="badge badge-dot bg-primary ms-2" aria-label="Unread" />
                            )}
                          </span>
                          <small className="text-body-secondary d-block">
                            {look.body(n.payload)}
                          </small>
                          <small className="text-body-secondary">{timeAgo(n.createdAt)}</small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
      <div className={`offcanvas-backdrop fade${shown ? ' show' : ''}`} onClick={onClose} />
    </>
  );
}

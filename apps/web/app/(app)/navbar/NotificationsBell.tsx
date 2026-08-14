'use client';

import { useCallback, useEffect, useState } from 'react';

import { NOTIFICATION_LOOKS, timeAgo } from '../notification-looks';
import { useDropdown } from './useDropdown';

/**
 * Zil — kalıcı Notification tablosundan beslenir (karar 2026-08-13,
 * "türetilmiş değil gerçek tablo"). Rozet girişte bir kez, liste menü
 * açılınca çekilir; "Mark all as read" rozeti sıfırlar. Görünüm sözlüğü
 * dashboard'daki Activity kartıyla ORTAK (notification-looks.ts).
 */

interface NotificationItem {
  id: string;
  type: 'sender_published' | 'seat_warning' | 'invitation_accepted';
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsBell() {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const body = (await res.json()) as { items: NotificationItem[]; unread: number };
      setItems(body.items);
      setUnread(body.unread);
    } catch {
      // zil süs değil ama kritik de değil — sessiz kal, sonraki açılışta dene
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const markAll = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setUnread(0);
      setItems((prev) =>
        prev ? prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) : prev,
      );
    } catch {
      /* bir sonraki açılış düzeltir */
    }
  };

  return (
    <li className="nav-item dropdown me-3 me-xl-2" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill position-relative"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-bell icon-22px text-heading" aria-hidden="true" />
        {unread > 0 && (
          <span
            className="badge rounded-pill bg-danger position-absolute top-0 end-0"
            style={{ fontSize: 10, transform: 'translate(25%,-15%)' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <div
        className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`}
        style={{ minWidth: 340 }}
      >
        <div className="dropdown-menu-header border-bottom">
          <div className="dropdown-header d-flex align-items-center py-3">
            <h6 className="mb-0 me-auto">Notifications</h6>
            {unread > 0 && (
              <>
                <span className="badge bg-label-primary me-2">{unread} new</span>
                <button
                  type="button"
                  className="btn btn-sm btn-text-secondary rounded-pill btn-icon"
                  title="Mark all as read"
                  onClick={() => void markAll()}
                >
                  <i className="icon-base ti tabler-mail-opened icon-20px" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        <ul className="list-unstyled mb-0" style={{ maxHeight: 380, overflowY: 'auto' }}>
          {items === null ? (
            <li className="py-4 px-4 text-center text-body-secondary">Loading…</li>
          ) : items.length === 0 ? (
            <li className="py-4 px-4 text-center text-body-secondary">
              You&apos;re all caught up.
            </li>
          ) : (
            items.map((n) => {
              const look = NOTIFICATION_LOOKS[n.type];
              return (
                <li
                  key={n.id}
                  className={`d-flex align-items-start gap-3 px-4 py-3 border-bottom${n.readAt ? '' : ' bg-lighter'}`}
                >
                  <div className="avatar avatar-sm flex-shrink-0">
                    <span className={`avatar-initial rounded-circle bg-label-${look.tone}`}>
                      <i className={`icon-base ti ${look.icon} icon-18px`} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 small fw-medium">{look.title}</h6>
                    <p className="mb-1 small text-body-secondary">{look.body(n.payload)}</p>
                    <small className="text-body-secondary">{timeAgo(n.createdAt)}</small>
                  </div>
                  {!n.readAt && (
                    <span
                      className="badge badge-dot bg-primary flex-shrink-0 mt-2"
                      aria-label="Unread"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </li>
  );
}

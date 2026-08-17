'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { NOTIFICATION_LOOKS, timeAgo } from '../../notification-looks';
import { useToast } from '../../ToastProvider';

/**
 * Bildirim kutusu (2026-08-15, Hüseyin: zilin "View all"u çalışmıyordu —
 * offcanvas 0 genişlikte açılıyordu; yerine gerçek sayfa).
 *
 * Tema-özel `app-email.css` recolor boru hattında YOK, o yüzden satırlar
 * temanın genel primitifleriyle kuruldu (list-group + form-check + btn-icon);
 * panelin geri kalanıyla aynı yöntem.
 *
 * Liste sunucudan gelir; işlemler sonrası `router.refresh()` ile tazelenir —
 * ikinci bir istemci kopyası tutup senkron tutmaya çalışmıyoruz.
 */

interface Row {
  id: string;
  type: 'sender_published' | 'seat_warning' | 'invitation_accepted';
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export function InboxClient({
  rows,
  unreadOnly,
  unreadTotal,
  readTotal,
}: {
  rows: Row[];
  unreadOnly: boolean;
  unreadTotal: number;
  readTotal: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'selected' | 'read' | null>(null);

  // Seçim yalnız EKRANDAKİ satırlarla kesişir: filtre değişince görünmeyen
  // bir bildirim seçili sayılıp silinmesin (imza tablosundaki kural).
  const visible = new Set(rows.map((r) => r.id));
  const selected = [...picked].filter((id) => visible.has(id));

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setPicked(selected.length === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const call = async (
    path: string,
    payload: Record<string, unknown>,
    done: (count: number) => string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { count?: number };
      setPicked(new Set());
      setConfirming(null);
      toast('success', done(body.count ?? 0));
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const markSelected = (read: boolean) =>
    call('/api/notifications/mark', { ids: selected, read }, (n) =>
      read
        ? `${n} notification${n === 1 ? '' : 's'} marked as read.`
        : `${n} notification${n === 1 ? '' : 's'} marked as unread.`,
    );

  const deleteSelected = () =>
    call('/api/notifications/delete', { ids: selected }, (n) =>
      n === 1 ? 'Notification deleted.' : `${n} notifications deleted.`,
    );

  const deleteRead = () =>
    call('/api/notifications/delete', { readOnly: true }, (n) =>
      n === 1 ? '1 read notification cleared.' : `${n} read notifications cleared.`,
    );

  const markAll = () =>
    call('/api/notifications/read-all', {}, () => 'All notifications marked as read.');

  return (
    <>
      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="card-title mb-0 d-flex align-items-center gap-2">
            {unreadOnly ? 'Unread' : 'All notifications'}
            <span className="badge bg-label-primary">{rows.length}</span>
            {selected.length > 0 && (
              <span className="badge bg-label-info">{selected.length} selected</span>
            )}
          </h5>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Filtre link'lerle: sunucu süzer, JS'siz de çalışır. */}
            <div className="btn-group btn-group-sm" role="group" aria-label="Filter">
              <Link
                href="/app/notifications"
                className={`btn ${unreadOnly ? 'btn-label-secondary' : 'btn-primary'}`}
              >
                All
              </Link>
              <Link
                href="/app/notifications?filter=unread"
                className={`btn ${unreadOnly ? 'btn-primary' : 'btn-label-secondary'}`}
              >
                Unread {unreadTotal > 0 && <span className="ms-1">({unreadTotal})</span>}
              </Link>
            </div>

            {selected.length > 0 ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-label-primary"
                  onClick={() => void markSelected(true)}
                  disabled={busy}
                >
                  <i className="icon-base ti tabler-mail-opened me-1" aria-hidden="true" />
                  Mark read
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-label-secondary"
                  onClick={() => void markSelected(false)}
                  disabled={busy}
                >
                  <i className="icon-base ti tabler-mail me-1" aria-hidden="true" />
                  Mark unread
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-label-danger"
                  onClick={() => setConfirming('selected')}
                  disabled={busy}
                >
                  <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-label-primary"
                  onClick={() => void markAll()}
                  disabled={busy || unreadTotal === 0}
                >
                  <i className="icon-base ti tabler-mail-opened me-1" aria-hidden="true" />
                  Mark all read
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-label-danger"
                  onClick={() => setConfirming('read')}
                  disabled={busy || readTotal === 0}
                >
                  <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
                  Clear read
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 pb-2">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-secondary">
                <i className="icon-base ti tabler-bell-off icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>{unreadOnly ? 'Nothing unread' : 'No notifications yet'}</h5>
            <p className="text-body-secondary mb-0">
              {unreadOnly
                ? 'You are all caught up.'
                : 'Publishes, invitations and seat warnings will show up here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="d-flex align-items-center gap-2 px-4 py-2 border-top border-bottom">
              <input
                type="checkbox"
                className="form-check-input mt-0"
                aria-label="Select all"
                checked={rows.length > 0 && selected.length === rows.length}
                onChange={toggleAll}
              />
              <span className="text-body-secondary small">Select all on this page</span>
            </div>

            <ul className="list-group list-group-flush">
              {rows.map((n) => {
                const look = NOTIFICATION_LOOKS[n.type];
                const isPicked = picked.has(n.id);
                return (
                  <li
                    key={n.id}
                    className={`list-group-item d-flex align-items-start gap-3 py-3${
                      n.readAt ? '' : ' bg-lighter'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input mt-2 flex-shrink-0"
                      aria-label={`Select ${look?.title ?? n.type}`}
                      checked={isPicked}
                      onChange={() => toggle(n.id)}
                    />
                    <div className="avatar avatar-sm flex-shrink-0">
                      <span
                        className={`avatar-initial rounded-circle bg-label-${look?.tone ?? 'secondary'}`}
                      >
                        <i
                          className={`icon-base ti ${look?.icon ?? 'tabler-bell'} icon-18px`}
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      <span className="d-block fw-medium text-heading">
                        {look?.title ?? n.type}
                        {!n.readAt && (
                          <span className="badge badge-dot bg-primary ms-2" aria-label="Unread" />
                        )}
                      </span>
                      <small className="text-body-secondary d-block">
                        {look ? look.body(n.payload) : ''}
                      </small>
                      <small className="text-body-secondary">{timeAgo(n.createdAt)}</small>
                    </div>
                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                        aria-label={n.readAt ? 'Mark as unread' : 'Mark as read'}
                        data-mm-tip={n.readAt ? 'Mark as unread' : 'Mark as read'}
                        disabled={busy}
                        onClick={() =>
                          void call(
                            '/api/notifications/mark',
                            { ids: [n.id], read: !n.readAt },
                            () => (n.readAt ? 'Marked as unread.' : 'Marked as read.'),
                          )
                        }
                      >
                        <i
                          className={`icon-base ti ${n.readAt ? 'tabler-mail' : 'tabler-mail-opened'} icon-md`}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                        aria-label="Delete notification"
                        data-mm-tip="Delete"
                        disabled={busy}
                        onClick={() =>
                          void call('/api/notifications/delete', { ids: [n.id] }, () =>
                            'Notification deleted.',
                          )
                        }
                      >
                        <i className="icon-base ti tabler-trash icon-md" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {confirming === 'selected' && (
        <ConfirmDialog
          title={`Delete ${selected.length} notification${selected.length === 1 ? '' : 's'}?`}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() => void deleteSelected()}
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">
            This clears them from your own list. The workspace{' '}
            <Link href="/app/activity">activity log</Link> keeps the record of what happened.
          </p>
        </ConfirmDialog>
      )}
      {confirming === 'read' && (
        <ConfirmDialog
          title="Clear read notifications?"
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() => void deleteRead()}
          confirmLabel="Clear"
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">
            {readTotal} read notification{readTotal === 1 ? '' : 's'} will be removed from your
            list. Unread ones stay, and the{' '}
            <Link href="/app/activity">activity log</Link> is untouched.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

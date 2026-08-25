'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { common } from '../../../../lib/i18n/dict/common';
import { notifications } from '../../../../lib/i18n/dict/notifications';
import { useLang } from '../../../../lib/i18n/LangProvider';
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
  const lang = useLang();
  const t = notifications[lang].inbox;
  const c = common[lang];
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
        setError(t.genericError);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { count?: number };
      setPicked(new Set());
      setConfirming(null);
      toast('success', done(body.count ?? 0));
      router.refresh();
    } catch {
      setError(t.genericError);
    } finally {
      setBusy(false);
    }
  };

  const markSelected = (read: boolean) =>
    call('/api/notifications/mark', { ids: selected, read }, (n) =>
      read ? t.markedReadPlural(n) : t.markedUnreadPlural(n),
    );

  const deleteSelected = () => call('/api/notifications/delete', { ids: selected }, t.deletedPlural);

  const deleteRead = () =>
    call('/api/notifications/delete', { readOnly: true }, t.clearedReadPlural);

  const markAll = () => call('/api/notifications/read-all', {}, () => t.allMarkedRead);

  return (
    <>
      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="card-title mb-0 d-flex align-items-center gap-2">
            {unreadOnly ? t.unreadHeading : t.allHeading}
            <span className="badge bg-label-primary">{rows.length}</span>
            {selected.length > 0 && (
              <span className="badge bg-label-info">{t.selectedBadge(selected.length)}</span>
            )}
          </h5>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Filtre link'lerle: sunucu süzer, JS'siz de çalışır. */}
            <div className="btn-group btn-group-sm" role="group" aria-label={t.filterAria}>
              <Link
                href="/app/notifications"
                className={`btn ${unreadOnly ? 'btn-label-secondary' : 'btn-primary'}`}
              >
                {t.filterAll}
              </Link>
              <Link
                href="/app/notifications?filter=unread"
                className={`btn ${unreadOnly ? 'btn-primary' : 'btn-label-secondary'}`}
              >
                {t.unread} {unreadTotal > 0 && <span className="ms-1">({unreadTotal})</span>}
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
                  {t.markRead}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-label-secondary"
                  onClick={() => void markSelected(false)}
                  disabled={busy}
                >
                  <i className="icon-base ti tabler-mail me-1" aria-hidden="true" />
                  {t.markUnread}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-label-danger"
                  onClick={() => setConfirming('selected')}
                  disabled={busy}
                >
                  <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
                  {c.delete}
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
                  {t.markAllRead}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-label-danger"
                  onClick={() => setConfirming('read')}
                  disabled={busy || readTotal === 0}
                >
                  <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
                  {t.clearRead}
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
            <h5>{unreadOnly ? t.noUnreadTitle : t.noneTitle}</h5>
            <p className="text-body-secondary mb-0">
              {unreadOnly ? t.allCaughtUp : t.emptyBody}
            </p>
          </div>
        ) : (
          /* Panelin diğer ekranlarıyla AYNI tablo dili (Hüseyin, 2026-08-15:
             "temadaki tabloları kullan") — seyrek list-group yerine yoğun
             `table-hover`; seçim kutusu başlıkta, aksiyonlar son sütunda. */
          <div className="table-responsive text-nowrap">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{ width: '1%' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      aria-label={t.selectAllAria}
                      checked={rows.length > 0 && selected.length === rows.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>{t.colNotification}</th>
                  <th>{t.colDetails}</th>
                  <th>{t.colReceived}</th>
                  <th style={{ width: '1%' }}>{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {rows.map((n) => {
                  const look = NOTIFICATION_LOOKS[lang][n.type];
                  return (
                    <tr key={n.id} className={n.readAt ? undefined : 'bg-lighter'}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={t.selectRowAria(look?.title ?? n.type)}
                          checked={picked.has(n.id)}
                          onChange={() => toggle(n.id)}
                        />
                      </td>
                      <td>
                        <span className="d-flex align-items-center gap-2">
                          <span className="avatar avatar-sm flex-shrink-0">
                            <span
                              className={`avatar-initial rounded-circle bg-label-${look?.tone ?? 'secondary'}`}
                            >
                              <i
                                className={`icon-base ti ${look?.icon ?? 'tabler-bell'} icon-18px`}
                                aria-hidden="true"
                              />
                            </span>
                          </span>
                          <span className="fw-medium text-heading">{look?.title ?? n.type}</span>
                          {!n.readAt && (
                            <span
                              className="badge badge-dot bg-primary"
                              aria-label={t.unread}
                              data-mm-tip={t.unread}
                            />
                          )}
                        </span>
                      </td>
                      <td className="text-body-secondary text-wrap">
                        {look ? look.body(n.payload) : ''}
                      </td>
                      <td>
                        <time
                          dateTime={n.createdAt}
                          title={new Date(n.createdAt).toLocaleString('en-GB')}
                          className="text-body-secondary"
                        >
                          {timeAgo(lang, n.createdAt)}
                        </time>
                      </td>
                      <td>
                        <span className="d-inline-flex align-items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                            aria-label={n.readAt ? t.markAsUnreadAria : t.markAsReadAria}
                            data-mm-tip={n.readAt ? t.markAsUnreadAria : t.markAsReadAria}
                            disabled={busy}
                            onClick={() =>
                              void call(
                                '/api/notifications/mark',
                                { ids: [n.id], read: !n.readAt },
                                () => (n.readAt ? t.markedAsUnread : t.markedAsRead),
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
                            aria-label={t.deleteNotificationAria}
                            data-mm-tip={c.delete}
                            disabled={busy}
                            onClick={() =>
                              void call(
                                '/api/notifications/delete',
                                { ids: [n.id] },
                                () => t.notificationDeleted,
                              )
                            }
                          >
                            <i className="icon-base ti tabler-trash icon-md" aria-hidden="true" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirming === 'selected' && (
        <ConfirmDialog
          title={t.deleteSelectedTitle(selected.length)}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() => void deleteSelected()}
          confirmLabel={c.delete}
          cancelLabel={c.cancel}
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">
            {t.deleteSelectedBodyLead}
            <Link href="/app/activity">{t.activityLogLink}</Link>
            {t.deleteSelectedBodyTrail}
          </p>
        </ConfirmDialog>
      )}
      {confirming === 'read' && (
        <ConfirmDialog
          title={t.clearReadTitle}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() => void deleteRead()}
          confirmLabel={t.clear}
          cancelLabel={c.cancel}
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">
            {t.clearReadBodyLead(readTotal)}
            <Link href="/app/activity">{t.activityLogLink}</Link>
            {t.clearReadBodyTrail}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

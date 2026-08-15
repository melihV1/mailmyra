'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useBsPresence } from '../../../../components/ui/useBsPresence';
import { useToast } from '../../ToastProvider';

/**
 * Gönderici düzenleme — temanın app-user-view "Edit User" modal'ı birebir:
 * `modal-lg modal-simple` (başlıksız gövde, yüzen X, ortalı başlık,
 * `row g-6` form, ortalı Submit/Cancel). Hatalar formda kalır (kural);
 * başarı toast + refresh. Canlı göndericide e-posta alanı kilitli —
 * koltuk kimliği; repo aynı kuralı `email_locked` ile sunucuda da korur.
 */
export function EditSenderDialog({
  sender,
  onClose,
}: {
  sender: {
    id: string;
    displayName: string;
    email: string;
    jobTitle: string | null;
    status: 'draft' | 'active' | 'inactive';
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(sender.displayName);
  const [email, setEmail] = useState(sender.email);
  const [jobTitle, setJobTitle] = useState(sender.jobTitle ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { shown } = useBsPresence(!leaving);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const live = sender.status === 'active';

  const requestClose = () => {
    if (busy || leaving) return;
    setLeaving(true);
    closeTimer.current = window.setTimeout(onClose, 300);
  };

  useEffect(() => {
    panel.current?.focus();
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !busy) {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = panel.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    const addr = email.trim();
    if (!name || !addr.includes('@')) {
      setError('Enter a name and a valid e-mail address.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/senders/${sender.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name, email: addr, jobTitle: jobTitle.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      toast('success', `Saved ${name}.`);
      router.refresh();
      requestClose();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      body.error === 'email_taken'
        ? 'Another sender in this workspace already uses this address.'
        : body.error === 'email_locked'
          ? 'Live senders keep their address — deactivate first to change it.'
          : body.error === 'forbidden'
            ? 'Only owners and admins can manage senders.'
            : 'Something went wrong. Please try again.',
    );
  };

  return (
    <div
      className={`modal fade d-block${shown ? ' show' : ''}`}
      style={{ backgroundColor: 'rgba(46, 38, 61, 0.5)' }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="modal-dialog modal-lg modal-simple modal-edit-user" role="document">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${sender.displayName}`}
          className="modal-content"
          ref={panel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="modal-body">
            <button
              type="button"
              className="btn-close"
              aria-label="Cancel"
              onClick={requestClose}
              disabled={busy}
            />
            <div className="text-center mb-6">
              <h4 className="mb-2">Edit sender</h4>
              <p>Signatures and assignments stay put — only the details change.</p>
            </div>
            <form className="row g-6" onSubmit={submit}>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="editSenderName">
                  Full name
                </label>
                <input
                  id="editSenderName"
                  className="form-control"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="editSenderTitle">
                  Job title
                </label>
                <input
                  id="editSenderTitle"
                  className="form-control"
                  placeholder="Optional"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="editSenderEmail">
                  E-mail
                </label>
                <input
                  id="editSenderEmail"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  disabled={live}
                  required
                />
                {live && (
                  <div className="form-text">
                    Live senders keep their address — deactivate first to change it.
                  </div>
                )}
              </div>
              {error && (
                <div className="col-12">
                  <div className="alert alert-danger mb-0" role="alert">
                    {error}
                  </div>
                </div>
              )}
              <div className="col-12 text-center">
                <button type="submit" className="btn btn-primary me-3" disabled={busy}>
                  {busy && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  Save changes
                </button>
                <button
                  type="button"
                  className="btn btn-label-secondary"
                  onClick={requestClose}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

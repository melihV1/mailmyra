'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useToast } from '../../ToastProvider';

/**
 * Rol değiştirme + çıkarma. Son owner'da ikisi de pasif ve sebebi yazılı —
 * backend zaten reddediyor, arayüz sürprizi önlüyor. Çıkarma onayı artık
 * window.confirm değil, ortak ConfirmDialog (tema modal'ı; 2026-08-14).
 */
export function MemberActions({
  targetUserId,
  role,
  isSelf,
  lastOwner,
}: {
  targetUserId: string;
  role: string;
  isSelf: boolean;
  lastOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fail = (body: { error?: string }) =>
    setError(
      body.error === 'last_owner'
        ? 'The last owner cannot be changed — promote someone else to owner first.'
        : body.error === 'forbidden'
          ? 'Only owners and admins can manage members.'
          : 'Something went wrong.',
    );

  const changeRole = async (next: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/members/${targetUserId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    });
    setBusy(false);
    if (res.ok) {
      toast('success', `Role changed to ${next}.`);
      router.refresh();
    } else fail((await res.json().catch(() => ({}))) as { error?: string });
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/members/${targetUserId}/remove`, { method: 'POST' });
    setBusy(false);
    setConfirming(false);
    if (res.ok) {
      if (isSelf) window.location.assign('/login');
      else {
        toast('success', 'Member removed.');
        router.refresh();
      }
    } else fail((await res.json().catch(() => ({}))) as { error?: string });
  };

  return (
    <>
      <span className="d-inline-flex align-items-center gap-2">
        <select
          className="form-select form-select-sm w-auto"
          value={role}
          onChange={(e) => void changeRole(e.target.value)}
          disabled={busy || lastOwner}
          title={lastOwner ? 'The last owner cannot be demoted.' : undefined}
          aria-label="Change role"
        >
          <option value="owner">owner</option>
          <option value="admin">admin</option>
          <option value="editor">editor</option>
          <option value="viewer">viewer</option>
        </select>
        <span data-mm-tip={lastOwner ? 'The last owner cannot be removed.' : undefined}>
          <button
            type="button"
            className="btn btn-sm btn-label-danger"
            onClick={() => setConfirming(true)}
            disabled={busy || lastOwner}
          >
            <i className="icon-base ti tabler-user-minus me-1" aria-hidden="true" />
            {isSelf ? 'Leave' : 'Remove'}
          </button>
        </span>
        {error && (
          <small className="text-danger text-wrap" role="alert">
            {error}
          </small>
        )}
      </span>

      {confirming && (
        <ConfirmDialog
          title={isSelf ? 'Leave this workspace?' : 'Remove this member?'}
          onCancel={() => !busy && setConfirming(false)}
          onConfirm={remove}
          confirmLabel={isSelf ? 'Leave' : 'Remove'}
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">
            {isSelf
              ? 'You will lose access immediately.'
              : 'They lose access immediately; signatures and senders stay.'}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

export function InvitationActions({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const revoke = async () => {
    setBusy(true);
    const res = await fetch(`/api/invitations/${id}/revoke`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      toast('success', 'Invitation revoked.');
      router.refresh();
    }
  };

  /* Taze link üretir (eski link ölür): 'email' maili yeniden yollar,
     'link' URL'yi panoya kopyalar — elden iletmek için. */
  const refresh = async (delivery: 'email' | 'link') => {
    setBusy(true);
    const res = await fetch(`/api/invitations/${id}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery }),
    });
    setBusy(false);
    if (!res.ok) {
      toast('danger', 'Could not refresh the invitation. Please try again.');
      return;
    }
    if (delivery === 'email') {
      toast('success', 'Invitation e-mail sent again — the old link no longer works.');
    } else {
      const body = (await res.json().catch(() => ({}))) as { actionUrl?: string };
      if (body.actionUrl) {
        try {
          await navigator.clipboard.writeText(body.actionUrl);
          toast('success', 'Fresh invite link copied — the old link no longer works.');
        } catch {
          // Pano reddedilirse link kaybolmasın: eski link ZATEN öldü,
          // kullanıcı yeniyi elle kopyalayabilsin.
          window.prompt('Copy the invite link:', body.actionUrl);
        }
      }
    }
    router.refresh();
  };

  return (
    <span className="d-inline-flex align-items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-icon btn-label-primary"
        aria-label="Resend invitation e-mail"
        data-mm-tip="Resend e-mail"
        onClick={() => void refresh('email')}
        disabled={busy}
      >
        <i className="icon-base ti tabler-send" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-icon btn-label-secondary"
        aria-label="Copy invite link"
        data-mm-tip="Copy fresh link"
        onClick={() => void refresh('link')}
        disabled={busy}
      >
        <i className="icon-base ti tabler-link" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-label-danger"
        onClick={() => void revoke()}
        disabled={busy}
      >
        {busy ? (
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
        ) : (
          <i className="icon-base ti tabler-x me-1" aria-hidden="true" />
        )}
        Revoke
      </button>
    </span>
  );
}

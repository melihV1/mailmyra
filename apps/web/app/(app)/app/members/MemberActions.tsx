'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { common } from '../../../../lib/i18n/dict/common';
import { members as membersDict } from '../../../../lib/i18n/dict/members';
import { useLang } from '../../../../lib/i18n/LangProvider';
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
  const lang = useLang();
  const t = membersDict[lang];
  const c = common[lang];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fail = (body: { error?: string }) =>
    setError(
      body.error === 'last_owner'
        ? t.actions.errors.last_owner
        : body.error === 'forbidden'
          ? t.actions.errors.forbidden
          : t.actions.errors.generic,
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
      // `next` is the raw <select> value (e.g. 'viewer'). `roleOptionLabel`
      // maps it to the displayed option text; for EN that text IS the raw
      // key (byte-identical), for TR it's the translated label ("Görüntüleyici")
      // — this keeps the EN toast unchanged while fixing the TR one.
      const roleLabel = t.roleOptionLabel[next as keyof typeof t.roleOptionLabel] ?? next;
      toast('success', t.actions.roleChangedToast(roleLabel));
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
        toast('success', t.actions.removedToast);
        router.refresh();
      }
    } else fail((await res.json().catch(() => ({}))) as { error?: string });
  };

  const roleOptions = ['owner', 'admin', 'editor', 'viewer'] as const;

  return (
    <>
      <span className="d-inline-flex align-items-center gap-2">
        <select
          className="form-select form-select-sm w-auto"
          value={role}
          onChange={(e) => void changeRole(e.target.value)}
          disabled={busy || lastOwner}
          title={lastOwner ? t.actions.lastOwnerDemoteTip : undefined}
          aria-label={t.actions.changeRoleAria}
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {t.roleOptionLabel[r]}
            </option>
          ))}
        </select>
        <span data-mm-tip={lastOwner ? t.actions.lastOwnerRemoveTip : undefined}>
          <button
            type="button"
            className="btn btn-sm btn-label-danger"
            onClick={() => setConfirming(true)}
            disabled={busy || lastOwner}
          >
            <i className="icon-base ti tabler-user-minus me-1" aria-hidden="true" />
            {isSelf ? t.actions.leave : t.actions.remove}
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
          title={isSelf ? t.actions.leaveConfirmTitle : t.actions.removeConfirmTitle}
          onCancel={() => !busy && setConfirming(false)}
          onConfirm={remove}
          confirmLabel={isSelf ? t.actions.leave : t.actions.remove}
          cancelLabel={c.cancel}
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">{isSelf ? t.actions.leaveBody : t.actions.removeBody}</p>
        </ConfirmDialog>
      )}
    </>
  );
}

export function InvitationActions({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = membersDict[lang];
  const [busy, setBusy] = useState(false);

  const revoke = async () => {
    setBusy(true);
    const res = await fetch(`/api/invitations/${id}/revoke`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      toast('success', t.invitationActions.revokedToast);
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
      toast('danger', t.invitationActions.refreshFailedToast);
      return;
    }
    if (delivery === 'email') {
      toast('success', t.invitationActions.emailSentToast);
    } else {
      const body = (await res.json().catch(() => ({}))) as { actionUrl?: string };
      if (body.actionUrl) {
        try {
          await navigator.clipboard.writeText(body.actionUrl);
          toast('success', t.invitationActions.linkCopiedToast);
        } catch {
          // Pano reddedilirse link kaybolmasın: eski link ZATEN öldü,
          // kullanıcı yeniyi elle kopyalayabilsin.
          window.prompt(t.invitationActions.copyPrompt, body.actionUrl);
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
        aria-label={t.invitationActions.resendAria}
        data-mm-tip={t.invitationActions.resendTip}
        onClick={() => void refresh('email')}
        disabled={busy}
      >
        <i className="icon-base ti tabler-send" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-icon btn-label-secondary"
        aria-label={t.invitationActions.copyLinkAria}
        data-mm-tip={t.invitationActions.copyLinkTip}
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
        {t.invitationActions.revoke}
      </button>
    </span>
  );
}

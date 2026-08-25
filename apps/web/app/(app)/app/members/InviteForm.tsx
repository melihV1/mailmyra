'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { members as membersDict } from '../../../../lib/i18n/dict/members';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

/** Davet 7 gün geçerli; owner rolü davetle DAĞITILMAZ. */
export function InviteForm() {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = membersDict[lang];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const roleOptions = ['admin', 'editor', 'viewer'] as const;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMsg(null);

    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), role: data.get('role') }),
    });

    setBusy(false);
    if (res.ok) {
      form.reset();
      toast('success', t.invite.sentToast);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'already_member'
          ? t.invite.errors.already_member
          : body.error === 'forbidden'
            ? t.invite.errors.forbidden
            : t.invite.errors.generic,
    });
  };

  return (
    <div>
      {msg && (
        <div
          className={`alert ${msg.kind === 'ok' ? 'alert-success' : 'alert-danger'}`}
          role="status"
        >
          {msg.text}
        </div>
      )}
      <form onSubmit={submit} className="row g-3 align-items-end">
        <div className="col-sm-6 col-lg-5">
          <label className="form-label" htmlFor="invite-email">
            {t.invite.emailLabel}
          </label>
          <input
            id="invite-email"
            className="form-control"
            name="email"
            type="email"
            placeholder={t.invite.emailPlaceholder}
            required
          />
        </div>
        <div className="col-sm-3 col-lg-2">
          <label className="form-label" htmlFor="invite-role">
            {t.invite.roleLabel}
          </label>
          <select id="invite-role" className="form-select" name="role" defaultValue="editor">
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {t.roleOptionLabel[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-3 col-lg-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />{t.invite.sending}</>
            ) : (
              <>
                <i className="icon-base ti tabler-send me-1" aria-hidden="true" />
                {t.invite.submit}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

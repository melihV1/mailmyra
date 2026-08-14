'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../ToastProvider';

/** Davet 7 gün geçerli; owner rolü davetle DAĞITILMAZ. */
export function InviteForm() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

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
      toast('success', 'Invitation sent — the link is good for 7 days.');
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'already_member'
          ? 'That address is already a member of this workspace.'
          : body.error === 'forbidden'
            ? 'Only owners and admins can invite members.'
            : 'Could not send — check the address and try again.',
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
            Email
          </label>
          <input
            id="invite-email"
            className="form-control"
            name="email"
            type="email"
            placeholder="teammate@company.com"
            required
          />
        </div>
        <div className="col-sm-3 col-lg-2">
          <label className="form-label" htmlFor="invite-role">
            Role
          </label>
          <select id="invite-role" className="form-select" name="role" defaultValue="editor">
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
        </div>
        <div className="col-sm-3 col-lg-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Sending…</>
            ) : (
              <>
                <i className="icon-base ti tabler-send me-1" aria-hidden="true" />
                Invite
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

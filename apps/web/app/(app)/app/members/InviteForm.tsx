'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import styles from './members.module.css';

/** Davet 7 gün geçerli; owner rolü davetle DAĞITILMAZ. */
export function InviteForm() {
  const router = useRouter();
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
      setMsg({ kind: 'ok', text: 'Invitation sent — the link is good for 7 days.' });
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
    <form onSubmit={submit} className={styles.inviteForm}>
      <input
        className={styles.input}
        name="email"
        type="email"
        placeholder="teammate@company.com"
        required
      />
      <select className={styles.roleSelect} name="role" defaultValue="editor" aria-label="Role">
        <option value="admin">admin</option>
        <option value="editor">editor</option>
        <option value="viewer">viewer</option>
      </select>
      <button type="submit" className={styles.primary} disabled={busy}>
        {busy ? 'Sending…' : 'Invite'}
      </button>
      {msg && (
        <span className={msg.kind === 'ok' ? styles.notice : styles.error} role="status">
          {msg.text}
        </span>
      )}
    </form>
  );
}

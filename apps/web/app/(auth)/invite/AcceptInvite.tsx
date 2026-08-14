'use client';

import Link from 'next/link';
import { useState } from 'react';

export function AcceptInvite({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'fail' | 'member'>('idle');

  const accept = async () => {
    setState('busy');
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      window.location.assign('/app/signatures');
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setState(body.error === 'already_member' ? 'member' : 'fail');
  };

  return (
    <>
      <h4 className="mb-1">Workspace invitation 🤝</h4>
      <p className="mb-6">Join your team&apos;s workspace on Mailmyra.</p>

      {state === 'fail' ? (
        <div className="alert alert-danger" role="alert">
          This invitation has expired or was revoked. Ask the person who invited you to send a
          new one.
        </div>
      ) : state === 'member' ? (
        <>
          <div className="alert alert-success" role="status">
            You are already a member of this workspace.
          </div>
          <p className="text-center mb-0">
            <Link href="/app/signatures">Go to the panel</Link>
          </p>
        </>
      ) : (
        <>
          <div className="alert alert-primary" role="note">
            You have been invited to join a workspace. Accepting connects this account to it.
          </div>
          <div className="d-grid">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void accept()}
              disabled={state === 'busy'}
            >
              {state === 'busy' ? 'Joining…' : 'Accept invitation'}
            </button>
          </div>
        </>
      )}
    </>
  );
}

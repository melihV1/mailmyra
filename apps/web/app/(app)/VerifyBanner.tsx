'use client';

import { useState } from 'react';

import styles from './shell.module.css';

type State = 'idle' | 'sending' | 'sent' | 'limited';

export function VerifyBanner() {
  const [state, setState] = useState<State>('idle');

  const resend = async () => {
    setState('sending');
    const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
    setState(res.status === 429 ? 'limited' : res.ok ? 'sent' : 'idle');
  };

  return (
    <div className={styles.verifyBanner} role="status">
      <span>
        Verify your email address — exporting stays locked until you do. Check your inbox.
      </span>
      {state === 'sent' ? (
        <span className={styles.verifySent}>Sent — check your inbox.</span>
      ) : state === 'limited' ? (
        <span className={styles.verifySent}>Too many requests — try again later.</span>
      ) : (
        <button
          type="button"
          className={styles.verifyResend}
          onClick={resend}
          disabled={state === 'sending'}
        >
          {state === 'sending' ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}

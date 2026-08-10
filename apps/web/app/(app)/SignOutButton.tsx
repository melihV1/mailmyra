'use client';

import styles from './shell.module.css';

export function SignOutButton() {
  return (
    <button
      type="button"
      className={styles.signOut}
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        // Tam yükleme: sunucu bileşenleri çerezin gittiğini ancak yeni
        // istekte görür.
        window.location.assign('/login');
      }}
    >
      Sign out
    </button>
  );
}

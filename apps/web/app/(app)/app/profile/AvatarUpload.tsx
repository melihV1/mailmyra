'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { account as accountDict } from '../../../../lib/i18n/dict/account';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

/**
 * Profil avatarı — temanın account-settings foto alanı dili: "Upload new
 * photo" + Reset. Baş harf yoksa gerçek fotoğraf; navbar ve üye listesi de
 * aynı URL'yi okur (User.avatarUrl).
 */
export function AvatarUpload({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null;
  initial: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = accountDict[lang].avatar;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/account/avatar', { method: 'POST', body: form });
      const body = (await res.json().catch(() => ({}))) as { error?: string; warning?: string };
      if (!res.ok) {
        toast('danger', body.error ?? t.uploadFailed);
        return;
      }
      toast('success', body.warning ? t.photoUpdatedWithWarning(body.warning) : t.photoUpdated);
      router.refresh();
    } catch {
      toast('danger', t.uploadFailed);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: true }),
      });
      if (res.ok) {
        toast('success', t.photoRemoved);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex align-items-center flex-wrap gap-4">
      <div className="avatar avatar-xl">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={t.photoAlt} className="rounded-circle" />
        ) : (
          <span className="avatar-initial rounded-circle bg-label-primary fs-3">{initial}</span>
        )}
      </div>
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          ) : (
            <i className="icon-base ti tabler-upload me-1" aria-hidden="true" />
          )}
          {t.uploadButton}
        </button>
        {avatarUrl && (
          <button
            type="button"
            className="btn btn-sm btn-label-secondary"
            onClick={() => void remove()}
            disabled={busy}
          >
            {t.resetButton}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="d-none"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

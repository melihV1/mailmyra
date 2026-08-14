'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../ToastProvider';

/**
 * Çalışma alanı adı (2026-08-14): kayıtta sorulmuyor, herkes "Workspace"
 * ile başlıyor — burası değiştirme yeri. Ad davet mailinde ve koltuk uyarı
 * mailinde geçiyor; owner/admin dışına form yerine düz metin gösterilir
 * (yetkisiz rol düğme değil açıklama görür — panel geleneği).
 */
export function WorkspaceCard({ name, canManage }: { name: string; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMsg(null);

    const res = await fetch('/api/organization/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.get('name') }),
    });

    setBusy(false);
    if (res.ok) {
      toast('success', 'Workspace renamed.');
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'forbidden'
          ? 'Only owners and admins can rename the workspace.'
          : 'Enter a name between 1 and 255 characters.',
    });
  };

  return (
    <div className="card mb-4">
      <div className="card-header pb-2">
        <h5 className="card-title mb-1">Workspace</h5>
        <p className="card-subtitle mb-0">
          This name shows up in invitation and seat-warning e-mails.
        </p>
      </div>
      <div className="card-body">
        {msg && (
          <div
            className={`alert ${msg.kind === 'ok' ? 'alert-success' : 'alert-danger'}`}
            role="status"
          >
            {msg.text}
          </div>
        )}
        {canManage ? (
          <form onSubmit={submit} className="row g-3 align-items-end">
            <div className="col-sm-8 col-lg-5">
              <label className="form-label" htmlFor="workspace-name">
                Workspace name
              </label>
              <input
                id="workspace-name"
                className="form-control"
                name="name"
                defaultValue={name}
                maxLength={255}
                required
              />
            </div>
            <div className="col-sm-4 col-lg-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Saving…</>
                ) : (
                  <>
                    <i className="icon-base ti tabler-pencil me-1" aria-hidden="true" />
                    Rename
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <p className="mb-0">
            <span className="fw-medium text-heading">{name}</span>
            <span className="text-body-secondary">
              {' '}
              — renaming is up to workspace owners and admins.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

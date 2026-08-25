'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { members as membersDict } from '../../../../lib/i18n/dict/members';
import { useLang } from '../../../../lib/i18n/LangProvider';
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
  const lang = useLang();
  const t = membersDict[lang];
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
      toast('success', t.workspaceCard.renamedToast);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'forbidden'
          ? t.workspaceCard.errors.forbidden
          : t.workspaceCard.errors.generic,
    });
  };

  return (
    <div className="card mb-4">
      <div className="card-header pb-2">
        <h5 className="card-title mb-1">{t.workspaceCard.title}</h5>
        <p className="card-subtitle mb-0">{t.workspaceCard.subtitle}</p>
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
                {t.workspaceCard.nameLabel}
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
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />{t.workspaceCard.saving}</>
                ) : (
                  <>
                    <i className="icon-base ti tabler-pencil me-1" aria-hidden="true" />
                    {t.workspaceCard.rename}
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
              {t.workspaceCard.readOnlyTrail}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

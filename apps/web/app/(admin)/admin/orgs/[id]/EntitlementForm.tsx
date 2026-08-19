'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Hak ediş düzeltme — her kaydetme SEBEP ister (repo reddediyor, form da
 * istemeden göndermiyor). Başarıda sayfa yenilenir; müşteri akışına
 * "Plan updated by support" düşer, iç deftere before/after yazılır.
 */
export function EntitlementForm({
  orgId,
  current,
}: {
  orgId: string;
  current: { entitledSeats: number; entitlementState: string; trialEndsAt: string };
}) {
  const router = useRouter();
  const [seats, setSeats] = useState(String(current.entitledSeats));
  const [state, setState] = useState(current.entitlementState);
  const [trialEndsAt, setTrialEndsAt] = useState(current.trialEndsAt);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/orgs/${orgId}/entitlement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entitledSeats: Number(seats),
        entitlementState: state,
        // Boş bırakmak "dokunma" demek; tarihi silmek açık null ister.
        ...(trialEndsAt ? { trialEndsAt } : {}),
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed.');
      return;
    }
    setReason('');
    router.refresh();
  }

  return (
    <div className="card mb-4">
      <div className="card-header pb-2">
        <h6 className="mb-0">Entitlement</h6>
        <p className="text-body-secondary small mb-0">
          The customer sees this change in their activity stream.
        </p>
      </div>
      <div className="card-body d-flex flex-column gap-3">
        {error && (
          <div className="alert alert-danger py-2 small mb-0" role="alert">
            {error}
          </div>
        )}
        <div className="row g-2">
          <div className="col-4">
            <label className="form-label small" htmlFor="ent-seats">Seats</label>
            <input
              id="ent-seats"
              type="number"
              min={1}
              className="form-control"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
          <div className="col-8">
            <label className="form-label small" htmlFor="ent-state">State</label>
            <select
              id="ent-state"
              className="form-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="form-label small" htmlFor="ent-trial">Trial ends</label>
          <input
            id="ent-trial"
            type="date"
            className="form-control"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label small" htmlFor="ent-reason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="ent-reason"
            type="text"
            className="form-control"
            placeholder="Why — this goes into the audit log"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !reason.trim()}
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Save entitlement'}
        </button>
      </div>
    </div>
  );
}

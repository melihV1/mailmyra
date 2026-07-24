import type { SignatureData } from '@mailmyra/renderer';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const DRAFT_KEY = 'mailmyra:draft:v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Envelope {
  version: 1;
  savedAt: number;
  data: SignatureData;
}

function stripDataUris(data: SignatureData): SignatureData {
  const clean = (url: string | undefined) =>
    url?.startsWith('data:') ? undefined : url;
  return {
    ...data,
    visuals: {
      ...data.visuals,
      avatarUrl: clean(data.visuals.avatarUrl),
      logoUrl: clean(data.visuals.logoUrl),
      handSignatureUrl: clean(data.visuals.handSignatureUrl),
    },
  };
}

export function saveDraft(storage: StorageLike, data: SignatureData, now: number): void {
  const envelope: Envelope = { version: 1, savedAt: now, data: stripDataUris(data) };
  storage.setItem(DRAFT_KEY, JSON.stringify(envelope));
}

function isValidSignatureData(data: unknown): data is SignatureData {
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as SignatureData).identity !== 'object' ||
    (data as SignatureData).identity === null ||
    typeof (data as SignatureData).identity?.fullName !== 'string'
  ) {
    return false;
  }
  return true;
}

export function loadDraft(storage: StorageLike, now: number): SignatureData | null {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as Envelope;
    if (envelope.version !== 1 || typeof envelope.savedAt !== 'number') return null;
    if (now - envelope.savedAt > TTL_MS) {
      storage.removeItem(DRAFT_KEY);
      return null;
    }
    if (!isValidSignatureData(envelope.data)) {
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

export function clearDraft(storage: StorageLike): void {
  storage.removeItem(DRAFT_KEY);
}

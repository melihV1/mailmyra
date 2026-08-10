/**
 * Yetki matrisi — `docs/panel-brief.md` §2.8'deki tablonun tek kaynağı.
 *
 * Burası DB'siz ve çatısız: aynı kural hem panel isteğinde hem sunucudaki
 * toplu export yolunda çalışacak. Arayüz bu tabloya bakıp düğme gizler,
 * backend aynı tabloya bakıp isteği reddeder — iki yerde iki tanım olmaz.
 */

/** En yetkiliden en yetkisize sıralı. Sıra anlamlıdır, karıştırma. */
export const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  /** Fatura, plan, org silme. */
  'billing:manage',
  /** Üye daveti, rol değiştirme, üye çıkarma. */
  'member:manage',
  /** Gönderici ekleme, yayına alma, pasifleştirme — koltuğu tüketen işler. */
  'sender:manage',
  /** Org geneli marka ayarları (Faz 3). */
  'brand:manage',
  'signature:edit',
  'signature:export',
  'signature:view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: [
    'member:manage',
    'sender:manage',
    'brand:manage',
    'signature:edit',
    'signature:export',
    'signature:view',
  ],
  editor: ['signature:edit', 'signature:export', 'signature:view'],
  viewer: ['signature:view'],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export interface Member {
  userId: string;
  role: Role;
}

/**
 * Bir org **owner'sız kalamaz**. Kalırsa faturayı kimse göremez, planı kimse
 * değiştiremez, org'u kimse silemez — kurtarılması elle müdahale gerektirir.
 * Arayüz düğmeyi gizler, burası isteği reddeder.
 */
function wouldOrphanTheOrg(members: readonly Member[], targetUserId: string): boolean {
  const target = members.find((m) => m.userId === targetUserId);
  if (target?.role !== 'owner') return false;
  return members.filter((m) => m.role === 'owner').length === 1;
}

export function canRemoveMember(members: readonly Member[], targetUserId: string): boolean {
  if (!members.some((m) => m.userId === targetUserId)) return false;
  return !wouldOrphanTheOrg(members, targetUserId);
}

export function canChangeRole(
  members: readonly Member[],
  targetUserId: string,
  nextRole: Role,
): boolean {
  if (!members.some((m) => m.userId === targetUserId)) return false;
  if (nextRole === 'owner') return true;
  return !wouldOrphanTheOrg(members, targetUserId);
}

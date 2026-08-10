import { describe, expect, test } from 'vitest';

import { canChangeRole, canRemoveMember } from '../src/roles';

const soleOwner = [{ userId: 'u1', role: 'owner' as const }];

const twoOwners = [
  { userId: 'u1', role: 'owner' as const },
  { userId: 'u2', role: 'owner' as const },
];

const ownerAndAdmin = [
  { userId: 'u1', role: 'owner' as const },
  { userId: 'u2', role: 'admin' as const },
];

describe('the last owner is protected', () => {
  test('the only owner cannot be removed', () => {
    expect(canRemoveMember(soleOwner, 'u1')).toBe(false);
  });

  test('the only owner cannot be demoted', () => {
    expect(canChangeRole(soleOwner, 'u1', 'admin')).toBe(false);
  });

  test('an owner may be removed while another owner remains', () => {
    expect(canRemoveMember(twoOwners, 'u1')).toBe(true);
  });

  test('an owner may be demoted while another owner remains', () => {
    expect(canChangeRole(twoOwners, 'u1', 'admin')).toBe(true);
  });

  test('an admin is not protected even when they are the only admin', () => {
    expect(canRemoveMember(ownerAndAdmin, 'u2')).toBe(true);
    expect(canChangeRole(ownerAndAdmin, 'u2', 'viewer')).toBe(true);
  });

  test('re-assigning the sole owner to owner is a no-op, not a demotion', () => {
    expect(canChangeRole(soleOwner, 'u1', 'owner')).toBe(true);
  });

  test('a member who is not in the org cannot be acted on', () => {
    expect(canRemoveMember(ownerAndAdmin, 'ghost')).toBe(false);
    expect(canChangeRole(ownerAndAdmin, 'ghost', 'admin')).toBe(false);
  });
});

import { describe, expect, test } from 'vitest';

import { ROLES, can } from '../src/roles';

describe('permission matrix', () => {
  test('only the owner may touch billing', () => {
    expect(can('owner', 'billing:manage')).toBe(true);
    expect(can('admin', 'billing:manage')).toBe(false);
    expect(can('editor', 'billing:manage')).toBe(false);
    expect(can('viewer', 'billing:manage')).toBe(false);
  });

  test('admins may invite members but editors may not', () => {
    expect(can('admin', 'member:manage')).toBe(true);
    expect(can('editor', 'member:manage')).toBe(false);
  });

  test('publishing a sender is an admin job, not an editor one', () => {
    expect(can('admin', 'sender:manage')).toBe(true);
    expect(can('editor', 'sender:manage')).toBe(false);
  });

  test('editors may edit and export, viewers may not', () => {
    expect(can('editor', 'signature:edit')).toBe(true);
    expect(can('editor', 'signature:export')).toBe(true);
    expect(can('viewer', 'signature:edit')).toBe(false);
    expect(can('viewer', 'signature:export')).toBe(false);
  });

  test('every role can view', () => {
    for (const role of ROLES) {
      expect(can(role, 'signature:view')).toBe(true);
    }
  });

  test('the four roles are ordered from most to least privileged', () => {
    expect(ROLES).toEqual(['owner', 'admin', 'editor', 'viewer']);
  });
});

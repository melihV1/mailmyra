export interface ProductOrgRow {
  id: string;
  name: string;
  entitlementState: string;
  createdAt: string;
  memberCount: number;
  signatureCount: number;
  senderCount: number;
  activeSenderCount: number;
  exportedSenderCount: number;
  lastActivityAt: string | null;
}

export interface ProductSignatureRow {
  id: string;
  orgId: string;
  orgName: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  assigned: boolean;
  size: 'small' | 'medium' | 'large';
  iconStyle: 'filled' | 'outline' | 'mono';
  hasCta: boolean;
  hasLogo: boolean;
  hasAvatar: boolean;
}

export interface ProductSenderRow {
  id: string;
  orgId: string;
  createdAt: string;
  publishedAt: string | null;
  deactivatedAt: string | null;
  lastExportedAt: string | null;
}

export interface ProductEventRow {
  id: string;
  orgId: string;
  orgName: string;
  type: string;
  createdAt: string;
  fileCount: number;
  senderCount: number;
}

export interface ProductAnalyticsSnapshot {
  organizations: ProductOrgRow[];
  signatures: ProductSignatureRow[];
  senders: ProductSenderRow[];
  events: ProductEventRow[];
}

const DAY = 86_400_000;
const dateMs = (value: string | null) => value ? new Date(value).getTime() : 0;

export function productFacts(source: ProductAnalyticsSnapshot, now: number) {
  const activeSenders = source.senders.filter((row) => row.publishedAt && !row.deactivatedAt);
  const exportedActive = activeSenders.filter((row) => row.lastExportedAt);
  const recentSignatures = source.signatures.filter((row) => now - dateMs(row.updatedAt) <= 30 * DAY);
  const exportEvents = source.events.filter((row) => row.type === 'export.zip');
  const activeOrgs = source.organizations.filter((row) => row.activeSenderCount > 0);
  const returningOrgs = activeOrgs.filter((row) => row.lastActivityAt && now - dateMs(row.lastActivityAt) <= 30 * DAY);
  return {
    organizations: source.organizations.length,
    signatures: source.signatures.length,
    activeSenders: activeSenders.length,
    exportCoverage: activeSenders.length ? Math.round((exportedActive.length / activeSenders.length) * 100) : 0,
    recentSignatures: recentSignatures.length,
    exportEvents: exportEvents.length,
    exportedFiles: exportEvents.reduce((sum, row) => sum + row.fileCount, 0),
    returningOrgs: returningOrgs.length,
    activeOrgs: activeOrgs.length,
  };
}

export function activationStages(source: ProductAnalyticsSnapshot) {
  const stages = [
    { key: 'workspace', label: 'Workspace created', value: source.organizations.length },
    { key: 'member', label: 'Member ready', value: source.organizations.filter((row) => row.memberCount > 0).length },
    { key: 'signature', label: 'Signature saved', value: source.organizations.filter((row) => row.signatureCount > 0).length },
    { key: 'published', label: 'Sender published', value: source.organizations.filter((row) => row.activeSenderCount > 0).length },
    { key: 'exported', label: 'Export evidenced', value: source.organizations.filter((row) => row.exportedSenderCount > 0).length },
  ];
  return stages.map((stage, index) => ({
    ...stage,
    rate: stages[0]!.value ? Math.round((stage.value / stages[0]!.value) * 100) : 0,
    stepRate: index === 0 || !stages[index - 1]!.value ? 100 : Math.round((stage.value / stages[index - 1]!.value) * 100),
    loss: index === 0 ? 0 : stages[index - 1]!.value - stage.value,
  }));
}

export function distribution<T extends string>(values: readonly T[]): Array<{ label: T; value: number }> {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function templateFacts(source: ProductAnalyticsSnapshot, now: number) {
  return distribution(source.signatures.map((row) => row.templateId)).map((item) => {
    const rows = source.signatures.filter((row) => row.templateId === item.label);
    return {
      ...item,
      assigned: rows.filter((row) => row.assigned).length,
      recent: rows.filter((row) => now - dateMs(row.updatedAt) <= 30 * DAY).length,
      share: source.signatures.length ? Math.round((item.value / source.signatures.length) * 100) : 0,
    };
  });
}

export function monthlyEventSeries(source: ProductAnalyticsSnapshot, now: number, months = 6) {
  const points = Array.from({ length: months }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - (months - 1 - index));
    const end = new Date(date);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { start: date.getTime(), end: end.getTime(), label: date.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' }) };
  });
  return points.map((point) => {
    const events = source.events.filter((row) => dateMs(row.createdAt) >= point.start && dateMs(row.createdAt) < point.end);
    return {
      label: point.label,
      publishes: events.filter((row) => row.type === 'sender.published').length,
      exports: events.filter((row) => row.type === 'export.zip').length,
      brandChanges: events.filter((row) => row.type === 'brand.saved').length,
    };
  });
}

export function cohortRows(source: ProductAnalyticsSnapshot, now: number, months = 6) {
  const points = Array.from({ length: months }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - (months - 1 - index));
    const end = new Date(date);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { start: date.getTime(), end: end.getTime(), label: date.toLocaleDateString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' }) };
  });
  return points.map((point) => {
    const orgs = source.organizations.filter((row) => dateMs(row.createdAt) >= point.start && dateMs(row.createdAt) < point.end);
    const activated = orgs.filter((row) => row.activeSenderCount > 0);
    const returned = activated.filter((row) => row.lastActivityAt && now - dateMs(row.lastActivityAt) <= 30 * DAY);
    return {
      label: point.label,
      workspaces: orgs.length,
      activated: activated.length,
      returned: returned.length,
      activationRate: orgs.length ? Math.round((activated.length / orgs.length) * 100) : 0,
      returnRate: activated.length ? Math.round((returned.length / activated.length) * 100) : 0,
    };
  });
}

/**
 * "Zip dışa aktar" diyaloğunun rakamları — ekrandaki listeden türetilir,
 * ikinci bir "say" ucu yoktur (spec §3). Sunucu POST'ta kendi süzgecini
 * yeniden uygular; fark oluşmuşsa sunucununki geçer.
 */

export interface ExportPlanRow {
  id: string;
  status: 'draft' | 'active' | 'inactive';
  signatureNames: string[];
}

export interface ExportPlan {
  /** Dosya üretecek gönderici sayısı. */
  senderCount: number;
  fileCount: number;
  /** Kapsamda, yayında ama imzasız — sebep söylenerek atlanır. */
  unassigned: number;
  /** Yalnız seçili kapsamda anlamlı: seçilmiş ama yayında olmayan. */
  unpublished: number;
}

export function exportPlan(
  rows: readonly ExportPlanRow[],
  selectedIds: readonly string[],
): ExportPlan {
  const scope =
    selectedIds.length > 0
      ? rows.filter((r) => selectedIds.includes(r.id))
      : rows.filter((r) => r.status === 'active');
  const live = scope.filter((r) => r.status === 'active');
  const withSig = live.filter((r) => r.signatureNames.length > 0);
  return {
    senderCount: withSig.length,
    fileCount: withSig.reduce((n, r) => n + r.signatureNames.length, 0),
    unassigned: live.length - withSig.length,
    unpublished: scope.length - live.length,
  };
}

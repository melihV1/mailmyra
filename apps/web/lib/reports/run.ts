import type { Mailer } from '../mail/types';
import { nextPlannedRun } from '../report-schedule';
import { csvFilename, renderCsv, renderDigest } from './render';
import { REPORT_BUILDERS } from './registry';
import { countRows, type ReportBuilder, type ReportResult, type ReportsDb } from './types';
import { reportWindow } from './window';

/**
 * Rapor çalıştırıcısı — tasarım: docs/superpowers/specs/2026-08-21-report-runner-design.md
 *
 * Defter semantiği: builder başarılı VE TÜM teslimler 'sent' → 'success';
 * aksi hâlde 'failed' (kısmi teslim hatası da failed — panel rozeti güvenli
 * tarafta kalır). `nextRunAt` HER denemeden sonra ilerler: başarısız koşu
 * ertesi tike fırtına gibi yığılmaz, hata rozetle görünür. Desteklenmeyen
 * format/rapor sessizce atlanmaz — dürüst 'failed' satırı yazılır.
 *
 * Bağımlılıklar enjekte edilir (db/mailer/now/builders) — testler sahte
 * geçer, script gerçekleri bağlar.
 */
export interface RunDeps {
  db: ReportsDb;
  mailer: Mailer;
  now: Date;
  dryRun?: boolean;
  builders?: Record<string, ReportBuilder>;
}

export interface RunSummary {
  processed: number;
  succeeded: number;
  failed: number;
}

interface DueSchedule {
  id: string;
  reportId: string;
  cadence: string;
  format: string;
  recipients: Array<{ email: string }>;
}

const clip = (s: string) => s.slice(0, 500);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function buildReport(
  db: ReportsDb,
  builders: Record<string, ReportBuilder>,
  schedule: DueSchedule,
  now: Date,
): Promise<ReportResult> {
  if (schedule.format !== 'digest' && schedule.format !== 'csv') {
    throw new Error(`format not implemented: ${schedule.format}`);
  }
  const builder = builders[schedule.reportId];
  if (!builder) throw new Error(`unknown report: ${schedule.reportId}`);
  if (schedule.recipients.length === 0) throw new Error('schedule has no recipients');

  const report = await builder(db, reportWindow(schedule.cadence, now));
  if (schedule.format === 'csv' && !report.table) {
    throw new Error('report has no tabular output');
  }
  return report;
}

async function runOne(
  db: ReportsDb,
  mailer: Mailer,
  builders: Record<string, ReportBuilder>,
  schedule: DueSchedule,
  now: Date,
): Promise<boolean> {
  const execution = await db.reportExecution.create({
    data: { scheduleId: schedule.id, startedAt: now, status: 'running' },
    select: { id: true },
  });

  let status: 'success' | 'failed' = 'success';
  let error: string | null = null;
  let rowCount: number | null = null;

  try {
    const report = await buildReport(db, builders, schedule, now);
    rowCount = countRows(report);
    const digest = renderDigest(report, { csvAttached: schedule.format === 'csv' && !!report.table });
    const attachments =
      schedule.format === 'csv' && report.table
        ? [
            {
              filename: csvFilename(schedule.reportId, now),
              content: renderCsv(report.table),
              contentType: 'text/csv',
            },
          ]
        : undefined;

    let failedDeliveries = 0;
    for (const { email } of schedule.recipients) {
      let deliveryStatus: 'sent' | 'failed' = 'sent';
      let detail: string | null = null;
      try {
        await mailer.send({ to: email, kind: 'report', ...digest, attachments });
      } catch (err) {
        deliveryStatus = 'failed';
        detail = clip(message(err));
        failedDeliveries += 1;
      }
      await db.reportDelivery.create({
        data: { executionId: execution.id, recipientEmail: email, status: deliveryStatus, detail },
      });
    }
    if (failedDeliveries > 0) {
      status = 'failed';
      error = clip(`${failedDeliveries} of ${schedule.recipients.length} deliveries failed`);
    }
  } catch (err) {
    status = 'failed';
    error = clip(message(err));
  }

  // startedAt/pencere enjekte edilen `now`dan gelir (test edilebilirlik);
  // bitiş gerçek saat olmalı — yoksa süre sahte sıfır görünür.
  await db.reportExecution.update({
    where: { id: execution.id },
    data: { status, error, rowCount, finishedAt: new Date() },
  });
  return status === 'success';
}

export async function runDueReports({
  db,
  mailer,
  now,
  dryRun = false,
  builders = REPORT_BUILDERS,
}: RunDeps): Promise<RunSummary> {
  const due = (await db.reportSchedule.findMany({
    where: { status: 'active', OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reportId: true,
      cadence: true,
      format: true,
      recipients: { select: { email: true } },
    },
  })) as DueSchedule[];

  const summary: RunSummary = { processed: 0, succeeded: 0, failed: 0 };

  for (const schedule of due) {
    summary.processed += 1;
    let ok = false;
    try {
      if (dryRun) {
        const report = await buildReport(db, builders, schedule, now);
        const digest = renderDigest(report);
        console.info(
          `[dry-run] ${schedule.reportId} (${schedule.format}) → "${digest.subject}", ` +
            `${countRows(report)} rows, ${schedule.recipients.length} recipient(s)`,
        );
        ok = true;
      } else {
        ok = await runOne(db, mailer, builders, schedule, now);
        // Her denemeden sonra ilerlet — dry-run HARİÇ (o hiçbir şey yazmaz).
        await db.reportSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: nextPlannedRun(schedule.cadence, now) },
        });
      }
    } catch (err) {
      // İzolasyon: bir zamanlamanın çökmesi diğerlerini durdurmaz.
      console.error(`[reports] schedule ${schedule.id} failed:`, message(err));
      if (!dryRun) {
        try {
          await db.reportSchedule.update({
            where: { id: schedule.id },
            data: { nextRunAt: nextPlannedRun(schedule.cadence, now) },
          });
        } catch {
          /* ilerletme de düştüyse ertesi koşu yine dener */
        }
      }
    }
    if (ok) summary.succeeded += 1;
    else summary.failed += 1;
  }

  return summary;
}

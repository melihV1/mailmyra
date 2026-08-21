import { finishCli } from '../lib/cli-exit';
import { loadEnvFiles } from '../lib/env-file';

// Plesk'in "Komut dosyası çalıştır" bağlamı Next'in .env dosyalarını görmez.
loadEnvFiles();

/**
 * İlk rapor zamanlamasını açar — docs/report-runner.md'deki SQL'in script
 * hâli (2026-08-21: phpMyAdmin'e girilemeyen günde panelden koşmak için).
 * Idempotent: satırlar zaten varsa dokunmadan geçer, tekrar koşmak güvenli.
 * Zamanlama OLUŞTURMA kontrolü UI'da bilinçli yok (devir §7) — kayıt açma
 * yolu SQL/script'tir.
 */
async function main(): Promise<void> {
  const { prisma } = await import('../lib/db');

  const schedule = await prisma.reportSchedule.upsert({
    where: { id: 'sched-cmdcenter-weekly-1' },
    update: {},
    create: {
      id: 'sched-cmdcenter-weekly-1',
      reportId: 'command-center',
      cadence: 'weekly',
      timezone: 'Europe/Istanbul',
      format: 'digest',
      status: 'active',
      ownerEmail: 'mail@voldi.net',
      createdByEmail: 'mail@voldi.net',
    },
  });

  await prisma.reportRecipient.upsert({
    where: { scheduleId_email: { scheduleId: schedule.id, email: 'mail@voldi.net' } },
    update: {},
    create: { id: 'rcpt-cmdcenter-weekly-1', scheduleId: schedule.id, email: 'mail@voldi.net' },
  });

  console.log(
    `Zamanlama hazır: ${schedule.id} (${schedule.reportId} · ${schedule.cadence} · ${schedule.format}) → mail@voldi.net`,
  );
  console.log('nextRunAt boş — sonraki `run reports` koşusunda vadesi gelmiş sayılır.');
}

main()
  .then(() => finishCli(0))
  .catch((e) => {
    console.error(e);
    return finishCli(1);
  });

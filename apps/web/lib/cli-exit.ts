/**
 * CLI kapanışı — üç ops scriptinin ortak kuyruğu (2026-08-21'de yaşandı):
 * prisma'nın MariaDB havuzu event loop'u açık tutar, süreç kendiliğinden
 * bitmez ve Plesk penceresi sonsuza dek bekler. Bağlantıyı kapat, exitCode'u
 * bırak, 2sn emniyet zorlaması (`unref` — zamanlayıcı süreci canlı tutmaz;
 * stdout bu sürede boşalır, doğrudan process.exit çıktıyı kesebilirdi).
 */
export async function finishCli(code: number): Promise<void> {
  try {
    const { prisma } = await import('./db');
    await prisma.$disconnect();
  } catch {
    /* db hiç açılmadıysa kapatılacak bir şey yok */
  }
  process.exitCode = code;
  setTimeout(() => process.exit(code), 2000).unref();
}

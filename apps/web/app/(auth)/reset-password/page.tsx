import { ResetForms } from './ResetForms';

export const metadata = { title: 'Reset password — Mailmyra' };

/**
 * Tek rota, iki yüz: `?token=` yoksa talep formu, varsa yeni şifre formu.
 * E-postadaki link bu adrese geliyor (`lib/auth/flows.ts`).
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : undefined;
  return <ResetForms token={token} />;
}

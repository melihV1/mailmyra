import { ConfirmRunner } from './ConfirmRunner';

export const metadata = { title: 'Confirm e-mail change — Mailmyra' };

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';
  return <ConfirmRunner token={token} />;
}

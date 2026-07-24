/** İş modeli kararı koda gömülmez: yalnızca 'false' kapıyı kapatır. */
export function isExportGated(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.EXPORT_REQUIRES_AUTH?.toLowerCase() !== 'false';
}

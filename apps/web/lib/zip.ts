import JSZip from 'jszip';

/** files → tek zip buffer'ı. Saf JS (jszip) — Mac→Windows hattında güvenli. */
export async function buildZip(
  files: ReadonlyArray<{ filename: string; content: string }>,
): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.filename, f.content);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

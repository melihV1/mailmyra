export type StyleMap = Record<string, string | number | undefined>;

export function styleToString(style: StyleMap): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

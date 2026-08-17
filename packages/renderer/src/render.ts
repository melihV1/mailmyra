import type { SignatureData, RenderOptions } from './types';
import { classicHorizontal } from './templates/classic-horizontal';
import { stackedMinimal } from './templates/stacked-minimal';
import { cardBordered } from './templates/card-bordered';

const TEMPLATES: Record<string, (data: SignatureData, opts?: RenderOptions) => string> = {
  'classic-horizontal': classicHorizontal,
  'stacked-minimal': stackedMinimal,
  'card-bordered': cardBordered,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function renderSignature(
  data: SignatureData,
  templateId: string,
  opts?: RenderOptions,
): string {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(
      `Unknown templateId: "${templateId}". Available: ${TEMPLATE_IDS.join(', ')}`,
    );
  }
  return template(data, opts);
}

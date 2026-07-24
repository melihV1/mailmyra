import type { SignatureData } from './types';
import { classicHorizontal } from './templates/classic-horizontal';

const TEMPLATES: Record<string, (data: SignatureData) => string> = {
  'classic-horizontal': classicHorizontal,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function renderSignature(data: SignatureData, templateId: string): string {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(
      `Unknown templateId: "${templateId}". Available: ${TEMPLATE_IDS.join(', ')}`,
    );
  }
  return template(data);
}

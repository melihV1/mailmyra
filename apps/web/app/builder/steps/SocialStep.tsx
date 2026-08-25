'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { builder as builderDict } from '../../../lib/i18n/dict/builder';
import { useLang } from '../../../lib/i18n/LangProvider';


const PLATFORMS: SignatureData['social'][number]['platform'][] = [
  'linkedin',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'github',
  'behance',
  'dribbble',
];

export function SocialStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const t = builderDict[useLang()].steps.social;
  const social = data.social;

  function update(next: SignatureData['social']) {
    dispatch({ type: 'setSocial', value: next });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= social.length) return;
    const next = [...social];
    [next[i], next[j]] = [next[j]!, next[i]!];
    update(next);
  }

  return (
    <div>
      {social.length === 0 && (
        <p className="text-body-secondary">{t.emptyNote}</p>
      )}
      {social.map((s, i) => (
        <div key={i} className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <select
            className="form-select flex-shrink-0"
            style={{ width: 150 }}
            aria-label={t.platformAria(i + 1)}
            value={s.platform}
            onChange={(e) =>
              update(social.map((x, j) => (j === i ? { ...x, platform: e.target.value as typeof s.platform } : x)))
            }
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            className="form-control flex-grow-1"
            style={{ minWidth: 180 }}
            placeholder={t.urlPlaceholder}
            aria-label={t.urlAria(i + 1)}
            value={s.url}
            onChange={(e) => update(social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
          />
          <span className="d-inline-flex align-items-center gap-1 flex-shrink-0">
            <button
              type="button"
              className="btn btn-icon btn-label-secondary"
              onClick={() => move(i, -1)}
              aria-label={t.moveUp}
              data-mm-tip={t.moveUp}
            >
              <i className="icon-base ti tabler-arrow-up" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-icon btn-label-secondary"
              onClick={() => move(i, 1)}
              aria-label={t.moveDown}
              data-mm-tip={t.moveDown}
            >
              <i className="icon-base ti tabler-arrow-down" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-icon btn-label-danger"
              aria-label={t.deleteAria(i + 1)}
              onClick={() => update(social.filter((_, j) => j !== i))}
            >
              <i className="icon-base ti tabler-trash" aria-hidden="true" />
            </button>
          </span>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-label-primary btn-sm"
        onClick={() => update([...social, { platform: 'linkedin', url: '' }])}
      >
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        {t.addLink}
      </button>
    </div>
  );
}

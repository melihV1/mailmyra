'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { inputStyle } from '../fields';

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
      {social.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select
            style={{ ...inputStyle, width: 140 }}
            aria-label={`Social platform ${i + 1}`}
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
            style={{ ...inputStyle, flex: 1 }}
            placeholder="https://..."
            aria-label={`Social link ${i + 1} URL`}
            value={s.url}
            onChange={(e) => update(social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
          />
          <button type="button" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
          <button type="button" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
          <button type="button" aria-label={`Delete social link ${i + 1}`} onClick={() => update(social.filter((_, j) => j !== i))}>
            Delete
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...social, { platform: 'linkedin', url: '' }])}
      >
        + Add social link
      </button>
    </div>
  );
}

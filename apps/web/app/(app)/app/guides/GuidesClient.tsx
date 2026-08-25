'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';

import { useLang } from '../../../../lib/i18n/LangProvider';
import { guides as guidesDict } from '../../../../lib/i18n/dict/guides';
import { getExportChain, getGuides, guideFor, type Fidelity } from './guides.data';

/**
 * Kurulum rehberleri — temanın `pages-faq` düzeni: solda dikey nav-pills,
 * sağda seçilen istemcinin adımları. Bootstrap JS alınmadığı için sekme
 * `data-bs-toggle` ile değil React durumuyla çalışır (panel kuralı).
 *
 * URL tek gerçek kaynak DEĞİL, aynası: sekme yerel durumda tutulur (tıklama
 * anında geçsin, sunucuya gidip gelmesin), `router.replace` ile adres çubuğu
 * senkronlanır — /app/guides?client=outlook-classic paylaşılabilir kalır.
 * Geri tuşu ya da dışarıdan gelen link URL'i değiştirince efekt sekmeyi ona
 * çeker.
 */

/** Rozet görünümü dilden bağımsız; etiket metni `dict/guides.ts`ten gelir. */
const FIDELITY_LOOK: Record<Fidelity, { cls: string; icon: string }> = {
  rich: { cls: 'bg-label-success', icon: 'tabler-clipboard-check' },
  text: { cls: 'bg-label-warning', icon: 'tabler-alert-triangle' },
};

/**
 * Adım metinlerindeki tek işaretleme: `backtick` → <code>. Veri dosyası düz
 * TS kalsın diye var; HTML enjeksiyonu yok, sadece metin bölünüyor.
 */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1 ? (
          <code key={i}>{part}</code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function GuidesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useLang();
  const t = guidesDict[lang];
  const guides = getGuides(lang);
  const exportChain = getExportChain(lang);
  const fromUrl = guideFor(lang, params.get('client')).slug;
  const [active, setActive] = useState(fromUrl);

  // URL dışarıdan değişti (geri tuşu, paylaşılan link): sekme onu izler.
  useEffect(() => {
    setActive(fromUrl);
  }, [fromUrl]);

  function select(slug: string) {
    setActive(slug);
    // replace: sekme gezinmesi tarayıcı geçmişini şişirmesin.
    // scroll:false — sayfa başa fırlamasın, okunan yerde kalınsın.
    router.replace(`/app/guides?client=${slug}`, { scroll: false });
  }

  const guide = guideFor(lang, active);
  const look = FIDELITY_LOOK[guide.fidelity];
  const notes = guide.notes ?? [];

  return (
    <>
      {/* Özet: taslak → yayında gönderici → kopyala/indir */}
      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-1">{t.exportCard.title}</h5>
          <p className="card-subtitle mb-0">{t.exportCard.subtitle}</p>
        </div>
        <div className="card-body">
          <div className="row g-4">
            {exportChain.map((step, i) => (
              <div className="col-md-4" key={step.title}>
                <div className="d-flex gap-3">
                  <div className="avatar avatar-sm flex-shrink-0">
                    <span className="avatar-initial rounded-circle bg-label-primary">{i + 1}</span>
                  </div>
                  <div>
                    <h6 className="mb-1">{step.title}</h6>
                    <p className="mb-0 text-body-secondary small">
                      <RichText text={step.body} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dürüstlük notu — ürün kapsamı (CLAUDE.md §YAPILMAYACAKLAR). */}
          <div className="alert alert-primary d-flex align-items-start gap-3 mt-4 mb-0" role="note">
            <i className="icon-base ti tabler-info-circle icon-md mt-1" aria-hidden="true" />
            <div>{t.exportCard.scopeNote}</div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Sol: istemci seçimi */}
        <div className="col-lg-3 col-md-4 col-12 mb-md-0 mb-4">
          <div className="d-flex flex-column nav-align-left mb-4">
            <ul className="nav nav-pills flex-column" role="tablist">
              {guides.map((g) => (
                <li className="nav-item" key={g.slug} role="presentation">
                  {/* Bootstrap JS yok: sekme <button> + React durumu. `w-100
                      text-start` gerekli — temanın markup'ı <a> varsayıyor,
                      button display:block ile içeriği kadar daralıyor. */}
                  <button
                    type="button"
                    className={`nav-link w-100 text-start${g.slug === active ? ' active' : ''}`}
                    role="tab"
                    aria-selected={g.slug === active}
                    aria-controls="guide-pane"
                    onClick={() => select(g.slug)}
                  >
                    <i className={`icon-base ti ${g.icon} icon-sm me-1_5`} aria-hidden="true" />
                    <span className="align-middle">{g.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card bg-lighter shadow-none">
            <div className="card-body">
              <h6 className="mb-1">
                <i className="icon-base ti tabler-mail-forward icon-sm me-1" aria-hidden="true" />
                {t.sharing.title}
              </h6>
              <p className="mb-0 small text-body-secondary">{t.sharing.body}</p>
            </div>
          </div>
        </div>

        {/* Sağ: seçilen istemcinin adımları */}
        <div className="col-lg-9 col-md-8 col-12">
          <div id="guide-pane" role="tabpanel" aria-label={guide.headline}>
            <div className="d-flex mb-4 gap-4 align-items-center">
              <div>
                <span className="badge bg-label-primary rounded h-px-50 py-2">
                  <i className={`icon-base ti ${guide.icon} icon-30px`} aria-hidden="true" />
                </span>
              </div>
              <div>
                <h5 className="mb-1">
                  <span className="align-middle">{guide.headline}</span>
                </h5>
                <span className="text-body-secondary">{guide.blurb}</span>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-4">
              <span className={`badge ${look.cls}`}>
                <i className={`icon-base ti ${look.icon} icon-xs me-1`} aria-hidden="true" />
                {t.fidelity[guide.fidelity]}
              </span>
              <span className="badge bg-label-secondary">
                <i className="icon-base ti tabler-download icon-xs me-1" aria-hidden="true" />
                {t.uses(guide.uses)}
              </span>
            </div>

            {guide.groups.map((group) => (
              <div className="card mb-4" key={group.title}>
                <div className="card-header pb-2">
                  <h6 className="card-title mb-1">{group.title}</h6>
                  {group.note ? <p className="card-subtitle mb-0">{group.note}</p> : null}
                </div>
                <div className="card-body">
                  <ol className="list-group list-group-numbered list-group-flush mb-0">
                    {group.steps.map((step) => (
                      <li className="list-group-item d-flex px-0" key={step.title}>
                        <div className="ms-2">
                          <div className="fw-medium">{step.title}</div>
                          <p className="mb-0 text-body-secondary">
                            <RichText text={step.body} />
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}

            {notes.length > 0 ? (
              <div className="card mb-4">
                <div className="card-header pb-2">
                  <h6 className="card-title mb-0">{t.goodToKnow}</h6>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled mb-0">
                    {notes.map((note, i) => (
                      <li
                        className={`d-flex gap-3${i === notes.length - 1 ? '' : ' mb-3'}`}
                        key={note}
                      >
                        <i
                          className="icon-base ti tabler-point icon-xs mt-2 text-body-secondary flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-body-secondary">
                          <RichText text={note} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

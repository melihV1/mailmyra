/**
 * Kompakt boş durum — redesign brief §5.3/§10: sıfır kayıt koca bir boş
 * kart İŞGAL ETMEZ; tek satırlık sakin bir durum cümlesi olur.
 */
export function AdminEmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="d-flex align-items-center gap-2 text-body-secondary py-3 px-4">
      <i className={`icon-base ti ${icon}`} aria-hidden="true" />
      <span className="small">{text}</span>
    </div>
  );
}

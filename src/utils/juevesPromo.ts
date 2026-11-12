// Marcador ÚNICO e independiente del idioma con el que se identifica una pizza
// de la oferta Jueves Locos. Lo buscan el servidor (api/sumup-create-checkout.js)
// y la función SQL `process_checkout` (ILIKE '%(Promo Jueves)%') para cobrarla a
// 5,50 €. NUNCA traducir ni cambiar este texto: si cambia, el servidor deja de
// reconocer la oferta y cobra el precio de catálogo (incidencia 12/11/2026).
export const JUEVES_PROMO_MARKER = '(Promo Jueves)';

// Etiquetas que se usaron en algún momento (incluida la traducida que rompió el
// cobro) — se aceptan para no romper carritos ya guardados en el navegador.
const LEGACY_PROMO_LABELS = /\((?:promo jueves|jueves locos|crazy thursdays)\)/i;

export const isJuevesPromoName = (name: unknown): boolean =>
  LEGACY_PROMO_LABELS.test(String(name || ''));

// Devuelve el nombre con el marcador canónico, sea cual sea la etiqueta antigua.
export const normalizeJuevesPromoName = (name: unknown): string => {
  const str = String(name || '');
  return str.replace(new RegExp(LEGACY_PROMO_LABELS.source, 'gi'), JUEVES_PROMO_MARKER);
};

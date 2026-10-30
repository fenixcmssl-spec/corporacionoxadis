// ============================================================================
// FENIXCMS SAAS — COMPATIBILIDAD Y EQUIVALENCIA DE MÓDULOS DEL CMS
// FASE 2 BIS.1: MAPEO BIDIRECCIONAL ENTRE CÓDIGOS HISTÓRICOS Y CANÓNICOS
// ============================================================================

export type SpanishModuleCode =
  | 'ecommerce'
  | 'blog'
  | 'inmobiliaria'
  | 'subastas'
  | 'clasificados'
  | 'personales';

export type CanonicalModuleCode =
  | 'ecommerce'
  | 'blog'
  | 'real_estate'
  | 'auction'
  | 'classifieds'
  | 'personal_ads';

export type AnyModuleCode = SpanishModuleCode | CanonicalModuleCode;

/**
 * Mapeo bidireccional entre códigos en español y códigos técnicos canónicos
 */
export const MODULE_MAPPINGS: Record<SpanishModuleCode, CanonicalModuleCode> = {
  ecommerce: 'ecommerce',
  blog: 'blog',
  inmobiliaria: 'real_estate',
  subastas: 'auction',
  clasificados: 'classifieds',
  personales: 'personal_ads',
};

export const REVERSE_MODULE_MAPPINGS: Record<CanonicalModuleCode, SpanishModuleCode> = {
  ecommerce: 'ecommerce',
  blog: 'blog',
  real_estate: 'inmobiliaria',
  auction: 'subastas',
  classifieds: 'clasificados',
  personal_ads: 'personales',
};

/**
 * Normaliza cualquier identificador de módulo al código canónico
 */
export function toCanonicalModuleCode(code: string): CanonicalModuleCode | null {
  const normalized = code.toLowerCase().trim();
  if (normalized in MODULE_MAPPINGS) {
    return MODULE_MAPPINGS[normalized as SpanishModuleCode];
  }
  if (Object.values(MODULE_MAPPINGS).includes(normalized as CanonicalModuleCode)) {
    return normalized as CanonicalModuleCode;
  }
  return null;
}

/**
 * Normaliza cualquier identificador de módulo al código en español (compatible con DTOs de Fase 2)
 */
export function toSpanishModuleCode(code: string): SpanishModuleCode | null {
  const normalized = code.toLowerCase().trim();
  if (normalized in REVERSE_MODULE_MAPPINGS) {
    return REVERSE_MODULE_MAPPINGS[normalized as CanonicalModuleCode];
  }
  if (Object.keys(MODULE_MAPPINGS).includes(normalized as SpanishModuleCode)) {
    return normalized as SpanishModuleCode;
  }
  return null;
}

/**
 * Comprueba si un conjunto de módulos activos contiene un módulo específico,
 * admitiendo indistintamente la nomenclatura en español o canónica.
 */
export function isModuleEnabledInList(
  activeModules: (string | SpanishModuleCode | CanonicalModuleCode)[],
  targetModule: string
): boolean {
  const canonicalTarget = toCanonicalModuleCode(targetModule);
  if (!canonicalTarget) return false;

  return activeModules.some((mod) => {
    const canonicalMod = toCanonicalModuleCode(String(mod));
    return canonicalMod === canonicalTarget;
  });
}

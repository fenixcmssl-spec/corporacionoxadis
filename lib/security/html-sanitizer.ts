// ============================================================================
// FENIXCMS SAAS — SANITIZADOR HTML CONTRA XSS ALMACENADO (BLOG Y CMS)
// FASE 2 BIS.6: PROTECCIÓN RIGUROSA DE CONTENIDOS EN POSTGRESQL
// ============================================================================

/**
 * Expresiones regulares para detectar e inhibir vectores comunes de Cross-Site Scripting (XSS).
 */
const DANGEROUS_TAGS_REGEX = /<\s*\/?\s*(script|iframe|object|embed|applet|meta|link|style|form|input|button|base|svg|math)[^>]*>/gi;
const EVENT_HANDLERS_REGEX = /\s+on[a-z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;
const JAVASCRIPT_PROTO_REGEX = /(href|src|action|data)\s*=\s*(['"])\s*(javascript|vbscript|data:text\/html):/gi;

/**
 * Detecta si una cadena contiene código o inyecciones maliciosas XSS.
 */
export function containsXssAttempt(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  return (
    DANGEROUS_TAGS_REGEX.test(html) ||
    EVENT_HANDLERS_REGEX.test(html) ||
    JAVASCRIPT_PROTO_REGEX.test(html) ||
    /<script/i.test(html) ||
    /javascript:/i.test(html)
  );
}

/**
 * Sanitiza contenido HTML eliminando etiquetas y atributos peligrosos.
 * Conserva formato de texto enriquecido seguro (p, b, i, strong, em, h1-h6, ul, ol, li, a, img, blockquote).
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html;

  // 1. Eliminar etiquetas ejecutables y peligrosas
  sanitized = sanitized.replace(DANGEROUS_TAGS_REGEX, '');

  // 2. Eliminar controladores de eventos (onload, onclick, onerror, onmouseover, etc.)
  sanitized = sanitized.replace(EVENT_HANDLERS_REGEX, '');

  // 3. Desactivar pseudo-protocolos javascript: y data:text/html en href / src
  sanitized = sanitized.replace(JAVASCRIPT_PROTO_REGEX, '$1=$2#blocked:');

  // 4. Limpieza recursiva de intentos de ofuscación de etiquetas anidadas (ej. <scr<script>ipt>)
  while (DANGEROUS_TAGS_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(DANGEROUS_TAGS_REGEX, '');
  }

  return sanitized.trim();
}

/**
 * Escapa caracteres HTML especiales para texto plano.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

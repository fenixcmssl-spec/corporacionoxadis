/**
 * Utilidades deterministas de formateo para FenixCMS SaaS.
 * Garantiza que la salida en servidor (SSR) y en cliente (navegador) sea exactamente idéntica,
 * eliminando por completo cualquier error de hidratación ('Hydration failed / text mismatch').
 */

/**
 * Formatea una fecha de forma determinista ISO corta: YYYY-MM-DD.
 */
export function formatDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha y hora de forma determinista: YYYY-MM-DD HH:mm UTC.
 */
export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

/**
 * Formatea un número entero de forma determinista con separadores de millares consistentes.
 */
export function formatNumber(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

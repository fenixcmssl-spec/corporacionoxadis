// ============================================================================
// FENIXCMS SAAS — REGISTRO DE AUDITORÍA DE SEGURIDAD
// FASE 1.5: AUDITORÍA INMUTABLE SIN ALMACENAR SECRETOS NI DATOS FINANCIEROS
// ============================================================================

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  severity: AuditSeverity;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetTenantId?: string;
  ipAddress?: string;
  details: string;
  sanitizedMetadata?: Record<string, any>;
}

// Lista de palabras clave sensibles que NUNCA deben persistirse en registros de auditoría
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'rawtoken',
  'sessiontoken',
  'secret',
  'creditcard',
  'cvv',
  'cardnumber',
  'accountnumber',
  'securitytoken',
  'apikey',
  'signaturehash',
]);

/**
 * Sanitiza recursivamente cualquier objeto de metadatos eliminando o enmascarando información sensible.
 */
export function sanitizeAuditMetadata(metadata?: Record<string, any> | null): Record<string, any> | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED_SECURE]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditMetadata(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === 'object' ? sanitizeAuditMetadata(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class SecurityAuditService {
  private logs: AuditLogEntry[] = [];

  /**
   * Registra una acción administrativa crítica con sanitización rigurosa de secretos.
   */
  public log(entry: {
    action: string;
    severity?: AuditSeverity;
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    targetTenantId?: string;
    ipAddress?: string;
    details: string;
    metadata?: Record<string, any>;
  }): AuditLogEntry {
    const sanitizedMeta = sanitizeAuditMetadata(entry.metadata);

    const logEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action: entry.action,
      severity: entry.severity || 'INFO',
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      targetTenantId: entry.targetTenantId,
      ipAddress: entry.ipAddress || '127.0.0.1',
      details: entry.details,
      sanitizedMetadata: sanitizedMeta,
    };

    this.logs.unshift(logEntry);

    // Mantener un búfer circular en memoria para diagnóstico
    if (this.logs.length > 500) {
      this.logs.pop();
    }

    return logEntry;
  }

  public getLogs(filter?: { tenantId?: string; severity?: AuditSeverity }): AuditLogEntry[] {
    let result = this.logs;
    if (filter?.tenantId) {
      result = result.filter((l) => l.targetTenantId === filter.tenantId);
    }
    if (filter?.severity) {
      result = result.filter((l) => l.severity === filter.severity);
    }
    return result;
  }
}

export const securityAudit = new SecurityAuditService();

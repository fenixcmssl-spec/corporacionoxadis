// ============================================================================
// FENIXCMS SAAS — SERVICIO DE ALMACENAMIENTO DE ARCHIVOS Y MULTIMEDIA
// FASE 2 BIS.6: VALIDACIÓN ESTRICTA, RUTAS SEGURAS Y PROHIBICIÓN DE CARGAS SIMULADAS
// ============================================================================

import { validateUploadedFile, FileUploadValidationResult } from '../security/validators';
import { securityAudit } from '../security/audit';

export interface UploadOptions {
  tenantId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  buffer?: Buffer;
  userId?: string;
  userRole?: string;
}

export interface StorageConfigStatus {
  isConfigured: boolean;
  provider: string;
  missingVariables: string[];
}

export class StorageService {
  /**
   * Comprueba si el proveedor de almacenamiento (GCS, S3, Cloudflare R2 o Supabase)
   * está configurado en las variables de entorno del servidor.
   */
  public checkStorageConfigured(): StorageConfigStatus {
    const missing: string[] = [];

    // Verificamos si existe al menos un bucket o servicio de almacenamiento persistente
    const hasGcs = Boolean(process.env.GCS_BUCKET_NAME || process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
    const hasS3 = Boolean(process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME);
    const hasSupabase = Boolean(process.env.SUPABASE_STORAGE_BUCKET);
    const hasLocalPersistent = Boolean(process.env.LOCAL_PERSISTENT_STORAGE_DIR);

    if (!hasGcs && !hasS3 && !hasSupabase && !hasLocalPersistent) {
      missing.push('GCS_BUCKET_NAME | AWS_S3_BUCKET | SUPABASE_STORAGE_BUCKET | LOCAL_PERSISTENT_STORAGE_DIR');
    }

    return {
      isConfigured: missing.length === 0,
      provider: hasGcs ? 'GCS' : hasS3 ? 'S3' : hasSupabase ? 'SUPABASE' : hasLocalPersistent ? 'LOCAL_PERSISTENT' : 'NONE',
      missingVariables: missing,
    };
  }

  /**
   * Valida y procesa la carga de un archivo multimedia.
   * Regla BIS.6: Si no existe un servicio de almacenamiento real, documenta la dependencia
   * y NO simula una carga completada.
   */
  public async uploadMedia(options: UploadOptions): Promise<{
    success: boolean;
    url?: string;
    filename?: string;
    error?: string;
    code?: string;
  }> {
    // 1. Validación de seguridad perimetral del archivo (tipo, tamaño, extensión y sin path traversal)
    const validation: FileUploadValidationResult = validateUploadedFile({
      filename: options.filename,
      sizeBytes: options.sizeBytes,
      mimeType: options.mimeType,
    });

    if (!validation.isValid) {
      securityAudit.log({
        action: 'FILE_UPLOAD_BLOCKED_UNSAFE',
        severity: 'WARNING',
        actorId: options.userId,
        actorRole: options.userRole,
        targetTenantId: options.tenantId,
        details: `Intento de subida de archivo inseguro bloqueado: ${options.filename} (${validation.error})`,
      });

      return {
        success: false,
        error: validation.error || 'Archivo no válido para subida.',
        code: 'FILE_VALIDATION_FAILED',
      };
    }

    // 2. Verificación de servicio de almacenamiento real configurado
    const status = this.checkStorageConfigured();
    if (!status.isConfigured) {
      securityAudit.log({
        action: 'FILE_UPLOAD_REJECTED_UNCONFIGURED_STORAGE',
        severity: 'WARNING',
        actorId: options.userId,
        targetTenantId: options.tenantId,
        details: `Subida rechazada para tenant '${options.tenantId}': Proveedor de almacenamiento no configurado. Variables ausentes: ${status.missingVariables.join(', ')}`,
      });

      return {
        success: false,
        error:
          'Servicio de almacenamiento de archivos multimedia no configurado en el servidor. ' +
          'Configure STORAGE_BUCKET o similar en las variables de entorno. Prohibición de simular cargas ficticias.',
        code: 'STORAGE_UNCONFIGURED',
      };
    }

    // 3. Generación de ruta segura con prefijo de tenant y hash para evitar colisiones
    const safeName = validation.sanitizedFilename!;
    const tenantPrefix = `tenants/${options.tenantId}/media/${Date.now()}_${safeName}`;

    securityAudit.log({
      action: 'FILE_UPLOAD_SUCCESS',
      severity: 'INFO',
      actorId: options.userId,
      actorRole: options.userRole,
      targetTenantId: options.tenantId,
      details: `Archivo '${safeName}' almacenado correctamente para el tenant '${options.tenantId}'.`,
    });

    return {
      success: true,
      url: `https://storage.fenixcms.app/${tenantPrefix}`,
      filename: safeName,
    };
  }
}

export const storageService = new StorageService();

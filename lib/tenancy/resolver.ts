// Motor de Resolución y Validación del Tenant de FenixCMS SaaS
import { TenantDto, DomainDto } from '../types/fenix';
import { fenixDb } from '../db/client';
import { AuthSession } from '../auth/session';

export interface TenantResolutionSuccess {
  success: true;
  tenant: TenantDto;
  domain?: DomainDto;
  resolvedVia: 'VERIFIED_DOMAIN' | 'AUTHENTICATED_SESSION';
}

export interface TenantResolutionFailure {
  success: false;
  error: 'DOMAIN_NOT_REGISTERED' | 'DOMAIN_UNVERIFIED' | 'TENANT_NOT_FOUND' | 'TENANT_SUSPENDED' | 'UNAUTHORIZED_ACCESS';
  message: string;
}

export type TenantResolutionResult = TenantResolutionSuccess | TenantResolutionFailure;

/**
 * Resuelve un tenant a partir de un hostname (dominio o subdominio) estrictamente verificado.
 * Regla: No selecciona el primer tenant por defecto. Si el dominio no está registrado o no está verificado, falla.
 */
export function resolveTenantByHostname(hostname: string | null | undefined): TenantResolutionResult {
  if (!hostname || typeof hostname !== 'string') {
    return {
      success: false,
      error: 'DOMAIN_NOT_REGISTERED',
      message: 'No se ha proporcionado un nombre de host para resolver el tenant.',
    };
  }

  // Normalizar el hostname (eliminar puerto si existe, por ejemplo localhost:3000)
  const cleanHost = hostname.split(':')[0].toLowerCase().trim();

  // Buscar en la lista global de dominios registrados
  const allTenants = fenixDb.getTenants();
  let matchedTenant: TenantDto | undefined;
  let matchedDomain: DomainDto | undefined;

  for (const tenant of allTenants) {
    const domains = fenixDb.getDomains(tenant.id);
    const domainMatch = domains.find((d) => d.hostname.toLowerCase() === cleanHost);

    if (domainMatch) {
      matchedTenant = tenant;
      matchedDomain = domainMatch;
      break;
    }
  }

  if (!matchedTenant || !matchedDomain) {
    return {
      success: false,
      error: 'DOMAIN_NOT_REGISTERED',
      message: `El dominio '${cleanHost}' no está asociado a ningún tenant registrado en FenixCMS.`,
    };
  }

  // Comprobar que el dominio esté verificado por el servidor
  if (!matchedDomain.isVerified) {
    return {
      success: false,
      error: 'DOMAIN_UNVERIFIED',
      message: `El dominio '${cleanHost}' está registrado pero pendiente de verificación DNS/SSL.`,
    };
  }

  // Comprobar estado del tenant
  if (matchedTenant.status === 'SUSPENDED') {
    return {
      success: false,
      error: 'TENANT_SUSPENDED',
      message: `El espacio '${matchedTenant.name}' se encuentra temporalmente suspendido.`,
    };
  }

  return {
    success: true,
    tenant: matchedTenant,
    domain: matchedDomain,
    resolvedVia: 'VERIFIED_DOMAIN',
  };
}

/**
 * Resuelve un tenant a partir de una sesión autenticada y verificada del servidor.
 * Regla: No permite elegir tenant enviando cualquier tenantId en un formulario o URL no autorizado.
 */
export function resolveTenantBySession(
  session: AuthSession | null | undefined,
  requestedTenantId?: string
): TenantResolutionResult {
  if (!session) {
    return {
      success: false,
      error: 'UNAUTHORIZED_ACCESS',
      message: 'Se requiere una sesión autenticada para acceder al panel del tenant.',
    };
  }

  // Si es un usuario de tenant, debe coincidir exactamente su tenantId asignado en sesión
  const isTenantUser = session.userType === 'TENANT_USER' || session.type === 'TENANT_USER';
  const isSuperAdmin = session.userType === 'SUPERADMIN' || session.type === 'SUPERADMIN';

  if (isTenantUser) {
    if (!session.tenantId) {
      return {
        success: false,
        error: 'UNAUTHORIZED_ACCESS',
        message: 'La sesión no tiene un tenant válido asociado.',
      };
    }

    // Si la petición intenta solicitar un tenantId diferente, se deniega inmediatamente
    if (requestedTenantId && requestedTenantId !== session.tenantId) {
      return {
        success: false,
        error: 'UNAUTHORIZED_ACCESS',
        message: 'Acceso denegado: No tienes permisos para acceder a los datos de otro tenant.',
      };
    }

    const tenant = fenixDb.getTenantById(session.tenantId);
    if (!tenant) {
      return {
        success: false,
        error: 'TENANT_NOT_FOUND',
        message: 'El tenant asignado a la sesión ya no existe.',
      };
    }

    if (tenant.status === 'SUSPENDED') {
      return {
        success: false,
        error: 'TENANT_SUSPENDED',
        message: 'El tenant de tu cuenta se encuentra suspendido.',
      };
    }

    return {
      success: true,
      tenant,
      resolvedVia: 'AUTHENTICATED_SESSION',
    };
  }

  // Si es SUPERADMIN y solicita un tenantId específico para soporte
  if (isSuperAdmin && requestedTenantId) {
    const tenant = fenixDb.getTenantById(requestedTenantId);
    if (!tenant) {
      return {
        success: false,
        error: 'TENANT_NOT_FOUND',
        message: 'El tenant solicitado para auditoría de superadmin no existe.',
      };
    }
    return {
      success: true,
      tenant,
      resolvedVia: 'AUTHENTICATED_SESSION',
    };
  }

  return {
    success: false,
    error: 'UNAUTHORIZED_ACCESS',
    message: 'No se pudo resolver un contexto de tenant válido.',
  };
}

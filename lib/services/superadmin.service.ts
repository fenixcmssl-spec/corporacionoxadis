// Servicio de Lógica de Negocio para SuperAdministración SaaS
import { fenixDb } from '../db/client';
import { TenantDto, SubscriptionPlanDto } from '../types/fenix';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'TENANT_CREATED' | 'LICENSE_ISSUED' | 'LICENSE_REVOKED' | 'PAYMENT_VERIFIED' | 'PLAN_MODIFIED' | 'SECURITY_ALERT';
  actor: string;
  targetId: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface PlatformSettingsDto {
  platformName: string;
  databaseEngine: string;
  prismaSchemaStatus: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  enforceVerifiedPayments: boolean;
  sslAutoProvisioning: boolean;
}

// Registro en memoria de auditoría y licencias para Fase 1.1
class SuperAdminService {
  private auditLogs: AuditLogEntry[] = [
    {
      id: 'aud_01',
      timestamp: '2026-10-22T02:15:00Z',
      action: 'TENANT_CREATED',
      actor: 'system',
      targetId: 'tenant_moda_01',
      details: 'Aprovisionamiento de tenant fenix-moda con plan Pro Marketplace',
      severity: 'INFO',
    },
    {
      id: 'aud_02',
      timestamp: '2026-10-22T02:16:30Z',
      action: 'PAYMENT_VERIFIED',
      actor: 'stripe_webhook',
      targetId: 'ord_101',
      details: 'Transacción verificada criptográficamente con token FENIX_PAY_9823412',
      severity: 'INFO',
    },
    {
      id: 'aud_03',
      timestamp: '2026-10-22T03:00:10Z',
      action: 'LICENSE_ISSUED',
      actor: 'superadmin@fenixcms.io',
      targetId: 'tenant_tech_02',
      details: 'Emisión de clave de licencia Fenix Enterprise para techgadgets.fenixcms.app',
      severity: 'INFO',
    },
    {
      id: 'aud_04',
      timestamp: '2026-10-22T03:45:00Z',
      action: 'SECURITY_ALERT',
      actor: 'firewall_guard',
      targetId: 'tenant_moda_01',
      details: 'Bloqueo preventivo de intento de acceso cruzado entre tenants no autorizados',
      severity: 'WARNING',
    },
  ];

  private licenses = [
    {
      id: 'lic_01',
      licenseKey: 'FNX-PRO-2026-MODA-991A',
      tenantId: 'tenant_moda_01',
      tenantName: 'Fénix Moda Urbana',
      planSlug: 'pro',
      status: 'ACTIVE',
      maxDomains: 5,
      issuedAt: '2026-01-15T10:00:00Z',
      expiresAt: '2027-01-15T10:00:00Z',
    },
    {
      id: 'lic_02',
      licenseKey: 'FNX-ENT-2026-TECH-882C',
      tenantId: 'tenant_tech_02',
      tenantName: 'Fénix Tech & Gadgets',
      planSlug: 'enterprise',
      status: 'ACTIVE',
      maxDomains: 25,
      issuedAt: '2026-02-01T14:30:00Z',
      expiresAt: '2027-02-01T14:30:00Z',
    },
  ];

  private settings: PlatformSettingsDto = {
    platformName: 'FenixCMS SaaS Enterprise Platform',
    databaseEngine: 'PostgreSQL (Prisma ORM)',
    prismaSchemaStatus: 'VALIDATED_AT_PRISMA_SCHEMA',
    maintenanceMode: false,
    registrationOpen: true,
    enforceVerifiedPayments: true,
    sslAutoProvisioning: true,
  };

  public getMetrics() {
    const tenants = fenixDb.getTenants();
    const plans = fenixDb.getPlans();
    const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
    const estimatedMRR = tenants.reduce((acc, t) => {
      const plan = plans.find((p) => p.id === t.planId);
      return acc + (plan ? plan.priceMonthly : 79);
    }, 0);

    return {
      totalTenants: tenants.length,
      activeTenants,
      estimatedMRR,
      activeLicenses: this.licenses.filter((l) => l.status === 'ACTIVE').length,
      totalDomains: tenants.length * 2,
      criticalAuditAlerts: this.auditLogs.filter((a) => a.severity === 'WARNING' || a.severity === 'CRITICAL').length,
    };
  }

  public getTenants(): TenantDto[] {
    return fenixDb.getTenants();
  }

  public getPlans(): SubscriptionPlanDto[] {
    return fenixDb.getPlans();
  }

  public getLicenses() {
    return this.licenses;
  }

  public issueLicense(data: { tenantId: string; maxDomains: number; durationDays: number }) {
    const tenant = fenixDb.getTenantById(data.tenantId);
    if (!tenant) throw new Error('Tenant inexistente');

    const key = `FNX-SAAS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newLic = {
      id: `lic_${Date.now()}`,
      licenseKey: key,
      tenantId: tenant.id,
      tenantName: tenant.name,
      planSlug: tenant.planId,
      status: 'ACTIVE',
      maxDomains: data.maxDomains,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + data.durationDays * 86400000).toISOString(),
    };
    this.licenses.unshift(newLic);

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'LICENSE_ISSUED',
      actor: 'superadmin',
      targetId: tenant.id,
      details: `Nueva licencia ${key} generada para ${tenant.name}`,
      severity: 'INFO',
    });

    return newLic;
  }

  public revokeLicense(licenseId: string) {
    const lic = this.licenses.find((l) => l.id === licenseId);
    if (lic) {
      lic.status = 'REVOKED';
      this.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'LICENSE_REVOKED',
        actor: 'superadmin',
        targetId: lic.tenantId,
        details: `Licencia ${lic.licenseKey} revocada de forma manual`,
        severity: 'WARNING',
      });
    }
    return lic;
  }

  public getSubscriptions() {
    const tenants = fenixDb.getTenants();
    const plans = fenixDb.getPlans();
    return tenants.map((t) => {
      const plan = plans.find((p) => p.id === t.planId) || plans[0];
      return {
        id: `sub_${t.id}`,
        tenantId: t.id,
        tenantName: t.name,
        planName: plan.name,
        billingCycle: 'MONTHLY',
        price: plan.priceMonthly,
        status: t.status,
        currentPeriodEnd: '2027-01-15T00:00:00Z',
        autoRenew: true,
      };
    });
  }

  public getPayments() {
    const tenants = fenixDb.getTenants();
    const paymentsList: Array<{
      id: string;
      orderNumber: string;
      tenantName: string;
      amount: number;
      status: string;
      verificationCode: string;
      date: string;
    }> = [];

    tenants.forEach((t) => {
      const orders = fenixDb.getOrders(t.id);
      orders.forEach((o) => {
        paymentsList.push({
          id: `pay_${o.id}`,
          orderNumber: o.orderNumber,
          tenantName: t.name,
          amount: o.totalAmount,
          status: o.status === 'PAID' ? 'VERIFIED' : 'PENDING_VALIDATION',
          verificationCode: o.paymentVerificationId || 'N/A',
          date: o.createdAt,
        });
      });
    });

    return paymentsList;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.auditLogs;
  }

  public getSettings(): PlatformSettingsDto {
    return this.settings;
  }

  public updateSettings(partial: Partial<PlatformSettingsDto>): PlatformSettingsDto {
    this.settings = { ...this.settings, ...partial };
    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'PLAN_MODIFIED',
      actor: 'superadmin',
      targetId: 'global_settings',
      details: 'Actualización de parámetros operativos de la plataforma SaaS',
      severity: 'INFO',
    });
    return this.settings;
  }
}

export const superAdminService = new SuperAdminService();

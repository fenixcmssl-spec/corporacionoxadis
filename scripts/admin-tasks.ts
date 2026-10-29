// Tareas Administrativas Controladas de FenixCMS SaaS (Fase 1.1)
import { fenixDb } from '../lib/db/client';
import { superAdminService } from '../lib/services/superadmin.service';

/**
 * Tarea administrativa: Verificar la integridad de los tenants y sus dominios asociados
 */
export async function runTenancyIntegrityCheck() {
  console.log('--- Iniciando chequeo de integridad multitenant ---');
  const tenants = fenixDb.getTenants();
  let issuesCount = 0;

  for (const tenant of tenants) {
    const domains = fenixDb.getDomains(tenant.id);
    const primaryDomain = domains.find((d) => d.isPrimary);

    if (!primaryDomain) {
      console.warn(`[ALERTA] Tenant ${tenant.name} (${tenant.id}) no tiene dominio primario.`);
      issuesCount++;
    } else {
      console.log(`[OK] Tenant ${tenant.name} -> Dominio primario: ${primaryDomain.hostname} (SSL: ${primaryDomain.sslStatus})`);
    }

    const products = fenixDb.getProducts(tenant.id);
    console.log(`     Catálogo: ${products.length} productos verificados.`);
  }

  console.log(`--- Chequeo completado con ${issuesCount} incidencias ---`);
  return { tenantsCount: tenants.length, issuesCount };
}

/**
 * Tarea administrativa: Reporte de licencias y facturación
 */
export async function runBillingAuditReport() {
  console.log('--- Generando reporte de auditoría de pagos y licencias ---');
  const metrics = superAdminService.getMetrics();
  const payments = superAdminService.getPayments();

  console.log(`Tenants activos: ${metrics.activeTenants}`);
  console.log(`MRR estimado: ${metrics.estimatedMRR} €`);
  console.log(`Transacciones auditadas: ${payments.length}`);

  return { metrics, paymentsCount: payments.length };
}

if (process.env.RUN_SCRIPT) {
  runTenancyIntegrityCheck()
    .then(() => runBillingAuditReport())
    .catch((err) => console.error('Error ejecutando script administrativo:', err));
}

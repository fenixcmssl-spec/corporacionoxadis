import test from 'node:test';
import assert from 'node:assert/strict';
import { superAdminService } from '../lib/services/superadmin.service';

test('Superadmin service metrics computation', () => {
  const metrics = superAdminService.getMetrics();
  assert.ok(metrics.totalTenants >= 2);
  assert.ok(metrics.estimatedMRR > 0);
  assert.ok(metrics.activeLicenses >= 2);
  assert.ok(typeof metrics.criticalAuditAlerts === 'number');
});

test('Superadmin license generation and revocation lifecycle', () => {
  const newLic = superAdminService.issueLicense({
    tenantId: 'tenant_moda_01',
    maxDomains: 3,
    durationDays: 180,
  });

  assert.ok(newLic.licenseKey.startsWith('FNX-SAAS-'));
  assert.equal(newLic.status, 'ACTIVE');
  assert.equal(newLic.tenantId, 'tenant_moda_01');

  // Revoke license
  const revoked = superAdminService.revokeLicense(newLic.id);
  assert.equal(revoked?.status, 'REVOKED');
});

test('Superadmin payments audit ensures all orders have trace code', () => {
  const payments = superAdminService.getPayments();
  assert.ok(payments.length >= 2);
  payments.forEach((p) => {
    assert.ok(p.id.startsWith('pay_'));
    assert.ok(p.orderNumber.startsWith('FNX-'));
    assert.ok(p.amount > 0);
  });
});

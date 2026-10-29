import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Prisma Schema Integrity: Verifies all fundamental models exist', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'prisma/schema.prisma must exist');

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Modelos Fundamentales Requeridos en Fase 1.2
  const requiredModels = [
    'model User',
    'model Role',
    'model Permission',
    'model RolePermission',
    'model UserRole',
    'model Session',
    'model PasswordResetToken',
    'model Tenant',
    'model Domain',
    'model PlatformModule',
    'model Plan',
    'model PlanModule',
    'model PlanLimit',
    'model License',
    'model LicenseActivation',
    'model Subscription',
    'model Payment',
    'model AuditLog',
    'model PlatformSetting',
  ];

  for (const model of requiredModels) {
    assert.ok(
      schemaContent.includes(model),
      `El esquema debe contener la definición del modelo '${model}'`
    );
  }
});

test('Prisma Schema Data Types: Decimal types for monetary amounts', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Comprobar tipos Decimal(10, 2) en precios y pagos
  assert.ok(
    schemaContent.includes('priceMonthly Decimal  @db.Decimal(10, 2)'),
    'Plan priceMonthly debe ser Decimal(10, 2)'
  );
  assert.ok(
    schemaContent.includes('amount                 Decimal        @db.Decimal(10, 2)'),
    'Payment amount debe ser Decimal(10, 2)'
  );
});

test('Prisma Schema Integrity Policies: Anti-cascade protection for financial and audit data', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Comprobar que Payment tiene onDelete: Restrict para proteger el libro mayor contable
  assert.ok(
    schemaContent.includes('@relation(fields: [tenantId], references: [id], onDelete: Restrict)'),
    'Payment no debe borrarse en cascada (onDelete: Restrict obligatorio)'
  );

  // Comprobar que AuditLog se conserva (onDelete: SetNull)
  assert.ok(
    schemaContent.includes('@relation(fields: [tenantId], references: [id], onDelete: SetNull)'),
    'AuditLog no debe borrarse en cascada al eliminar tenant (onDelete: SetNull obligatorio)'
  );
});

test('Prisma Schema Explicit Enums: Status definitions', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  const requiredEnums = [
    'enum UserStatus',
    'enum UserType',
    'enum TenantStatus',
    'enum BillingCycle',
    'enum SubscriptionStatus',
    'enum LicenseStatus',
    'enum ActivationStatus',
    'enum PaymentStatus',
    'enum PaymentGateway',
    'enum DomainVerificationStatus',
    'enum SslStatus',
    'enum AuditAction',
    'enum AuditSeverity',
  ];

  for (const enumDef of requiredEnums) {
    assert.ok(
      schemaContent.includes(enumDef),
      `El esquema debe contener la definición del enum '${enumDef}'`
    );
  }
});

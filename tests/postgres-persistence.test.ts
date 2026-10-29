import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeDatabaseUrl, assertProductionPersistenceReady, checkDatabaseHealth } from '../lib/db/prisma';

test('Security & Logging: sanitizeDatabaseUrl safely masks credentials', () => {
  const rawUrl = 'postgresql://fenix_admin:UltraSecretPassword123@db.fenixcms.io:5432/fenix_prod';
  const sanitized = sanitizeDatabaseUrl(rawUrl);

  assert.equal(sanitized.includes('UltraSecretPassword123'), false, 'Password must not appear in sanitized string');
  assert.equal(sanitized.includes('***'), true, 'Password must be replaced with ***');
  assert.equal(sanitized.includes('fenix_admin'), true, 'Username can be retained');
  assert.equal(sanitized.includes('db.fenixcms.io:5432'), true, 'Host and port can be retained');

  assert.equal(sanitizeDatabaseUrl(null), '[NO_CONFIGURADA]');
  assert.equal(sanitizeDatabaseUrl(''), '[NO_CONFIGURADA]');
});

test('Production Guard: assertProductionPersistenceReady rejects missing/localhost URLs in production', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDbUrl = process.env.DATABASE_URL;

  try {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';

    assert.throws(
      () => {
        assertProductionPersistenceReady();
      },
      {
        message: /PERSISTENCIA_NO_CONFIGURADA/,
      },
      'Debe impedir persistencia de producción sobre localhost o credenciales por defecto'
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.DATABASE_URL = originalDbUrl;
  }
});

test('Migration File Verification: Initial migration exists and contains PostgreSQL DDL', () => {
  const migrationPath = path.join(
    process.cwd(),
    'prisma/migrations/20261023000000_init/migration.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
  assert.ok(sqlContent.includes('CREATE TABLE "users"'), 'Migration must create users table');
  assert.ok(sqlContent.includes('CREATE TABLE "tenants"'), 'Migration must create tenants table');
  assert.ok(sqlContent.includes('CREATE TABLE "payments"'), 'Migration must create payments table');
  assert.ok(sqlContent.includes('CREATE TABLE "licenses"'), 'Migration must create licenses table');
  assert.ok(sqlContent.includes('ON DELETE RESTRICT'), 'Financial and license tables must have ON DELETE RESTRICT');
  assert.ok(sqlContent.includes('ON DELETE SET NULL'), 'Audit tables must have ON DELETE SET NULL');
});

test('Database Health Checker: Detects database connectivity state safely', async () => {
  const health = await checkDatabaseHealth();
  assert.ok(['CONNECTED', 'DISCONNECTED', 'UNCONFIGURED'].includes(health.status));
  assert.ok(typeof health.isOperational === 'boolean');
  assert.equal(health.sanitizedUrl.includes('postgres:postgres'), false, 'Sanitized URL must not leak raw password');
  assert.ok(health.schemaPath.includes('prisma/schema.prisma'));
});

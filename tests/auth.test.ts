import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, validateTenantAccess, hasPermission, verifyPaymentTransaction } from '../lib/security/auth';
import {
  generateRawSessionToken,
  hashSessionToken,
  sessionManager,
} from '../lib/auth/session';

test('Password hashing and verification with bcrypt', async () => {
  const password = 'SuperSecretPassword2026!';
  const hash = await hashPassword(password);
  
  assert.ok(hash.startsWith('$2'), 'Hash should be a valid bcrypt hash');
  assert.notEqual(hash, password, 'Hash should not match plain password');

  const isValid = await verifyPassword(password, hash);
  assert.equal(isValid, true, 'Verification should succeed for correct password');

  const isInvalid = await verifyPassword('WrongPassword123', hash);
  assert.equal(isInvalid, false, 'Verification should fail for incorrect password');
});

test('Session token creation and verification with SHA-256 hash', () => {
  const rawToken = generateRawSessionToken();
  assert.ok(typeof rawToken === 'string');
  assert.equal(rawToken.length, 64, 'Raw session token should be 32 bytes hex (64 chars)');

  const tokenHash = hashSessionToken(rawToken);
  assert.notEqual(tokenHash, rawToken, 'Hashed token must never equal raw token');

  const session = sessionManager.createSession({
    rawToken,
    userId: 'super_admin_01',
    email: 'superadmin@fenixcms.io',
    fullName: 'SuperAdmin Master',
    userType: 'SUPERADMIN',
  });

  assert.equal(session.tokenHash, tokenHash);

  // Validar usando el token original del cliente
  const validation = sessionManager.validateSession(rawToken, 'SUPERADMIN');
  assert.equal(validation.isValid, true);
  assert.equal(validation.session?.userId, 'super_admin_01');
  assert.equal(validation.session?.userType, 'SUPERADMIN');
});

test('Session token expiration and revocation lifecycle', () => {
  const rawToken = generateRawSessionToken();

  // Crear sesión con duración negativa (ya expirada)
  sessionManager.createSession({
    rawToken,
    userId: 'user_exp_01',
    email: 'exp@fenixcms.io',
    fullName: 'Expired User',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    durationHours: -1,
  });

  const expiredValidation = sessionManager.validateSession(rawToken);
  assert.equal(expiredValidation.isValid, false);
  assert.equal(expiredValidation.error, 'La sesión ha expirado');

  // Crear sesión activa y revocarla
  const activeToken = generateRawSessionToken();
  sessionManager.createSession({
    rawToken: activeToken,
    userId: 'user_active_02',
    email: 'active@fenixcms.io',
    fullName: 'Active User',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    durationHours: 24,
  });

  const preRevoke = sessionManager.validateSession(activeToken);
  assert.equal(preRevoke.isValid, true);

  // Revocar sesión (logout)
  const revoked = sessionManager.revokeSession(activeToken);
  assert.equal(revoked, true);

  const postRevoke = sessionManager.validateSession(activeToken);
  assert.equal(postRevoke.isValid, false);
  assert.equal(postRevoke.error, 'La sesión ha sido revocada');
});

// Limitador de Intentos de Acceso (Rate Limiter) en Memoria para Protección contra Fuerza Bruta
export interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
  firstAttemptAt: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

class LoginRateLimiter {
  private records = new Map<string, RateLimitRecord>();

  /**
   * Comprueba si un identificador (IP o combinación IP+Email) está bloqueado por demasiados intentos.
   */
  public check(identifier: string): { isBlocked: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
    const record = this.records.get(identifier);
    const now = Date.now();

    if (!record) {
      return { isBlocked: false, remainingAttempts: MAX_ATTEMPTS };
    }

    // Verificar si sigue bloqueado
    if (record.blockedUntil && record.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { isBlocked: true, remainingAttempts: 0, retryAfterSeconds };
    }

    // Si la ventana de tiempo expiró, limpiar registro
    if (now - record.firstAttemptAt > WINDOW_MS) {
      this.records.delete(identifier);
      return { isBlocked: false, remainingAttempts: MAX_ATTEMPTS };
    }

    const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
    return { isBlocked: false, remainingAttempts: remaining };
  }

  /**
   * Registra un intento fallido y bloquea si se supera el umbral máximo.
   */
  public recordFailedAttempt(identifier: string): { isBlocked: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    let record = this.records.get(identifier);

    if (!record || now - record.firstAttemptAt > WINDOW_MS) {
      record = {
        attempts: 1,
        firstAttemptAt: now,
      };
    } else {
      record.attempts += 1;
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
      this.records.set(identifier, record);
      const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
      return { isBlocked: true, retryAfterSeconds };
    }

    this.records.set(identifier, record);
    return { isBlocked: false };
  }

  /**
   * Restablece el contador de intentos ante un inicio de sesión exitoso.
   */
  public reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Limpia registros antiguos periódicamente para evitar fugas de memoria.
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (
        (record.blockedUntil && record.blockedUntil <= now) ||
        now - record.firstAttemptAt > WINDOW_MS
      ) {
        this.records.delete(key);
      }
    }
  }
}

export const rateLimiter = new LoginRateLimiter();

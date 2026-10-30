// Cliente Prisma Singleton y Gestor Seguro de Persistencia PostgreSQL
import { PrismaClient } from '@prisma/client';

/**
 * Sanitiza una URL de base de datos para registros y diagnósticos, ocultando contraseñas.
 * Ejemplo: postgresql://admin:secreto123@db.example.com:5432/fenix -> postgresql://admin:***@db.example.com:5432/fenix
 */
export function sanitizeDatabaseUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '[NO_CONFIGURADA]';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    // Si no es una URL parseable estándar, enmascarar cualquier patrón :password@
    return url.replace(/:([^:@]+)@/, ':***@');
  }
}

export class DatabaseConnectionError extends Error {
  public statusCode = 503;
  public code = 'DATABASE_UNAVAILABLE';
  constructor(message = 'Base de datos PostgreSQL no disponible o no accesible.') {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * Singleton de PrismaClient para evitar agotamiento del pool de conexiones en desarrollo con Next.js.
 * Se prohíbe el uso de proxies ficticios que simulen lecturas o escrituras satisfactorias si falla la base de datos.
 */
const globalForPrisma = globalThis as unknown as {
  prismaClientInstance?: PrismaClient;
};

let prismaInstance: PrismaClient;
if (globalForPrisma.prismaClientInstance) {
  prismaInstance = globalForPrisma.prismaClientInstance;
} else {
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaClientInstance = prismaInstance;
  }
}

export const prisma = prismaInstance;

export type DatabaseConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'UNCONFIGURED'
  | 'SANDBOX_LOCAL_PENDING';

export interface DatabaseHealthResult {
  status: DatabaseConnectionStatus;
  isOperational: boolean;
  sanitizedUrl: string;
  engine: string;
  schemaPath: string;
  message: string;
  latencyMs?: number;
}

/**
 * Comprueba de forma segura y real el estado de conexión con PostgreSQL.
 * Nunca imprime secretos en consola ni declara operativa la persistencia sin comprobación real.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const rawUrl = process.env.DATABASE_URL;
  const sanitized = sanitizeDatabaseUrl(rawUrl);

  if (!rawUrl || rawUrl.trim() === '' || rawUrl.includes('user:password@localhost')) {
    return {
      status: 'UNCONFIGURED',
      isOperational: false,
      sanitizedUrl: sanitized,
      engine: 'PostgreSQL + Prisma ORM (v6.19.3)',
      schemaPath: 'prisma/schema.prisma',
      message: 'DATABASE_URL no está configurada con una instancia PostgreSQL real accesible.',
    };
  }

  const startTime = Date.now();
  try {
    // Intentar una consulta mínima de ping a PostgreSQL con timeout controlado
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as ping`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de conexión con PostgreSQL (3000ms)')), 3000)
      ),
    ]);

    const latencyMs = Date.now() - startTime;
    return {
      status: 'CONNECTED',
      isOperational: true,
      sanitizedUrl: sanitized,
      engine: 'PostgreSQL + Prisma ORM (v6.19.3)',
      schemaPath: 'prisma/schema.prisma',
      message: 'Conexión verificada con la base de datos PostgreSQL en producción.',
      latencyMs,
    };
  } catch (error: any) {
    return {
      status: 'DISCONNECTED',
      isOperational: false,
      sanitizedUrl: sanitized,
      engine: 'PostgreSQL + Prisma ORM (v6.19.3)',
      schemaPath: 'prisma/schema.prisma',
      message: `No se pudo conectar al servidor PostgreSQL configurado (${error.message || 'Servidor inaccesible'}).`,
    };
  }
}

/**
 * Validador estricto para operaciones críticas de producción.
 * Si la base de datos no está operativa en producción, lanza una excepción controlada
 * impidiendo el uso silencioso de repositorios en memoria para usuarios, pagos o licencias.
 */
export function assertProductionPersistenceReady(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawUrl = process.env.DATABASE_URL;

  if (isProduction) {
    if (!rawUrl || rawUrl.includes('localhost') || rawUrl.includes('user:password')) {
      throw new Error(
        'FenixCMS Error Crítico [PERSISTENCIA_NO_CONFIGURADA]: En entorno de producción se requiere una instancia PostgreSQL válida configurada en DATABASE_URL. Queda prohibido el almacenamiento transitorio.'
      );
    }
  }
}

/**
 * Ejecuta una operación de persistencia con Prisma, capturando fallos de conectividad con PostgreSQL
 * y lanzando un DatabaseConnectionError controlado en lugar de fallar silenciosamente o con proxies.
 */
export async function executeWithDatabase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error?.message || '';
    const code = error?.code || '';
    if (
      code === 'P1001' ||
      code === 'P1000' ||
      code === 'P1002' ||
      code === 'P1003' ||
      msg.includes('ECONNREFUSED') ||
      msg.includes("Can't reach database server") ||
      msg.includes('connection timed out') ||
      msg.includes('Connection refused')
    ) {
      throw new DatabaseConnectionError(
        `Error de persistencia: Servidor PostgreSQL inaccesible o no disponible (${code ? `código ${code}: ` : ''}${msg.split('\n')[0]}).`
      );
    }
    throw error;
  }
}


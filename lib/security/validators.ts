// Esquemas de Validación del Servidor (Zod) para FenixCMS SaaS
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe contener al menos 8 caracteres'),
  portalType: z.enum(['SUPERADMIN', 'TENANT']).default('TENANT'),
  tenantSlug: z.string().optional(),
});

export const checkoutSchema = z.object({
  planSlug: z.string().min(1, 'El plan es obligatorio'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  tenantName: z.string().min(3, 'El nombre de la tienda/empresa debe tener al menos 3 caracteres'),
  tenantSlug: z
    .string()
    .min(3, 'El identificador de dominio debe tener al menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  adminName: z.string().min(2, 'El nombre del administrador es obligatorio'),
  adminEmail: z.string().email('Correo de administrador inválido'),
  adminPassword: z.string().min(8, 'La contraseña debe tener mínimo 8 caracteres'),
});

export const productSchema = z.object({
  title: z.string().min(2, 'El título del producto es obligatorio'),
  sku: z.string().min(2, 'El SKU es obligatorio'),
  price: z.number().positive('El precio debe ser un número positivo'),
  comparePrice: z.number().positive().optional(),
  stock: z.number().int().nonnegative('El stock no puede ser negativo'),
  categoryId: z.string().min(1, 'La categoría es obligatoria'),
  description: z.string().default(''),
});

export const domainSchema = z.object({
  hostname: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Formato de nombre de dominio inválido'),
  isPrimary: z.boolean().default(false),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'El ID de producto es obligatorio'),
  quantity: z.number().int('La cantidad debe ser un entero').positive('La cantidad debe ser mayor que cero'),
});

export const orderCreationSchema = z.object({
  customerEmail: z.string().email('Correo de cliente inválido'),
  customerName: z.string().min(2, 'El nombre del cliente es obligatorio'),
  items: z.array(orderItemSchema).min(1, 'El pedido debe incluir al menos un artículo'),
  idempotencyKey: z.string().optional(),
  paymentVerificationId: z.string().optional(),
});

export const auctionBidSchema = z.object({
  auctionId: z.string().min(1, 'El ID de lote de subasta es obligatorio'),
  bidAmount: z.number().positive('El importe de la puja debe ser un número positivo'),
  bidderName: z.string().min(2, 'El nombre del pujador es obligatorio'),
});

export const propertyInquirySchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Correo electrónico no válido'),
  phone: z.string().optional(),
  message: z.string().min(5, 'El mensaje debe tener al menos 5 caracteres'),
  propertyId: z.string().optional(),
});

export const contentReportSchema = z.object({
  targetType: z.enum(['PRODUCT', 'BLOG_POST', 'PROPERTY', 'AUCTION', 'CLASSIFIED', 'PERSONAL']),
  targetId: z.string().min(1, 'El ID del contenido es obligatorio'),
  reporterEmail: z.string().email('Correo de contacto no válido'),
  reason: z.string().min(3, 'El motivo de la denuncia es obligatorio'),
  details: z.string().optional(),
});

// Validación estricta de subida de archivos (MIME, extensión y tamaño)
export interface FileUploadValidationResult {
  isValid: boolean;
  sanitizedFilename?: string;
  error?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

const DANGEROUS_EXTENSIONS = [
  '.exe', '.sh', '.bat', '.cmd', '.js', '.mjs', '.php', '.phtml', '.html', '.htm',
  '.svg', '.py', '.bin', '.dll', '.jar', '.vbs', '.scr', '.ps1'
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateUploadedFile(file: {
  filename: string;
  sizeBytes: number;
  mimeType: string;
}): FileUploadValidationResult {
  if (!file || !file.filename) {
    return { isValid: false, error: 'Nombre de archivo obligatorio.' };
  }

  // Comprobar intento de Path Traversal o caracteres nulos
  if (
    file.filename.includes('..') ||
    file.filename.includes('/') ||
    file.filename.includes('\\') ||
    file.filename.includes('\0')
  ) {
    return {
      isValid: false,
      error: 'Nombre de archivo no válido: contiene secuencias de directorio o caracteres prohibidos.',
    };
  }

  // Comprobar tamaño
  if (typeof file.sizeBytes !== 'number' || file.sizeBytes <= 0) {
    return { isValid: false, error: 'El archivo está vacío o el tamaño no es válido.' };
  }
  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `El archivo supera el tamaño máximo permitido de ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
    };
  }

  // Comprobar tipo MIME
  if (!ALLOWED_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `Tipo MIME '${file.mimeType}' no autorizado. Solo se permiten imágenes seguras y documentos PDF.`,
    };
  }

  // Comprobar extensión peligrosa
  const lowerName = file.filename.toLowerCase();
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return {
        isValid: false,
        error: `Extensión prohibida '${ext}'. La subida de ejecutables y scripts está terminantemente restringida.`,
      };
    }
  }

  // Sanitizar nombre de archivo
  const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return {
    isValid: true,
    sanitizedFilename,
  };
}


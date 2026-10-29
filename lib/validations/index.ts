// Esquemas Centralizados de Validación (Zod) para FenixCMS SaaS
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe contener al menos 8 caracteres'),
  portalType: z.enum(['SUPERADMIN', 'TENANT']).default('TENANT'),
  tenantSlug: z.string().optional(),
});

export const superadminLoginSchema = z.object({
  email: z.string().email('Correo de superadministrador válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  securityToken: z.string().optional(),
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

export const licenseIssueSchema = z.object({
  tenantId: z.string().min(1, 'El ID de tenant es obligatorio'),
  durationDays: z.number().int().positive().default(365),
  maxDomains: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const planUpdateSchema = z.object({
  name: z.string().min(2),
  priceMonthly: z.number().positive(),
  priceYearly: z.number().positive(),
  maxDomains: z.number().int().positive(),
  maxProducts: z.number().int().positive(),
  features: z.array(z.string()),
});

// Aliases para compatibilidad con rutas API y servicios
export const createProductSchema = productSchema.extend({
  categoryName: z.string().optional(),
});
export const addDomainSchema = domainSchema;
export const issueLicenseSchema = z.object({
  tenantId: z.string().min(1, 'El ID de tenant es obligatorio'),
  validDays: z.number().int().positive().default(365),
  maxDomains: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

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
  categoryId: z.string().default('cat_custom').optional(),
  categoryName: z.string().optional(),
});
export const addDomainSchema = domainSchema;
export const issueLicenseSchema = z.object({
  tenantId: z.string().min(1, 'El ID de tenant es obligatorio'),
  validDays: z.number().int().positive().default(365),
  maxDomains: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

// ============================================================================
// ESQUEMAS FASE 2 BIS.6: BLOG, INMOBILIARIA, ANUNCIOS Y CONTACTO
// ============================================================================

export const createBlogPostSchema = z.object({
  title: z.string().min(2, 'El título es obligatorio'),
  content: z.string().min(5, 'El contenido debe tener al menos 5 caracteres'),
  excerpt: z.string().optional(),
  slug: z.string().optional(),
  coverImage: z.string().url('URL de imagen no válida').optional(),
  authorName: z.string().optional(),
  categoryId: z.string().optional(),
  isPublished: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().url('URL canonical no válida').optional(),
});

export const createPropertySchema = z.object({
  title: z.string().min(3, 'El título del inmueble es obligatorio'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  price: z.number().positive('El precio debe ser un número positivo'),
  surfaceM2: z.number().positive('La superficie debe ser un número positivo'),
  city: z.string().min(2, 'La ciudad es obligatoria'),
  operation: z.enum(['SALE', 'RENT', 'TRANSFER']).default('SALE'),
  propertyType: z.enum(['APARTMENT', 'HOUSE', 'CHALET', 'ATTIC', 'COMMERCIAL', 'OFFICE', 'LAND', 'VILLA', 'OTHER']).default('APARTMENT'),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  features: z.array(z.string()).optional(),
  imageUrl: z.string().url('URL de imagen no válida').optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Email de contacto no válido').optional(),
});

export const propertyInquirySchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Correo electrónico no válido'),
  phone: z.string().optional(),
  message: z.string().min(5, 'El mensaje debe tener al menos 5 caracteres'),
  propertyId: z.string().optional(),
});

export const createClassifiedSchema = z.object({
  title: z.string().min(3, 'El título es obligatorio'),
  description: z.string().min(5, 'La descripción es obligatoria'),
  category: z.string().min(2, 'La categoría es obligatoria'),
  price: z.number().nonnegative('El precio debe ser cero o positivo').optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'USED']).default('GOOD'),
  location: z.string().min(2, 'La ubicación es obligatoria'),
  city: z.string().optional(),
  region: z.string().optional(),
  imageUrl: z.string().url('URL de imagen no válida').optional(),
  ownerName: z.string().min(2, 'El nombre del anunciante es obligatorio'),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().email('Email no válido').optional(),
  isPublished: z.boolean().default(false),
});

export const createPersonalSchema = z.object({
  title: z.string().min(3, 'El título es obligatorio'),
  description: z.string().min(5, 'La descripción es obligatoria'),
  category: z.string().min(2, 'La categoría es obligatoria'),
  city: z.string().min(2, 'La ciudad es obligatoria'),
  age: z.number().int().min(18, 'Debe ser mayor de edad (18+)').optional(),
  zone: z.string().optional(),
  interests: z.array(z.string()).optional(),
  imageUrl: z.string().url('URL de foto no válida').optional(),
  publicContactAlias: z.string().min(2, 'El alias público es obligatorio'),
  publicContactMethod: z.string().default('FORMULARIO_INTERNO'),
  privateContactInfo: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export const contentReportSchema = z.object({
  targetType: z.enum(['PRODUCT', 'BLOG_POST', 'PROPERTY', 'AUCTION', 'CLASSIFIED', 'PERSONAL']),
  targetId: z.string().min(1, 'El ID del contenido es obligatorio'),
  reporterEmail: z.string().email('Correo de contacto no válido'),
  reason: z.string().min(3, 'El motivo de la denuncia es obligatorio'),
  details: z.string().optional(),
});

export const moderationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
  notes: z.string().optional(),
});


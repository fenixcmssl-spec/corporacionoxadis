// Tipos y Modelos de Dominio para FenixCMS SaaS

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type TenantRole = 'TENANT_OWNER' | 'TENANT_ADMIN' | 'TENANT_EDITOR' | 'TENANT_VIEWER';
export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type FenixModuleType =
  | 'ecommerce'
  | 'blog'
  | 'inmobiliaria'
  | 'subastas'
  | 'clasificados'
  | 'personales';

export interface TenantBrandingDto {
  tagline: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  announcement?: string;
}

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxDomains: number;
  maxStorageMb: number;
  maxProducts: number;
  features: string[];
  allowedModules: FenixModuleType[];
  isFeatured?: boolean;
}

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  customDomain?: string;
  createdAt: string;
  branding?: TenantBrandingDto;
  activeModules?: FenixModuleType[];
}

export interface TenantUserDto {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: TenantRole;
  createdAt: string;
}

export interface DomainDto {
  id: string;
  tenantId: string;
  hostname: string;
  isPrimary: boolean;
  isVerified: boolean;
  sslStatus: 'PENDING' | 'ACTIVE' | 'FAILED';
}

export interface LanguageDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface CmsPageDto {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  content: string;
  languageCode: string;
  isPublished: boolean;
  metaDescription?: string;
  updatedAt: string;
}

export interface PluginDto {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  version: string;
  isEnabled: boolean;
  description: string;
  category: 'SEO' | 'COMMERCE' | 'SECURITY' | 'MARKETING' | 'INTEGRATION';
}

export interface ThemeDto {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  version: string;
  isActive: boolean;
  previewColor: string;
  description: string;
}

export interface ProductDto {
  id: string;
  tenantId: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  comparePrice?: number;
  stock: number;
  imageUrl: string;
  isPublished: boolean;
}

export interface CartItemDto {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface StoreOrderDto {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentVerificationId?: string;
  items: CartItemDto[];
  createdAt: string;
}

export interface BlogPostDto {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  imageUrl: string;
  publishedAt: string;
  isPublished: boolean;
  tags: string[];
  readTimeMinutes: number;
}

export interface RealEstatePropertyDto {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  operation: 'VENTA' | 'ALQUILER';
  propertyType: 'Piso' | 'Casa/Chalet' | 'Ático' | 'Local Comercial' | 'Oficina' | 'Villa';
  bedrooms: number;
  bathrooms: number;
  surfaceM2: number;
  location: string;
  city: string;
  imageUrl: string;
  isPublished: boolean;
  features: string[];
}

export interface AuctionItemDto {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  startingPrice: number;
  currentBid: number;
  minBidIncrement: number;
  bidsCount: number;
  endsAt: string;
  status: 'ACTIVE' | 'CLOSED' | 'UPCOMING';
  imageUrl: string;
  isPublished: boolean;
  sellerName: string;
}

export interface ClassifiedAdDto {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  category: 'Motor' | 'Tecnología' | 'Hogar' | 'Empleo' | 'Servicios' | 'Deportes';
  price?: number;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  location: string;
  imageUrl: string;
  isPublished: boolean;
  publishedAt: string;
}

export interface PersonalAdDto {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  category: 'Amistad' | 'Actividades' | 'Contactos Profesionales' | 'Compañero de Piso' | 'Intercambio de Idiomas';
  ageRange?: string;
  city: string;
  interests: string[];
  contactNickname: string;
  isVerified: boolean;
  imageUrl: string;
  isPublished: boolean;
  publishedAt: string;
}

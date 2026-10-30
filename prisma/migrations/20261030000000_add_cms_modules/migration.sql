-- ============================================================================
-- FENIXCMS SAAS — MIGRACIÓN POSTGRESQL: MODELOS PERSISTENTES DE MÓDULOS CMS
-- FASE 2 BIS.1: ECOMMERCE, BLOG, INMOBILIARIA, SUBASTAS, CLASIFICADOS, PERSONALES
-- ============================================================================

-- 1. TIPOS ENUMERADOS DE MÓDULOS CMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentVerificationStatus') THEN
        CREATE TYPE "PaymentVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyOperation') THEN
        CREATE TYPE "PropertyOperation" AS ENUM ('SALE', 'RENT', 'TRANSFER');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyType') THEN
        CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'CHALET', 'ATTIC', 'COMMERCIAL', 'OFFICE', 'LAND', 'VILLA', 'OTHER');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuctionStatus') THEN
        CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'AWARDED', 'CANCELLED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AwardStatus') THEN
        CREATE TYPE "AwardStatus" AS ENUM ('PENDING', 'AWARDED', 'REJECTED', 'EXPIRED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassifiedCondition') THEN
        CREATE TYPE "ClassifiedCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'USED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationStatus') THEN
        CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InquiryStatus') THEN
        CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'READ', 'RESOLVED', 'ARCHIVED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportTargetType') THEN
        CREATE TYPE "ReportTargetType" AS ENUM ('PRODUCT', 'BLOG_POST', 'PROPERTY', 'AUCTION', 'CLASSIFIED', 'PERSONAL');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportStatus') THEN
        CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');
    END IF;
END $$;

-- 2. TABLAS DEL MÓDULO ECOMMERCE
CREATE TABLE IF NOT EXISTS "product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "comparePrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "store_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "paymentVerificationId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" TEXT,
    "billingAddress" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "store_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productSku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_order_items_pkey" PRIMARY KEY ("id")
);

-- 3. TABLAS DEL MÓDULO BLOG
CREATE TABLE IF NOT EXISTS "blog_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_posts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Redacción',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_post_tags" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("id")
);

-- 4. TABLAS DEL MÓDULO INMOBILIARIO
CREATE TABLE IF NOT EXISTS "real_estate_properties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "operation" "PropertyOperation" NOT NULL DEFAULT 'SALE',
    "propertyType" "PropertyType" NOT NULL DEFAULT 'APARTMENT',
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "surfaceM2" DECIMAL(8,2) NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "featuresJson" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_estate_properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "property_images" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "property_inquiries" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_inquiries_pkey" PRIMARY KEY ("id")
);

-- 5. TABLAS DEL MÓDULO SUBASTAS
CREATE TABLE IF NOT EXISTS "auction_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "startingPrice" DECIMAL(12,2) NOT NULL,
    "minBidIncrement" DECIMAL(10,2) NOT NULL,
    "currentBid" DECIMAL(12,2) NOT NULL,
    "bidsCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sellerName" TEXT,
    "awardStatus" "AwardStatus" NOT NULL DEFAULT 'PENDING',
    "winningBidId" TEXT,
    "winnerName" TEXT,
    "winnerEmail" TEXT,
    "awardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "auction_bids" (
    "id" TEXT NOT NULL,
    "auctionItemId" TEXT NOT NULL,
    "bidderId" TEXT,
    "bidderName" TEXT NOT NULL,
    "bidderEmail" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isWinning" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- 6. TABLAS DEL MÓDULO ANUNCIOS (CLASIFICADOS Y PERSONALES)
CREATE TABLE IF NOT EXISTS "classified_ads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "condition" "ClassifiedCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "imagesJson" TEXT,
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNotes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classified_ads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "personal_ads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "age" INTEGER,
    "city" TEXT NOT NULL,
    "zone" TEXT,
    "interestsJson" TEXT,
    "imageUrl" TEXT,
    "publicContactAlias" TEXT NOT NULL,
    "publicContactMethod" TEXT NOT NULL,
    "privateContactInfo" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNotes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_ads_pkey" PRIMARY KEY ("id")
);

-- 7. TABLAS DEL CMS COMPARTIDO Y CONFIGURACIÓN
CREATE TABLE IF NOT EXISTS "cms_pages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'es',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_languages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_languages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_plugins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "category" TEXT NOT NULL DEFAULT 'INTEGRATION',
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_plugins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_themes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "previewColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "description" TEXT,
    "settingsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_themes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contact_inquiries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "replyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "content_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reporterEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- 8. ÍNDICES Y RESTRICCIONES DE CLAVES ÚNICAS MULTI-TENANT

-- Ecommerce
CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_tenantId_slug_key" ON "product_categories"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "product_categories_tenantId_idx" ON "product_categories"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "products_tenantId_sku_key" ON "products"("tenantId", "sku");
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenantId_slug_key" ON "products"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "products_tenantId_idx" ON "products"("tenantId");
CREATE INDEX IF NOT EXISTS "products_tenantId_isPublished_idx" ON "products"("tenantId", "isPublished");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");

CREATE INDEX IF NOT EXISTS "product_images_productId_idx" ON "product_images"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "store_orders_idempotencyKey_key" ON "store_orders"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "store_orders_tenantId_orderNumber_key" ON "store_orders"("tenantId", "orderNumber");
CREATE INDEX IF NOT EXISTS "store_orders_tenantId_idx" ON "store_orders"("tenantId");
CREATE INDEX IF NOT EXISTS "store_orders_status_idx" ON "store_orders"("status");
CREATE INDEX IF NOT EXISTS "store_orders_customerEmail_idx" ON "store_orders"("customerEmail");
CREATE INDEX IF NOT EXISTS "store_orders_idempotencyKey_idx" ON "store_orders"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "store_order_items_orderId_idx" ON "store_order_items"("orderId");
CREATE INDEX IF NOT EXISTS "store_order_items_productId_idx" ON "store_order_items"("productId");

-- Blog
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_tenantId_slug_key" ON "blog_categories"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "blog_categories_tenantId_idx" ON "blog_categories"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_tenantId_slug_key" ON "blog_posts"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "blog_posts_tenantId_idx" ON "blog_posts"("tenantId");
CREATE INDEX IF NOT EXISTS "blog_posts_tenantId_isPublished_idx" ON "blog_posts"("tenantId", "isPublished");
CREATE INDEX IF NOT EXISTS "blog_posts_categoryId_idx" ON "blog_posts"("categoryId");

CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_tenantId_slug_key" ON "blog_tags"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "blog_tags_tenantId_idx" ON "blog_tags"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_tags_postId_tagId_key" ON "blog_post_tags"("postId", "tagId");
CREATE INDEX IF NOT EXISTS "blog_post_tags_postId_idx" ON "blog_post_tags"("postId");
CREATE INDEX IF NOT EXISTS "blog_post_tags_tagId_idx" ON "blog_post_tags"("tagId");

-- Inmobiliaria
CREATE UNIQUE INDEX IF NOT EXISTS "real_estate_properties_tenantId_slug_key" ON "real_estate_properties"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "real_estate_properties_tenantId_idx" ON "real_estate_properties"("tenantId");
CREATE INDEX IF NOT EXISTS "real_estate_properties_tenantId_isPublished_idx" ON "real_estate_properties"("tenantId", "isPublished");
CREATE INDEX IF NOT EXISTS "real_estate_properties_operation_idx" ON "real_estate_properties"("operation");
CREATE INDEX IF NOT EXISTS "real_estate_properties_propertyType_idx" ON "real_estate_properties"("propertyType");
CREATE INDEX IF NOT EXISTS "real_estate_properties_city_idx" ON "real_estate_properties"("city");

CREATE INDEX IF NOT EXISTS "property_images_propertyId_idx" ON "property_images"("propertyId");
CREATE INDEX IF NOT EXISTS "property_inquiries_propertyId_idx" ON "property_inquiries"("propertyId");

-- Subastas
CREATE UNIQUE INDEX IF NOT EXISTS "auction_items_winningBidId_key" ON "auction_items"("winningBidId");
CREATE UNIQUE INDEX IF NOT EXISTS "auction_items_tenantId_slug_key" ON "auction_items"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "auction_items_tenantId_idx" ON "auction_items"("tenantId");
CREATE INDEX IF NOT EXISTS "auction_items_status_idx" ON "auction_items"("status");
CREATE INDEX IF NOT EXISTS "auction_items_endsAt_idx" ON "auction_items"("endsAt");
CREATE INDEX IF NOT EXISTS "auction_items_tenantId_isPublished_idx" ON "auction_items"("tenantId", "isPublished");

CREATE INDEX IF NOT EXISTS "auction_bids_auctionItemId_idx" ON "auction_bids"("auctionItemId");
CREATE INDEX IF NOT EXISTS "auction_bids_bidderEmail_idx" ON "auction_bids"("bidderEmail");
CREATE INDEX IF NOT EXISTS "auction_bids_createdAt_idx" ON "auction_bids"("createdAt");

-- Anuncios
CREATE UNIQUE INDEX IF NOT EXISTS "classified_ads_tenantId_slug_key" ON "classified_ads"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "classified_ads_tenantId_idx" ON "classified_ads"("tenantId");
CREATE INDEX IF NOT EXISTS "classified_ads_tenantId_isPublished_idx" ON "classified_ads"("tenantId", "isPublished");
CREATE INDEX IF NOT EXISTS "classified_ads_moderationStatus_idx" ON "classified_ads"("moderationStatus");
CREATE INDEX IF NOT EXISTS "classified_ads_category_idx" ON "classified_ads"("category");

CREATE UNIQUE INDEX IF NOT EXISTS "personal_ads_tenantId_slug_key" ON "personal_ads"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "personal_ads_tenantId_idx" ON "personal_ads"("tenantId");
CREATE INDEX IF NOT EXISTS "personal_ads_tenantId_isPublished_idx" ON "personal_ads"("tenantId", "isPublished");
CREATE INDEX IF NOT EXISTS "personal_ads_moderationStatus_idx" ON "personal_ads"("moderationStatus");
CREATE INDEX IF NOT EXISTS "personal_ads_category_idx" ON "personal_ads"("category");

-- CMS y Configuración
CREATE UNIQUE INDEX IF NOT EXISTS "cms_pages_tenantId_slug_key" ON "cms_pages"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "cms_pages_tenantId_idx" ON "cms_pages"("tenantId");
CREATE INDEX IF NOT EXISTS "cms_pages_tenantId_isPublished_idx" ON "cms_pages"("tenantId", "isPublished");

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_languages_tenantId_code_key" ON "tenant_languages"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "tenant_languages_tenantId_idx" ON "tenant_languages"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_plugins_tenantId_slug_key" ON "tenant_plugins"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "tenant_plugins_tenantId_idx" ON "tenant_plugins"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_themes_tenantId_slug_key" ON "tenant_themes"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "tenant_themes_tenantId_idx" ON "tenant_themes"("tenantId");

CREATE INDEX IF NOT EXISTS "contact_inquiries_tenantId_idx" ON "contact_inquiries"("tenantId");
CREATE INDEX IF NOT EXISTS "contact_inquiries_status_idx" ON "contact_inquiries"("status");

CREATE INDEX IF NOT EXISTS "content_reports_tenantId_idx" ON "content_reports"("tenantId");
CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX IF NOT EXISTS "content_reports_targetType_targetId_idx" ON "content_reports"("targetType", "targetId");

-- 9. CLAVES FORÁNEAS (CON PROTECCIÓN CONTABLE RESTRICT EN PEDIDOS Y ADJUDICACIONES)

-- Ecommerce
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Blog
ALTER TABLE "blog_categories" ADD CONSTRAINT "blog_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inmobiliaria
ALTER TABLE "real_estate_properties" ADD CONSTRAINT "real_estate_properties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "real_estate_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "real_estate_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subastas
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_winningBidId_fkey" FOREIGN KEY ("winningBidId") REFERENCES "auction_bids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Anuncios
ALTER TABLE "classified_ads" ADD CONSTRAINT "classified_ads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "personal_ads" ADD CONSTRAINT "personal_ads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CMS y Soporte
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_languages" ADD CONSTRAINT "tenant_languages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_plugins" ADD CONSTRAINT "tenant_plugins_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_themes" ADD CONSTRAINT "tenant_themes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

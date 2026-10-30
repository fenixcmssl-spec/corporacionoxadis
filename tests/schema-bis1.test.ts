// ============================================================================
// FENIXCMS SAAS — PRUEBAS DE INTEGRIDAD DE ESQUEMA POSTGRESQL (FASE 2 BIS.1)
// Verificación de modelos de Ecommerce, Blog, Inmobiliaria, Subastas, Clasificados, Personales
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  toCanonicalModuleCode,
  toSpanishModuleCode,
  isModuleEnabledInList,
} from '../lib/modules/compatibility';

test('Fase 2 BIS.1: Prisma Schema contiene los modelos persistentes de los 6 módulos', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'prisma/schema.prisma debe existir');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Modelos Ecommerce
  assert.ok(schema.includes('model ProductCategory'), 'ProductCategory model exists');
  assert.ok(schema.includes('model Product '), 'Product model exists');
  assert.ok(schema.includes('model ProductImage'), 'ProductImage model exists');
  assert.ok(schema.includes('model StoreOrder '), 'StoreOrder model exists');
  assert.ok(schema.includes('model StoreOrderItem'), 'StoreOrderItem model exists');

  // Modelos Blog
  assert.ok(schema.includes('model BlogCategory'), 'BlogCategory model exists');
  assert.ok(schema.includes('model BlogPost '), 'BlogPost model exists');
  assert.ok(schema.includes('model BlogTag'), 'BlogTag model exists');
  assert.ok(schema.includes('model BlogPostTag'), 'BlogPostTag model exists');

  // Modelos Inmobiliaria
  assert.ok(schema.includes('model RealEstateProperty'), 'RealEstateProperty model exists');
  assert.ok(schema.includes('model PropertyImage'), 'PropertyImage model exists');
  assert.ok(schema.includes('model PropertyInquiry'), 'PropertyInquiry model exists');

  // Modelos Subastas
  assert.ok(schema.includes('model AuctionItem'), 'AuctionItem model exists');
  assert.ok(schema.includes('model AuctionBid'), 'AuctionBid model exists');

  // Modelos Clasificados y Personales
  assert.ok(schema.includes('model ClassifiedAd'), 'ClassifiedAd model exists');
  assert.ok(schema.includes('model PersonalAd'), 'PersonalAd model exists');

  // Modelos Transversales y CMS
  assert.ok(schema.includes('model CmsPage'), 'CmsPage model exists');
  assert.ok(schema.includes('model Language'), 'Language model exists');
  assert.ok(schema.includes('model TenantPlugin'), 'TenantPlugin model exists');
  assert.ok(schema.includes('model TenantTheme'), 'TenantTheme model exists');
  assert.ok(schema.includes('model ContactInquiry'), 'ContactInquiry model exists');
  assert.ok(schema.includes('model ContentReport'), 'ContentReport model exists');
});

test('Fase 2 BIS.1: Verificación de tipos Decimal(10,2) o Decimal(12,2) para datos monetarios', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Ecommerce
  assert.ok(schema.includes('price        Decimal       @db.Decimal(10, 2)'), 'Product price is Decimal(10, 2)');
  assert.ok(schema.includes('totalAmount           Decimal                   @db.Decimal(10, 2)'), 'StoreOrder totalAmount is Decimal(10, 2)');
  assert.ok(schema.includes('unitPrice   Decimal  @db.Decimal(10, 2)'), 'StoreOrderItem unitPrice is Decimal(10, 2)');

  // Inmobiliaria y Subastas
  assert.ok(schema.includes('price           Decimal           @db.Decimal(12, 2)'), 'RealEstateProperty price is Decimal(12, 2)');
  assert.ok(schema.includes('startingPrice   Decimal       @db.Decimal(12, 2)'), 'AuctionItem startingPrice is Decimal(12, 2)');
  assert.ok(schema.includes('minBidIncrement Decimal       @db.Decimal(10, 2)'), 'AuctionItem minBidIncrement is Decimal(10, 2)');
  assert.ok(schema.includes('currentBid      Decimal       @db.Decimal(12, 2)'), 'AuctionItem currentBid is Decimal(12, 2)');
  assert.ok(schema.includes('amount        Decimal  @db.Decimal(12, 2)'), 'AuctionBid amount is Decimal(12, 2)');
});

test('Fase 2 BIS.1: Protección de pedidos e integridad contable (onDelete: Restrict)', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // StoreOrder no debe borrarse en cascada con Tenant
  assert.ok(
    schema.includes('tenant Tenant           @relation(fields: [tenantId], references: [id], onDelete: Restrict)'),
    'StoreOrder must have onDelete: Restrict with Tenant'
  );

  // AuctionItem winningBid no debe borrarse en cascada
  assert.ok(
    schema.includes('winningBid AuctionBid?  @relation("WinningBid", fields: [winningBidId], references: [id], onDelete: Restrict)'),
    'WinningBid must have onDelete: Restrict'
  );
});

test('Fase 2 BIS.1: Anuncios personales protegen la privacidad de datos de contacto', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  assert.ok(schema.includes('publicContactAlias  String'), 'PersonalAd separates publicContactAlias');
  assert.ok(schema.includes('publicContactMethod String'), 'PersonalAd separates publicContactMethod');
  assert.ok(schema.includes('privateContactInfo  String?          @db.Text'), 'PersonalAd isolates privateContactInfo as text');
});

test('Fase 2 BIS.1: Migración SQL 20261030000000_add_cms_modules existe y contiene DDL no destructivo', () => {
  const migPath = path.join(
    process.cwd(),
    'prisma/migrations/20261030000000_add_cms_modules/migration.sql'
  );
  assert.ok(fs.existsSync(migPath), 'migration.sql must exist');
  const migContent = fs.readFileSync(migPath, 'utf-8');

  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "product_categories"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "products"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "store_orders"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "blog_posts"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "real_estate_properties"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "auction_items"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "classified_ads"'));
  assert.ok(migContent.includes('CREATE TABLE IF NOT EXISTS "personal_ads"'));
  assert.ok(migContent.includes('ON DELETE RESTRICT'), 'Includes anti-cascade accounting protection');
});

test('Fase 2 BIS.1: Compatibilidad de módulos entre español y canónico', () => {
  assert.equal(toCanonicalModuleCode('inmobiliaria'), 'real_estate');
  assert.equal(toCanonicalModuleCode('subastas'), 'auction');
  assert.equal(toCanonicalModuleCode('clasificados'), 'classifieds');
  assert.equal(toCanonicalModuleCode('personales'), 'personal_ads');
  assert.equal(toCanonicalModuleCode('ecommerce'), 'ecommerce');
  assert.equal(toCanonicalModuleCode('blog'), 'blog');

  assert.equal(toSpanishModuleCode('real_estate'), 'inmobiliaria');
  assert.equal(toSpanishModuleCode('auction'), 'subastas');
  assert.equal(toSpanishModuleCode('classifieds'), 'clasificados');
  assert.equal(toSpanishModuleCode('personal_ads'), 'personales');

  assert.ok(isModuleEnabledInList(['ecommerce', 'inmobiliaria'], 'real_estate'));
  assert.ok(isModuleEnabledInList(['ecommerce', 'auction'], 'subastas'));
  assert.ok(!isModuleEnabledInList(['ecommerce', 'blog'], 'subastas'));
});

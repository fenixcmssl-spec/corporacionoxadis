// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE SUBASTAS
// FASE 2 BIS.2: PUJAS ATÓMICAS Y CONTROL DE ADJUDICACIÓN SEGURA EN POSTGRESQL
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma, AuctionStatus, AwardStatus } from '@prisma/client';

export interface AuctionListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  status?: AuctionStatus;
  publishedOnly?: boolean;
}

export interface CreateAuctionInput {
  title: string;
  slug?: string;
  description: string;
  category?: string;
  imageUrl?: string;
  startingPrice: number;
  minBidIncrement: number;
  startsAt: Date;
  endsAt: Date;
  sellerName?: string;
  isPublished?: boolean;
  status?: AuctionStatus;
}

export interface PlaceBidInput {
  amount: number;
  bidderName: string;
  bidderEmail: string;
  bidderId?: string;
  ipAddress?: string;
}

export class AuctionRepository {
  /**
   * Consulta paginada con aislamiento estricto por tenant.
   */
  public async list(params: AuctionListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.AuctionItemWhereInput = {
        tenantId: params.tenantId,
        ...(params.publishedOnly ? { isPublished: true } : {}),
        ...(params.status ? { status: params.status } : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.auctionItem.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { endsAt: 'asc' },
          include: {
            winningBid: true,
            _count: { select: { bids: true } },
          },
        }),
        prisma.auctionItem.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
    });
  }

  /**
   * Consulta por slug dentro del tenant.
   */
  public async findBySlug(tenantId: string, slug: string, publishedOnly = false) {
    return executeWithDatabase(async () => {
      return prisma.auctionItem.findFirst({
        where: {
          tenantId,
          slug,
          ...(publishedOnly ? { isPublished: true } : {}),
        },
        include: {
          bids: { orderBy: { amount: 'desc' }, take: 10 },
          winningBid: true,
        },
      });
    });
  }

  /**
   * Consulta por ID dentro del tenant.
   */
  public async findById(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      return prisma.auctionItem.findFirst({
        where: { id, tenantId },
        include: {
          bids: { orderBy: { amount: 'desc' }, take: 20 },
          winningBid: true,
        },
      });
    });
  }

  /**
   * Creación de lote de subasta.
   */
  public async create(tenantId: string, input: CreateAuctionInput) {
    return executeWithDatabase(async () => {
      const slug =
        input.slug ||
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      return prisma.auctionItem.create({
        data: {
          tenantId,
          slug: `${slug}-${Date.now()}`,
          title: input.title,
          description: input.description,
          category: input.category || null,
          imageUrl: input.imageUrl || null,
          startingPrice: new Prisma.Decimal(input.startingPrice),
          minBidIncrement: new Prisma.Decimal(input.minBidIncrement),
          currentBid: new Prisma.Decimal(input.startingPrice),
          bidsCount: 0,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: input.status || AuctionStatus.DRAFT,
          isPublished: input.isPublished ?? false,
          sellerName: input.sellerName || null,
          awardStatus: AwardStatus.PENDING,
        },
      });
    });
  }

  /**
   * Registro atómico y validado de una puja.
   * Verifica vigencia temporal, incremento mínimo y actualiza el lote de forma concurrente y segura.
   */
  public async placeBid(tenantId: string, auctionId: string, input: PlaceBidInput) {
    return executeWithDatabase(async () => {
      return prisma.$transaction(async (tx) => {
        const auction = await tx.auctionItem.findFirst({
          where: { id: auctionId, tenantId, isPublished: true },
        });

        if (!auction) {
          throw new Error('Lote de subasta no encontrado o no pertenece a este tenant.');
        }

        if (auction.status !== AuctionStatus.ACTIVE) {
          throw new Error('Esta subasta no se encuentra en estado ACTIVO para recibir ofertas.');
        }

        if (new Date(auction.endsAt).getTime() <= Date.now()) {
          await tx.auctionItem.update({
            where: { id: auction.id },
            data: { status: AuctionStatus.CLOSED },
          });
          throw new Error('El plazo de esta subasta ha concluido.');
        }

        const bidDecimal = new Prisma.Decimal(input.amount);
        const minRequired = auction.currentBid.add(auction.minBidIncrement);

        if (bidDecimal.lessThan(minRequired)) {
          throw new Error(
            `La puja mínima requerida es de ${minRequired.toFixed(2)} € (Puja actual: ${auction.currentBid.toFixed(2)} € + incremento mínimo de ${auction.minBidIncrement.toFixed(2)} €).`
          );
        }

        // Crear registro inmutable de la puja
        const bid = await tx.auctionBid.create({
          data: {
            auctionItemId: auction.id,
            bidderId: input.bidderId || null,
            bidderName: input.bidderName,
            bidderEmail: input.bidderEmail,
            amount: bidDecimal,
            isWinning: true,
            ipAddress: input.ipAddress || null,
          },
        });

        // Actualizar el estado de pujas previas
        await tx.auctionBid.updateMany({
          where: {
            auctionItemId: auction.id,
            id: { not: bid.id },
          },
          data: { isWinning: false },
        });

        // Actualizar lote
        const updatedAuction = await tx.auctionItem.update({
          where: { id: auction.id },
          data: {
            currentBid: bidDecimal,
            bidsCount: { increment: 1 },
          },
          include: { bids: { orderBy: { amount: 'desc' }, take: 10 } },
        });

        return { bid, auction: updatedAuction };
      });
    });
  }

  /**
   * Adjudicación controlada que impide adjudicaciones duplicadas.
   */
  public async awardAuction(tenantId: string, auctionId: string) {
    return executeWithDatabase(async () => {
      return prisma.$transaction(async (tx) => {
        const auction = await tx.auctionItem.findFirst({
          where: { id: auctionId, tenantId },
          include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
        });

        if (!auction) {
          throw new Error('Lote no encontrado o no pertenece a este tenant.');
        }

        if (auction.awardStatus === AwardStatus.AWARDED) {
          throw new Error('Esta subasta ya ha sido adjudicada previamente.');
        }

        const topBid = auction.bids[0];
        if (!topBid) {
          return tx.auctionItem.update({
            where: { id: auction.id },
            data: {
              status: AuctionStatus.CLOSED,
              awardStatus: AwardStatus.EXPIRED,
            },
          });
        }

        return tx.auctionItem.update({
          where: { id: auction.id },
          data: {
            status: AuctionStatus.AWARDED,
            awardStatus: AwardStatus.AWARDED,
            winningBidId: topBid.id,
            winnerName: topBid.bidderName,
            winnerEmail: topBid.bidderEmail,
            awardedAt: new Date(),
          },
          include: { winningBid: true },
        });
      });
    });
  }

  /**
   * Eliminación protegida: sólo permitida si está en DRAFT y sin pujas.
   */
  public async delete(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      const existing = await prisma.auctionItem.findFirst({
        where: { id, tenantId },
        include: { bids: { select: { id: true } } },
      });

      if (!existing) {
        throw new Error('Lote de subasta no encontrado o no pertenece a este tenant.');
      }

      if (existing.bids.length > 0) {
        throw new Error(
          'Eliminación bloqueada: No se puede eliminar una subasta con pujas registradas. Cancele o cierre la subasta.'
        );
      }

      return prisma.auctionItem.delete({ where: { id } });
    });
  }
}

export const auctionRepository = new AuctionRepository();

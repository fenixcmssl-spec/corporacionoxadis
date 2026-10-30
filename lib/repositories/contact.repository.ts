// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE CONTACTO Y MODERACIÓN
// FASE 2 BIS.2: SOLICITUDES DE CONTACTO Y REPORTES DE CONTENIDO EN POSTGRESQL
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma, InquiryStatus, ReportTargetType, ReportStatus } from '@prisma/client';

export interface CreateInquiryInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface CreateReportInput {
  reporterEmail: string;
  reason: string;
  targetType: ReportTargetType;
  targetId: string;
  details?: string;
}

export class ContactRepository {
  /**
   * Registro de solicitud de contacto o soporte de clientes para un tenant.
   */
  public async createInquiry(tenantId: string, input: CreateInquiryInput) {
    return executeWithDatabase(async () => {
      return prisma.contactInquiry.create({
        data: {
          tenantId,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          subject: input.subject,
          message: input.message,
          status: InquiryStatus.NEW,
        },
      });
    });
  }

  /**
   * Lista de solicitudes de contacto de un tenant.
   */
  public async listInquiries(tenantId: string, status?: InquiryStatus) {
    return executeWithDatabase(async () => {
      return prisma.contactInquiry.findMany({
        where: {
          tenantId,
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  /**
   * Actualización del estado de una consulta de contacto.
   */
  public async updateInquiryStatus(
    tenantId: string,
    id: string,
    status: InquiryStatus,
    replyNotes?: string
  ) {
    return executeWithDatabase(async () => {
      const existing = await prisma.contactInquiry.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Solicitud de contacto no encontrada o no pertenece a este tenant.');
      }

      return prisma.contactInquiry.update({
        where: { id },
        data: {
          status,
          replyNotes: replyNotes || null,
        },
      });
    });
  }

  /**
   * Registro de reporte de moderación de contenido.
   */
  public async createReport(tenantId: string, input: CreateReportInput) {
    return executeWithDatabase(async () => {
      return prisma.contentReport.create({
        data: {
          tenantId,
          reporterEmail: input.reporterEmail,
          reason: input.reason,
          targetType: input.targetType,
          targetId: input.targetId,
          details: input.details || null,
          status: ReportStatus.PENDING,
        },
      });
    });
  }

  /**
   * Lista de reportes de moderación para un tenant.
   */
  public async listReports(tenantId: string, status?: ReportStatus) {
    return executeWithDatabase(async () => {
      return prisma.contentReport.findMany({
        where: {
          tenantId,
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  /**
   * Actualización del estado de un reporte de contenido.
   */
  public async updateReportStatus(
    tenantId: string,
    id: string,
    status: ReportStatus,
    reviewNotes?: string
  ) {
    return executeWithDatabase(async () => {
      const existing = await prisma.contentReport.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Reporte de moderación no encontrado o no pertenece a este tenant.');
      }

      return prisma.contentReport.update({
        where: { id },
        data: {
          status,
          reviewNotes: reviewNotes || null,
        },
      });
    });
  }
}

export const contactRepository = new ContactRepository();

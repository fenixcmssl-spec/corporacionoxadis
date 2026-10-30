// ============================================================================
// FENIXCMS SAAS — ENDPOINT DE WEBHOOKS DE PAGO PERSISTENTES
// FASE 2 BIS.5: PROCESAMIENTO AUTÉNTICO DE PAGOS, FIRMAS Y SIN SIMULACIONES
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { paymentService, PaymentGatewayError } from '../../../../../lib/services/payment.service';
import { DatabaseConnectionError } from '../../../../../lib/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawBody = await req.text();

    const signature =
      req.headers.get('stripe-signature') ||
      req.headers.get('x-paypal-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('signature');

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Payload de webhook no es un JSON válido' },
        { status: 400 }
      );
    }

    // Extraer campos normalizados o de objetos Stripe / PayPal
    let tenantId = payload.tenantId;
    let orderId = payload.orderId;
    let transactionId = payload.transactionId || payload.id;

    // Si viene anidado en objeto de evento (ej. Stripe event: data.object)
    if (payload.data?.object) {
      const obj = payload.data.object;
      tenantId = tenantId || obj.metadata?.tenantId;
      orderId = orderId || obj.metadata?.orderId;
      transactionId = transactionId || obj.id;
    }

    if (!tenantId || !orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan parámetros requeridos: tenantId y orderId son obligatorios para conciliar el pago.',
        },
        { status: 400 }
      );
    }

    const updatedOrder = await paymentService.processWebhookPayment({
      tenantId,
      orderId,
      provider,
      transactionId: transactionId || `TX_${Date.now()}`,
      signature,
      rawPayload: rawBody,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: 'Pago conciliado y confirmado de manera auténtica en el repositorio persistente.',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        paymentVerificationId: updatedOrder.paymentVerificationId,
      },
    });
  } catch (error: any) {
    if (error instanceof PaymentGatewayError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.status }
      );
    }

    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_UNAVAILABLE', message: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: error.message || 'Error al procesar webhook' },
      { status: 500 }
    );
  }
}

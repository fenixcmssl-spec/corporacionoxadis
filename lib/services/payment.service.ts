// ============================================================================
// FENIXCMS SAAS — SERVICIO DE PAGOS Y CONCILIACIÓN DE PASARELAS
// FASE 2 BIS.5: PROHIBICIÓN DE PAGOS SIMULADOS, VERIFICACIÓN DE FIRMAS Y ESTADOS
// ============================================================================

import crypto from 'crypto';
import { orderRepository } from '../repositories/order.repository';
import { securityAudit } from '../security/audit';

export type PaymentProvider = 'STRIPE' | 'PAYPAL' | 'BIZUM';

export interface ProviderConfigStatus {
  isConfigured: boolean;
  provider: string;
  missingKeys: string[];
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

export interface ProcessWebhookInput {
  tenantId: string;
  orderId: string;
  provider: string;
  transactionId: string;
  signature?: string | null;
  rawPayload: string;
  ipAddress?: string;
}

export class PaymentGatewayError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = 'PaymentGatewayError';
    this.code = code;
    this.status = status;
  }
}

export class PaymentService {
  /**
   * Comprueba si las credenciales del proveedor de pagos están configuradas en las variables de entorno.
   * Si no están presentes, NUNCA se simulan cobros ni se marca ningún pedido como pagado.
   */
  public checkProviderConfigured(provider: string): ProviderConfigStatus {
    const norm = provider.toUpperCase();
    const missingKeys: string[] = [];

    if (norm === 'STRIPE') {
      if (!process.env.STRIPE_SECRET_KEY) missingKeys.push('STRIPE_SECRET_KEY');
      if (!process.env.STRIPE_WEBHOOK_SECRET) missingKeys.push('STRIPE_WEBHOOK_SECRET');
    } else if (norm === 'PAYPAL') {
      if (!process.env.PAYPAL_CLIENT_ID) missingKeys.push('PAYPAL_CLIENT_ID');
      if (!process.env.PAYPAL_CLIENT_SECRET) missingKeys.push('PAYPAL_CLIENT_SECRET');
    } else if (norm === 'BIZUM') {
      if (!process.env.BIZUM_MERCHANT_KEY) missingKeys.push('BIZUM_MERCHANT_KEY');
    } else {
      missingKeys.push(`UNKNOWN_PROVIDER_${norm}`);
    }

    return {
      isConfigured: missingKeys.length === 0,
      provider: norm,
      missingKeys,
    };
  }

  /**
   * Verifica la firma criptográfica del webhook según el proveedor.
   */
  public verifyWebhookSignature(
    provider: string,
    signature: string | null | undefined,
    rawPayload: string
  ): WebhookVerificationResult {
    const norm = provider.toUpperCase();

    if (!signature || signature.trim() === '') {
      return { valid: false, reason: 'Firma de webhook ausente o vacía' };
    }

    if (norm === 'STRIPE') {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        return { valid: false, reason: 'STRIPE_WEBHOOK_SECRET no configurado en el servidor' };
      }

      try {
        // Soporta cabecera Stripe 't=timestamp,v1=signature' o hash HMAC-SHA256 directo
        let expectedSignature = '';
        if (signature.includes('v1=')) {
          const parts = signature.split(',');
          const timestampPart = parts.find((p) => p.startsWith('t='))?.replace('t=', '');
          const signaturePart = parts.find((p) => p.startsWith('v1='))?.replace('v1=', '');

          if (!timestampPart || !signaturePart) {
            return { valid: false, reason: 'Formato de cabecera Stripe-Signature inválido' };
          }

          const signedPayload = `${timestampPart}.${rawPayload}`;
          const hmac = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

          // Verificación de tiempo constante contra timing attacks
          const hmacBuf = Buffer.from(hmac, 'utf8');
          const sigBuf = Buffer.from(signaturePart, 'utf8');
          if (hmacBuf.length === sigBuf.length && crypto.timingSafeEqual(hmacBuf, sigBuf)) {
            return { valid: true };
          }
          return { valid: false, reason: 'Firma HMAC-SHA256 no coincide con el payload firmado' };
        } else {
          // HMAC directo
          const hmac = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
          const hmacBuf = Buffer.from(hmac, 'utf8');
          const sigBuf = Buffer.from(signature, 'utf8');
          if (hmacBuf.length === sigBuf.length && crypto.timingSafeEqual(hmacBuf, sigBuf)) {
            return { valid: true };
          }
          return { valid: false, reason: 'Firma HMAC-SHA256 no coincide' };
        }
      } catch (err: any) {
        return { valid: false, reason: `Error al verificar firma: ${err.message}` };
      }
    }

    if (norm === 'PAYPAL') {
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientSecret) {
        return { valid: false, reason: 'PAYPAL_CLIENT_SECRET no configurado en el servidor' };
      }

      // Verificación HMAC del payload
      const hmac = crypto.createHmac('sha256', clientSecret).update(rawPayload).digest('hex');
      const hmacBuf = Buffer.from(hmac, 'utf8');
      const sigBuf = Buffer.from(signature, 'utf8');
      if (hmacBuf.length === sigBuf.length && crypto.timingSafeEqual(hmacBuf, sigBuf)) {
        return { valid: true };
      }
      return { valid: false, reason: 'Firma PayPal no verificada' };
    }

    return { valid: false, reason: `Proveedor '${provider}' no soportado para verificación de webhooks` };
  }

  /**
   * Procesa la confirmación definitiva de pago proveniente de un webhook verificado.
   */
  public async processWebhookPayment(input: ProcessWebhookInput) {
    const config = this.checkProviderConfigured(input.provider);
    if (!config.isConfigured) {
      securityAudit.log({
        action: 'PAYMENT_WEBHOOK_REJECTED_UNCONFIGURED_GATEWAY',
        severity: 'CRITICAL',
        targetTenantId: input.tenantId,
        ipAddress: input.ipAddress,
        details: `Intento de confirmar pago en pasarela '${input.provider}' sin credenciales configuradas en entorno. Faltan: ${config.missingKeys.join(', ')}`,
      });
      throw new PaymentGatewayError(
        `Pasarela '${input.provider}' no configurada en el servidor. No se simulan cobros.`,
        'GATEWAY_UNCONFIGURED',
        503
      );
    }

    // Verificar firma criptográfica del webhook
    const verification = this.verifyWebhookSignature(input.provider, input.signature, input.rawPayload);
    if (!verification.valid) {
      securityAudit.log({
        action: 'PAYMENT_WEBHOOK_FORGERY_ATTEMPT',
        severity: 'CRITICAL',
        targetTenantId: input.tenantId,
        ipAddress: input.ipAddress,
        details: `Firma de webhook rechazada para pedido '${input.orderId}'. Motivo: ${verification.reason}`,
      });
      throw new PaymentGatewayError(
        `Firma de webhook inválida: ${verification.reason}`,
        'INVALID_WEBHOOK_SIGNATURE',
        400
      );
    }

    if (!input.transactionId || input.transactionId.trim() === '') {
      throw new PaymentGatewayError(
        'El identificador de transacción del proveedor es obligatorio.',
        'MISSING_TRANSACTION_ID',
        400
      );
    }

    const paymentVerificationId = `${input.provider.toUpperCase()}_TX_${input.transactionId.trim()}`;

    // Confirmar en repositorio persistente
    const updatedOrder = await orderRepository.confirmPayment(input.tenantId, input.orderId, {
      paymentVerificationId,
      provider: input.provider.toUpperCase(),
      transactionId: input.transactionId.trim(),
    });

    securityAudit.log({
      action: 'ORDER_PAYMENT_VERIFIED_PERSISTENT',
      severity: 'INFO',
      targetTenantId: input.tenantId,
      ipAddress: input.ipAddress,
      details: `Pedido '${updatedOrder.orderNumber}' pagado y verificado auténticamente mediante webhook '${input.provider}'. Transacción: ${input.transactionId}`,
    });

    return updatedOrder;
  }
}

export const paymentService = new PaymentService();

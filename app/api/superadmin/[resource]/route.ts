import { NextRequest, NextResponse } from 'next/server';
import {
  getSecurityContextFromRequest,
  requireSuperAdmin,
  AuthenticationRequiredError,
  ForbiddenAccessError,
} from '../../../../lib/security/authorization';
import { superAdminService } from '../../../../lib/services/superadmin.service';
import { securityAudit } from '../../../../lib/security/audit';
import { issueLicenseSchema } from '../../../../lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;

  try {
    const context = getSecurityContextFromRequest(req);
    // Exigir autorización estricta de SuperAdmin
    requireSuperAdmin(context);

    if (resource === 'metrics') {
      const metrics = superAdminService.getMetrics();
      return NextResponse.json({ success: true, metrics });
    }

    if (resource === 'licenses') {
      const licenses = superAdminService.getLicenses();
      return NextResponse.json({ success: true, licenses });
    }

    if (resource === 'audit') {
      const logs = securityAudit.getLogs();
      return NextResponse.json({ success: true, logs });
    }

    if (resource === 'payments') {
      const payments = superAdminService.getPayments();
      return NextResponse.json({ success: true, payments });
    }

    return NextResponse.json({ error: 'Recurso de superadministración no encontrado' }, { status: 404 });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error interno en la solicitud' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;

  try {
    const context = getSecurityContextFromRequest(req);
    requireSuperAdmin(context);

    const body = await req.json().catch(() => ({}));

    if (resource === 'licenses') {
      const parsed = issueLicenseSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const license = superAdminService.issueLicense({
        tenantId: parsed.data.tenantId,
        maxDomains: parsed.data.maxDomains,
        durationDays: parsed.data.validDays,
      });

      return NextResponse.json({ success: true, license }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no permitida' }, { status: 404 });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error interno en la solicitud' }, { status: 500 });
  }
}

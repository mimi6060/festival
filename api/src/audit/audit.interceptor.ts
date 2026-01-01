import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService, AuditContext } from './audit.service';
import { AUDIT_ACTION_KEY, AuditActionMetadata } from './decorators/audit-action.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata = this.reflector.get<AuditActionMetadata>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Skip if no audit metadata is defined
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { action, entityType, extractEntityId, extractOldValue, extractNewValue } = auditMetadata;

    // Build audit context from request
    const auditContext: AuditContext = {
      userId: request.user?.id || request.user?.sub,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers['user-agent'],
    };

    // Extract entity ID if provided
    const entityId = extractEntityId ? extractEntityId(request) : null;

    // Extract old value before operation (from request params/body if defined)
    const oldValue = extractOldValue ? extractOldValue(request) : null;

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // Extract new value from response if defined
            const newValue = extractNewValue ? extractNewValue(response, request) : null;

            await this.auditService.log(
              action,
              entityType,
              entityId,
              oldValue,
              newValue,
              auditContext,
            );
          } catch (error) {
            this.logger.error(
              `Failed to log audit action: ${error.message}`,
              error.stack,
            );
            // Don't throw - audit logging should not break the main operation
          }
        },
        error: async (error) => {
          try {
            // Log failed operations too (useful for security auditing)
            await this.auditService.log(
              `${action}_FAILED`,
              entityType,
              entityId,
              oldValue,
              { error: error.message, statusCode: error.status },
              auditContext,
            );
          } catch (auditError) {
            this.logger.error(
              `Failed to log audit error: ${auditError.message}`,
              auditError.stack,
            );
          }
        },
      }),
    );
  }

  /**
   * Extracts IP address from request, handling proxies
   */
  private extractIpAddress(request: any): string {
    // Check for forwarded headers (when behind a proxy)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    // Check for real IP header (some proxies use this)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fallback to direct connection IP
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}

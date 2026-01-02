/**
 * API Versioning Module
 *
 * This module provides comprehensive API versioning support for NestJS applications.
 *
 * Features:
 * - Multiple versioning strategies (URL path, header, query parameter)
 * - Version-specific decorators (@V1Only, @V2Only, @AllVersions)
 * - Versioned controller decorators (@V1Controller, @V2Controller)
 * - Version guard for access control
 * - Version interceptor for response headers and deprecation warnings
 *
 * @example
 * // main.ts - Enable versioning
 * import { VersioningType } from '@nestjs/common';
 * import { ApiVersionGuard, ApiVersionInterceptor, ApiVersion } from './common/versioning';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *
 *   // Enable NestJS built-in versioning
 *   app.enableVersioning({
 *     type: VersioningType.URI,
 *     defaultVersion: '1',
 *   });
 *
 *   // Add custom version guard and interceptor
 *   const reflector = app.get(Reflector);
 *   app.useGlobalGuards(new ApiVersionGuard(reflector));
 *   app.useGlobalInterceptors(new ApiVersionInterceptor({
 *     deprecatedVersions: [ApiVersion.V1],
 *     sunsetDates: { [ApiVersion.V1]: '2025-12-31' },
 *   }));
 * }
 *
 * @example
 * // users-v1.controller.ts - V1 Controller
 * import { V1Controller } from './common/versioning';
 *
 * @V1Controller('users')
 * export class UsersV1Controller {
 *   @Get()
 *   findAll() {
 *     return this.usersService.findAll();
 *   }
 * }
 *
 * @example
 * // users-v2.controller.ts - V2 Controller with new features
 * import { V2Controller } from './common/versioning';
 *
 * @V2Controller('users')
 * export class UsersV2Controller {
 *   @Get()
 *   findAll(@Query() query: PaginationDto) {
 *     // V2 has enhanced pagination
 *     return this.usersService.findAllPaginated(query);
 *   }
 *
 *   @Get('advanced-search')
 *   advancedSearch(@Query() query: AdvancedSearchDto) {
 *     // New V2-only endpoint
 *     return this.usersService.advancedSearch(query);
 *   }
 * }
 */

// Decorators
export {
  ApiVersions,
  ApiVersion,
  API_VERSION_KEY,
  API_VERSION_HEADER,
  API_VERSION_PARAM,
  DEFAULT_API_VERSION,
  V1Only,
  V2Only,
  AllVersions,
  VersionedController,
  V1Controller,
  V2Controller,
} from './api-version.decorator';

// Guard
export { ApiVersionGuard, getCurrentApiVersion } from './api-version.guard';

// Interceptors
export {
  ApiVersionInterceptor,
  ApiVersionHeaderInterceptor,
  VersionedResponse,
  DeprecationConfig,
} from './api-version.interceptor';

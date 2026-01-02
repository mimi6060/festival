import { applyDecorators, SetMetadata, Controller } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

/**
 * API Version metadata key
 */
export const API_VERSION_KEY = 'apiVersion';

/**
 * Supported API versions
 */
export enum ApiVersion {
  V1 = '1',
  V2 = '2',
}

/**
 * Default API version when none is specified
 */
export const DEFAULT_API_VERSION = ApiVersion.V1;

/**
 * API version header name
 */
export const API_VERSION_HEADER = 'X-API-Version';

/**
 * API version query parameter name
 */
export const API_VERSION_PARAM = 'api-version';

/**
 * Decorator to specify which API versions a controller/method supports
 *
 * @param versions - Array of supported API versions
 *
 * @example
 * // Controller supports v1 and v2
 * @ApiVersions([ApiVersion.V1, ApiVersion.V2])
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Method only available in v2
 * @ApiVersions([ApiVersion.V2])
 * @Get('advanced-search')
 * advancedSearch() {}
 */
export const ApiVersions = (...versions: ApiVersion[]) =>
  SetMetadata(API_VERSION_KEY, versions);

/**
 * Decorator for v1-only endpoints
 */
export const V1Only = () => ApiVersions(ApiVersion.V1);

/**
 * Decorator for v2-only endpoints
 */
export const V2Only = () => ApiVersions(ApiVersion.V2);

/**
 * Decorator for endpoints available in all versions
 */
export const AllVersions = () => ApiVersions(ApiVersion.V1, ApiVersion.V2);

/**
 * Versioned Controller decorator
 *
 * Creates a controller with version prefix in the path
 *
 * @param path - Controller path (without version prefix)
 * @param version - API version for this controller
 *
 * @example
 * @VersionedController('users', ApiVersion.V1)
 * export class UsersV1Controller {}
 *
 * @example
 * @VersionedController('users', ApiVersion.V2)
 * export class UsersV2Controller {}
 */
export function VersionedController(path: string, version: ApiVersion) {
  const versionedPath = `v${version}/${path}`;

  return applyDecorators(
    Controller(versionedPath),
    ApiVersions(version),
    ApiTags(`${path} (v${version})`),
    ApiHeader({
      name: API_VERSION_HEADER,
      description: `API Version (v${version})`,
      required: false,
      schema: { type: 'string', default: version },
    }),
  );
}

/**
 * V1 Controller decorator
 *
 * @param path - Controller path
 *
 * @example
 * @V1Controller('users')
 * export class UsersV1Controller {}
 */
export function V1Controller(path: string) {
  return VersionedController(path, ApiVersion.V1);
}

/**
 * V2 Controller decorator
 *
 * @param path - Controller path
 *
 * @example
 * @V2Controller('users')
 * export class UsersV2Controller {}
 */
export function V2Controller(path: string) {
  return VersionedController(path, ApiVersion.V2);
}

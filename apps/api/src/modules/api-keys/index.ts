/**
 * API Keys Module Exports
 *
 * Central export point for API key functionality
 */

export { ApiKeysModule } from './api-keys.module';
export { ApiKeysService } from './api-keys.service';
export { ApiKeysController } from './api-keys.controller';
export {
  ApiKeyAuthGuard,
  ALLOW_API_KEY_AUTH,
  REQUIRE_API_KEY_AUTH,
  API_KEY_SCOPES,
} from './guards/api-key-auth.guard';
export {
  ApiKey,
  ApiKeyStatus,
  ApiKeyScope,
  ApiKeyPermissions,
  ApiKeyErrorCode,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  CreateApiKeyResult,
  ApiKeyValidationResult,
  generateApiKey,
  hashApiKey,
  hasScope,
  hasPermission,
  isApiKeyValid,
  isIpAllowed,
  maskApiKey,
  DEFAULT_TIER_PERMISSIONS,
  getDefaultScopesForTier,
} from './api-key.entity';
export {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  CreateApiKeyResponseDto,
  ApiKeyStatsResponseDto,
  ApiKeyQueryDto,
} from './dto/api-key.dto';

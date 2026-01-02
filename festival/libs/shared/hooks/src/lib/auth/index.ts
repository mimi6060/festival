/**
 * Auth Hooks
 * Authentication and authorization hooks
 */

export * from './types';
export { useAuth, default as useAuthDefault } from './useAuth';
export { useUser, userQueryKeys, default as useUserDefault } from './useUser';
export {
  usePermissions,
  useRequireAuth,
  useRedirectIfAuthenticated,
  default as usePermissionsDefault,
} from './usePermissions';

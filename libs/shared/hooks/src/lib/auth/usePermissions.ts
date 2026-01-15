'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@festival/shared/types';
import { Permission, ROLE_PERMISSIONS, UseRequireAuthOptions } from './types';

const STORAGE_KEY = 'festival-auth';

/**
 * Get stored auth state
 */
function getStoredAuth(): { user: { role: UserRole } | null; isAuthenticated: boolean } | null {
  if (typeof window === 'undefined') {return null;}
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Check if a permission matches another (with wildcards)
 */
function permissionMatches(
  required: Permission,
  available: Permission
): boolean {
  // Admin wildcard
  if (available.resource === '*' && available.action === 'manage') {
    return true;
  }

  // Resource must match
  if (available.resource !== required.resource) {
    return false;
  }

  // Manage action includes all other actions
  if (available.action === 'manage') {
    return true;
  }

  // Action must match
  if (available.action !== required.action) {
    return false;
  }

  // Scope check
  if (!required.scope) {return true;}
  if (!available.scope) {return true;}
  if (available.scope === 'all') {return true;}
  if (available.scope === required.scope) {return true;}
  if (available.scope === 'festival' && required.scope === 'own') {return true;}

  return false;
}

/**
 * usePermissions hook - RBAC permission checking
 */
export function usePermissions() {
  const storedAuth = getStoredAuth();
  const userRole = storedAuth?.user?.role ?? null;
  const isAuthenticated = storedAuth?.isAuthenticated ?? false;

  // Get all permissions for the current user
  const permissions = useMemo((): Permission[] => {
    if (!userRole) {return [];}
    return ROLE_PERMISSIONS[userRole] || [];
  }, [userRole]);

  // Check if user has a specific role
  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!userRole) {return false;}
      if (Array.isArray(role)) {
        return role.includes(userRole);
      }
      return userRole === role;
    },
    [userRole]
  );

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!userRole) {return false;}
      return permissions.some((p) => permissionMatches(permission, p));
    },
    [userRole, permissions]
  );

  // Check if user can perform action on resource
  const can = useCallback(
    (
      action: Permission['action'],
      resource: string,
      scope?: Permission['scope']
    ): boolean => {
      return hasPermission({ action, resource, scope });
    },
    [hasPermission]
  );

  // Check multiple permissions (AND logic)
  const hasAllPermissions = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      return requiredPermissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  // Check multiple permissions (OR logic)
  const hasAnyPermission = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      return requiredPermissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  // Check if user is admin
  const isAdmin = useMemo(
    () => hasRole(UserRole.ADMIN),
    [hasRole]
  );

  // Check if user is organizer
  const isOrganizer = useMemo(
    () => hasRole(UserRole.ORGANIZER),
    [hasRole]
  );

  // Check if user is staff
  const isStaff = useMemo(
    () => hasRole(UserRole.STAFF),
    [hasRole]
  );

  // Check if user is artist
  const isArtist = useMemo(
    () => hasRole(UserRole.ARTIST),
    [hasRole]
  );

  // Check if user is attendee
  const isAttendee = useMemo(
    () => hasRole(UserRole.ATTENDEE),
    [hasRole]
  );

  // Check if user has elevated privileges
  const hasElevatedPrivileges = useMemo(
    () => hasRole([UserRole.ADMIN, UserRole.ORGANIZER]),
    [hasRole]
  );

  return useMemo(
    () => ({
      // State
      userRole,
      isAuthenticated,
      permissions,

      // Role checks
      isAdmin,
      isOrganizer,
      isStaff,
      isArtist,
      isAttendee,
      hasElevatedPrivileges,

      // Permission checks
      hasRole,
      hasPermission,
      can,
      hasAllPermissions,
      hasAnyPermission,
    }),
    [
      userRole,
      isAuthenticated,
      permissions,
      isAdmin,
      isOrganizer,
      isStaff,
      isArtist,
      isAttendee,
      hasElevatedPrivileges,
      hasRole,
      hasPermission,
      can,
      hasAllPermissions,
      hasAnyPermission,
    ]
  );
}

/**
 * useRequireAuth hook - Protect routes with auth/role requirements
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const router = useRouter();
  const {
    redirectTo = '/auth/login',
    requiredRole,
    requiredPermission,
  } = options;

  const { isAuthenticated, hasRole, hasPermission, userRole } = usePermissions();

  // Check access
  const hasAccess = useMemo(() => {
    if (!isAuthenticated) {return false;}

    if (requiredRole) {
      if (!hasRole(requiredRole)) {return false;}
    }

    if (requiredPermission) {
      if (!hasPermission(requiredPermission)) {return false;}
    }

    return true;
  }, [isAuthenticated, requiredRole, requiredPermission, hasRole, hasPermission]);

  // Redirect if no access
  useEffect(() => {
    // Wait for client-side hydration
    if (typeof window === 'undefined') {return;}

    const storedAuth = getStoredAuth();
    const isAuth = storedAuth?.isAuthenticated ?? false;

    if (!isAuth) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
    } else if (!hasAccess && isAuth) {
      // Authenticated but no access (role/permission issue)
      router.push('/403');
    }
  }, [hasAccess, redirectTo, router]);

  return useMemo(
    () => ({
      isAuthenticated,
      hasAccess,
      userRole,
      isLoading: typeof window === 'undefined',
    }),
    [isAuthenticated, hasAccess, userRole]
  );
}

/**
 * useRedirectIfAuthenticated hook - Redirect if already logged in
 */
export function useRedirectIfAuthenticated(redirectTo = '/account') {
  const router = useRouter();
  const { isAuthenticated } = usePermissions();

  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    const storedAuth = getStoredAuth();
    if (storedAuth?.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  return { isAuthenticated };
}

export default usePermissions;

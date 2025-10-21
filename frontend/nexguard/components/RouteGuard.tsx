'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'operator' | 'admin' | 'super_admin';
  fallback?: ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  requireRole,
  fallback
}) => {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      router.push(`/sign-in?callbackUrl=${pathname}`);
      return;
    }

    // Check role requirement
    if (requireRole && user && !hasRole(requireRole)) {
      router.push('/?error=unauthorized');
      return;
    }
  }, [isLoading, isAuthenticated, user, requireAuth, requireRole, hasRole, router, pathname]);

  // Show loading state
  if (isLoading) {
    return fallback || <LoadingState />;
  }

  // Show unauthorized state
  if (requireAuth && !isAuthenticated) {
    return fallback || <UnauthorizedState />;
  }

  // Show insufficient permissions state
  if (requireRole && user && !hasRole(requireRole)) {
    return fallback || <InsufficientPermissionsState requiredRole={requireRole} />;
  }

  return <>{children}</>;
};

const LoadingState = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-white">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-gray-900" />
      <p className="text-sm text-gray-600">Verifying authentication...</p>
    </div>
  </div>
);

const UnauthorizedState = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-white px-4">
    <div className="max-w-md rounded-2xl border border-gray-200 bg-white/80 p-8 text-center shadow-sm">
      <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-500" />
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h1>
      <p className="text-sm text-gray-500 mb-4">
        Please sign in to access this page.
      </p>
    </div>
  </div>
);

interface InsufficientPermissionsProps {
  requiredRole: string;
}

const InsufficientPermissionsState: React.FC<InsufficientPermissionsProps> = ({ requiredRole }) => (
  <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-white px-4">
    <div className="max-w-md rounded-2xl border border-gray-200 bg-white/80 p-8 text-center shadow-sm">
      <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-amber-500" />
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Insufficient Permissions</h1>
      <p className="text-sm text-gray-500 mb-2">
        This page requires <span className="font-semibold">{requiredRole}</span> access.
      </p>
      <p className="text-xs text-gray-400">
        Contact your administrator if you believe you should have access.
      </p>
    </div>
  </div>
);

// Export individual components for custom use
export { LoadingState, UnauthorizedState, InsufficientPermissionsState };

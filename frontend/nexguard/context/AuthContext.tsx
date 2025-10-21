'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut as signOutAction, refreshToken as refreshTokenAction } from '@/lib/actions/user.actions';
import { User } from '@/Types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: 'operator' | 'admin' | 'super_admin') => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const refreshedUser = await refreshTokenAction();
      setUser(refreshedUser);
    } catch (error) {
      console.error('Failed to refresh user session:', error);
      setUser(null);
      // Redirect to sign-in if refresh fails
      router.push(`/sign-in?callbackUrl=${pathname}`);
    }
  }, [router, pathname]);

  const signOut = useCallback(async () => {
    try {
      await signOutAction();
      setUser(null);
      router.push('/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if sign out fails
      setUser(null);
      router.push('/sign-in');
    }
  }, [router]);

  const hasRole = useCallback((role: 'operator' | 'admin' | 'super_admin'): boolean => {
    if (!user?.role) return false;
    
    const roleHierarchy: Record<string, number> = {
      operator: 1,
      admin: 2,
      super_admin: 3
    };
    
    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  }, [user]);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Set up token refresh interval (every 10 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUser();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, refreshUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshUser,
    hasRole,
    isAdmin,
    isSuperAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

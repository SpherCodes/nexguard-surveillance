import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  sub: string;
  role?: string;
  username?: string;
}

/**
 * Decode a JWT token
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token string
 * @param bufferSeconds - Buffer time in seconds before actual expiry (default: 30)
 */
export function isTokenExpired(
  token: string,
  bufferSeconds: number = 30
): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expiryTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const buffer = bufferSeconds * 1000;

  return expiryTime - buffer < currentTime;
}

/**
 * Get the remaining time until token expiry in seconds
 */
export function getTokenExpiryTime(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;

  const expiryTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const remainingTime = Math.max(
    0,
    Math.floor((expiryTime - currentTime) / 1000)
  );

  return remainingTime;
}

/**
 * Extract user role from token
 */
export function getTokenRole(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.role || null;
}

/**
 * Extract username from token
 */
export function getTokenUsername(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.username || decoded?.sub || null;
}

/**
 * Check if user has required role based on role hierarchy
 */
export function hasRequiredRole(
  userRole: string,
  requiredRole: 'operator' | 'admin' | 'super_admin'
): boolean {
  const roleHierarchy: Record<string, number> = {
    operator: 1,
    admin: 2,
    super_admin: 3
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Get token from cookies (client-side)
 */
export function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith('access_token=')
  );

  if (!tokenCookie) return null;

  return tokenCookie.split('=')[1];
}

/**
 * Clear authentication cookies (client-side)
 */
export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;

  document.cookie = 'access_token=; Max-Age=0; path=/;';
  document.cookie = 'refresh_token=; Max-Age=0; path=/;';
}

/**
 * Format token expiry time for display
 */
export function formatTokenExpiry(token: string): string {
  const remainingSeconds = getTokenExpiryTime(token);

  if (remainingSeconds <= 0) return 'Expired';
  if (remainingSeconds < 60) return `${remainingSeconds}s`;
  if (remainingSeconds < 3600) return `${Math.floor(remainingSeconds / 60)}m`;

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

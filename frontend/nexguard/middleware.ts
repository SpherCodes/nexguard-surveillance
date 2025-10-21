import { jwtDecode } from 'jwt-decode';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface DecodedToken {
  exp: number;
  sub: string;
  role?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Route configuration with role-based access
const routeConfig = {
  // Public routes - accessible without authentication
  public: ['/api/health'],
  
  // Auth routes - redirect to home if already authenticated
  auth: ['/sign-in', '/sign-up', '/forgot-password'],
  
  // Protected routes - require authentication
  protected: {
    all: ['/', '/settings', '/cameras', '/replay'],
    admin: ['/settings/users', '/settings/system'],
    superAdmin: ['/settings/advanced']
  }
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token');
  const refreshToken = request.cookies.get('refresh_token');

  // Skip middleware for public routes
  if (routeConfig.public.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const isAuthRoute = routeConfig.auth.some(route => pathname.startsWith(route));
  const isProtectedRoute = isRouteProtected(pathname);

  // Handle authenticated users trying to access auth pages
  if (token && !isTokenExpired(token.value) && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Handle unauthenticated users trying to access protected routes
  if (isProtectedRoute && (!token || isTokenExpired(token.value))) {
    // Try to refresh token if refresh token exists
    if (refreshToken && !isTokenExpired(refreshToken.value)) {
      try {
        const newTokens = await refreshAccessToken(refreshToken.value);
        if (newTokens) {
          const response = NextResponse.next();
          response.cookies.set('access_token', newTokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 15 // 15 minutes
          });
          return response;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }

    // Redirect to sign-in with callback URL
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(signInUrl);
    
    // Clear invalid tokens
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    
    return response;
  }

  // Handle role-based access control
  if (token && !isTokenExpired(token.value)) {
    const decoded = decodeToken(token.value);
    const userRole = decoded?.role || 'operator';
    
    // Check admin-only routes
    if (routeConfig.protected.admin.some(route => pathname.startsWith(route))) {
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
      }
    }
    
    // Check super admin-only routes
    if (routeConfig.protected.superAdmin.some(route => pathname.startsWith(route))) {
      if (userRole !== 'super_admin') {
        return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
      }
    }
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

function isRouteProtected(pathname: string): boolean {
  const allProtectedRoutes = [
    ...routeConfig.protected.all,
    ...routeConfig.protected.admin,
    ...routeConfig.protected.superAdmin
  ];
  
  return allProtectedRoutes.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });
}

function decodeToken(token: string): DecodedToken | null {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  // Add 30 second buffer to avoid edge cases
  const expiryTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const buffer = 30 * 1000;
  
  return expiryTime - buffer < currentTime;
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { accessToken: data.access_token };
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|.*\\..*|firebase-messaging-sw.js).*)'
  ]
};

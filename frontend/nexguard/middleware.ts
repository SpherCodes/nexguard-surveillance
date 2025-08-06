import { jwtDecode } from 'jwt-decode';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {

  const token = request.cookies.get('access_token');

  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/', '/settings', '/cameras', '/'];

  const authRoutes = ['/sign-in', '/sign-up', '/forgot-password'];

  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  const isAuthRoute = authRoutes.includes(pathname);

  console.log('Is protected route:', isProtectedRoute);
  console.log('Is auth route:', isAuthRoute);

  if (token && !isTokenExpired(token.value) && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isProtectedRoute && (!token || isTokenExpired(token.value))) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  console.log('Allowing request to proceed');
  return NextResponse.next();
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
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
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)'
  ]
};

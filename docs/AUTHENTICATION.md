# Authentication System Documentation

## Overview

The NexGuard authentication system uses JWT-based authentication with role-based access control (RBAC). It provides middleware protection, automatic token refresh, and a centralized authentication context.

## Architecture

### Components

1. **Middleware** (`middleware.ts`)
   - Protects routes automatically
   - Handles token validation and refresh
   - Enforces role-based access control
   - Redirects unauthenticated users to sign-in

2. **Auth Context** (`context/AuthContext.tsx`)
   - Centralized authentication state management
   - Provides user information across the app
   - Automatic token refresh every 10 minutes
   - Sign-out functionality

3. **Route Guard** (`components/RouteGuard.tsx`)
   - Component-level route protection
   - Role-based rendering
   - Custom fallback components

4. **Auth Utilities** (`lib/auth-utils.ts`)
   - Token decoding and validation
   - Role hierarchy checking
   - Token expiry formatting

## Usage

### Using Auth Context

```tsx
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, isAdmin, signOut, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.username}</p>
      {isAdmin && <button>Admin Panel</button>}
      {hasRole('super_admin') && <button>System Settings</button>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Using Route Guard

```tsx
import { RouteGuard } from '@/components/RouteGuard';

function AdminPage() {
  return (
    <RouteGuard requireRole="admin">
      <div>Admin content here</div>
    </RouteGuard>
  );
}
```

### Protecting Routes in Middleware

Routes are automatically protected by the middleware. Configure route access in `middleware.ts`:

```typescript
const routeConfig = {
  public: ['/api/health'],
  auth: ['/sign-in', '/sign-up'],
  protected: {
    all: ['/', '/settings', '/cameras'],
    admin: ['/settings/users'],
    superAdmin: ['/settings/advanced']
  }
};
```

## Role Hierarchy

- **operator** (level 1): Basic user access
- **admin** (level 2): Can manage users and settings
- **super_admin** (level 3): Full system access

Higher roles inherit permissions from lower roles.

## Token Management

### Access Token
- Stored as HTTP-only cookie
- Expires in 15 minutes
- Automatically refreshed by middleware

### Refresh Token
- Stored as HTTP-only cookie
- Used to obtain new access tokens
- Middleware attempts refresh before redirecting to sign-in

### Token Utilities

```typescript
import { 
  isTokenExpired, 
  getTokenExpiryTime,
  getTokenRole,
  hasRequiredRole 
} from '@/lib/auth-utils';

// Check if token is expired
const expired = isTokenExpired(token);

// Get remaining seconds
const remaining = getTokenExpiryTime(token);

// Extract role
const role = getTokenRole(token);

// Check role permissions
const canAccess = hasRequiredRole(userRole, 'admin');
```

## Security Features

1. **HTTP-Only Cookies**: Tokens stored in HTTP-only cookies to prevent XSS attacks
2. **Automatic Token Refresh**: Tokens refreshed before expiry to maintain sessions
3. **Role-Based Access**: Granular access control based on user roles
4. **Security Headers**: CSP, X-Frame-Options, and other security headers
5. **Token Expiry Buffer**: 30-second buffer to prevent edge-case failures

## API Integration

### Sign In

```typescript
import { signIn } from '@/lib/actions/user.actions';

const user = await signIn({ userName: 'john', password: 'pass123' });
```

### Sign Out

```typescript
import { signOut } from '@/lib/actions/user.actions';

await signOut();
// Cookies are cleared automatically
```

### Get Current User

```typescript
import { getCurrentUser } from '@/lib/actions/user.actions';

const user = await getCurrentUser();
```

### Refresh Token

```typescript
import { refreshToken } from '@/lib/actions/user.actions';

const updatedUser = await refreshToken();
```

## Error Handling

### Unauthorized Access

When a user tries to access a protected route without authentication:
1. Middleware redirects to `/sign-in?callbackUrl=/protected-route`
2. After successful sign-in, user is redirected back to the original route

### Insufficient Permissions

When a user lacks required role:
1. Middleware redirects to `/?error=unauthorized`
2. RouteGuard shows insufficient permissions message

### Token Expiry

When access token expires:
1. Middleware attempts to refresh using refresh token
2. If refresh succeeds, request continues
3. If refresh fails, user is redirected to sign-in

## Best Practices

1. **Always use `useAuth` hook** instead of direct API calls in components
2. **Protect sensitive routes** at both middleware and component level
3. **Check roles** before rendering admin/privileged UI
4. **Handle loading states** when checking authentication
5. **Clear sensitive data** on sign-out
6. **Use RouteGuard** for page-level protection
7. **Implement proper error boundaries** for auth failures

## Migration from Old System

If migrating from the old authentication system:

1. Replace direct `getCurrentUser` calls with `useAuth` hook
2. Replace manual sign-out logic with `useAuth().signOut()`
3. Use `hasRole()` instead of manual role checking
4. Remove duplicate authentication checks (middleware handles it)
5. Update route protection to use new middleware configuration

## Troubleshooting

### "useAuth must be used within AuthProvider"
Ensure your component is wrapped in `<AuthProvider>`:

```tsx
<AuthProvider>
  <YourComponent />
</AuthProvider>
```

### Token not refreshing
Check that:
- Refresh token cookie is present
- Backend `/api/v1/auth/refresh-token` endpoint is working
- Middleware is properly configured

### Infinite redirect loops
Verify:
- Route is not listed in both `auth` and `protected` arrays
- Matcher pattern in middleware doesn't exclude necessary routes
- Callback URL is properly set and validated

## Future Enhancements

- [ ] Session persistence across browser restarts
- [ ] Multi-factor authentication (MFA)
- [ ] OAuth/SSO integration
- [ ] Audit logging for authentication events
- [ ] Rate limiting on failed sign-in attempts
- [ ] Password reset flow with email verification

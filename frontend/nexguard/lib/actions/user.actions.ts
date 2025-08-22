import { SignUpProps, User } from '@/Types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// TODO:Move the fetch function to a separate file for easy reuse
const authFetch = async (url: string, options: RequestInit = {}) => {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }

    throw new Error(errorMessage);
  }

  return response;
};

export const signIn = async ({
  userName,
  password
}: {
  userName: string;
  password: string;
}): Promise<User> => {
  try {
    console.log('Signing in user:', userName);

    const response = await authFetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: userName, password })
    });

    // Backend returns TokenResponse; we care about user and cookie
    const data = await response.json();
    const user: User = data.user;
    console.log('Sign in successful for:', user?.username);
    return user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signUp = async (userData: SignUpProps): Promise<User> => {
  try {
    const payload = {
      username: userData.userName,
      firstname: userData.firstName,
      middlename: userData.middleName || '',
      lastname: userData.lastName,
      email: userData.email,
      phone: userData.phoneNumber,
      password: userData.password
    };

    console.log('Registering new user:', payload.username);

    const response = await authFetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data: User = await response.json();
    console.log('Registration successful:', data.username);
    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await authFetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST'
    });
    console.log('Sign out successful');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/api/v1/auth/users/me`);
    const user: User = await response.json();
    return user;
  } catch (error) {
    console.log('No authenticated user found', error);
    return null;
  }
};

export const refreshToken = async (): Promise<User> => {
  try {
    const response = await authFetch(
      `${API_BASE_URL}/api/v1/auth/refresh-token`,
      {
        method: 'POST'
      }
    );
    const data = await response.json();
    return data.user as User;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

export const updateUser = async (
  userId: number,
  updateData: Partial<SignUpProps>
): Promise<User> => {
  try {
    const payload = {
      ...(updateData.firstName && { firstname: updateData.firstName }),
      ...(updateData.lastName && { lastname: updateData.lastName }),
      ...(updateData.email && { email: updateData.email }),
      ...(updateData.phoneNumber && { phone: updateData.phoneNumber })
    };

    const response = await authFetch(
      `${API_BASE_URL}/api/v1/auth/users/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      }
    );

    const user: User = await response.json();
    console.log('User updated successfully:', user.username);
    return user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/api/v1/auth/admin/users`);
    const users: User[] = await response.json();
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Admin actions
export const updateUserStatus = async (
  userId: number,
  newStatus: NonNullable<User['status']>
): Promise<User> => {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/auth/admin/users/${userId}/status?new_status=${newStatus}`,
    { method: 'PUT' }
  );
  return response.json();
};

export const approveUser = async (userId: number): Promise<User> => {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/auth/admin/users/${userId}/approve`,
    { method: 'POST' }
  );
  return response.json();
};

export const rejectUser = async (userId: number): Promise<User> => {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/auth/admin/users/${userId}/reject`,
    { method: 'POST' }
  );
  return response.json();
};

export const updateUserRole = async (
  userId: number,
  newRole: NonNullable<User['role']>
): Promise<User> => {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/auth/admin/users/${userId}/role?new_role=${newRole}`,
    { method: 'PUT' }
  );
  return response.json();
};

export const deleteUser = async (userId: number): Promise<void> => {
  await authFetch(`${API_BASE_URL}/api/v1/auth/admin/users/${userId}`, {
    method: 'DELETE'
  });
};

import { SignUpProps } from '@/Types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const signIn = async ({
  userName,
  password
}: {
  userName: string;
  password: string;
}) => {
  try {
    console.log('userdata:', { userName, password });
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: userName, password })
    });

    if (!response.ok) {
      throw new Error(
        `Failed to sign in: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signUp = async (userData: SignUpProps) => {
  try {
    const payload = {
      username: userData.userName,
      firstname: userData.firstName,
      middlename: '',
      lastname: userData.lastName,
      email: userData.email,
      phone: userData.phoneNumber,
      password: userData.password
    };

    console.log('sending payload:', payload);
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log('user data:', userData);

    if (!response.ok) {
      throw new Error(
        `Failed to sign up: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

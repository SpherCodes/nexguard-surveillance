'use client'
import { signIn, signUp } from '@/lib/actions/user.actions';
import { authFormSchema } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation'; // Fixed import
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import CustomInput from './CustomInput';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AuthForm = ({type}: {type: 'Sign-in' | 'Sign-up'}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const formSchema = authFormSchema(type);
    
    // Use Record<string, unknown> for form data to handle both sign-in and sign-up
    const form = useForm<Record<string, unknown>>({
        // @ts-expect-error - Complex union type handling with zod resolver
        resolver: zodResolver(formSchema),
        defaultValues: {
            userName: '',
            password: '',
            ...(type === 'Sign-up' && {
                firstName: '',
                lastName: '',
                middleName: '',
                email: '',
                phoneNumber: '',
                confirmPassword: '',
                acceptTerms: false,
            }),
        },
    });

    const onSubmit = async (data: Record<string, unknown>) => {
        console.log('Form submitted with data:', data);
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if(type === 'Sign-up') {
                const userData = {
                    userName: data.userName as string,
                    firstName: data.firstName as string,
                    lastName: data.lastName as string,
                    middleName: (data.middleName as string) || '',
                    password: data.password as string,
                    phoneNumber: data.phoneNumber as string,
                    email: data.email as string,
                }

                const newUser = await signUp(userData);
                console.log('User registered successfully:', newUser);
                
                setSuccess('Account created successfully! Please sign in.');
                setTimeout(() => {
                    router.push('/sign-in');
                }, 1200);
            }
            else {
                console.log('Submitting sign-in form with data:', data);
                const loginData = {
                    userName: data.userName as string,
                    password: data.password as string,
                }

                const loggedInUser = await signIn(loginData);
                console.log('User logged in successfully:', loggedInUser);

                if(loggedInUser) {
                    setSuccess('Login successful! Redirecting...');
                    router.push('/');
                } else {
                    setError('Login failed. Please check your credentials.');
                }
            }
        } catch (error: any) {
            console.error('Authentication failed:', error);
            
            let errorMessage = 'An unexpected error occurred. Please try again.';
            
            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            if (errorMessage.includes('Failed to sign in: 401')) {
                errorMessage = 'Invalid username or password. Please try again.';
            } else if (errorMessage.includes('Failed to sign up: 400')) {
                errorMessage = 'This username or email may already be taken. Please try different credentials.';
            } else if (errorMessage.includes('Failed to sign up: 422')) {
                errorMessage = 'Please check all required fields and try again.';
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Form Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {type === 'Sign-in' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-600 text-sm">
                    {type === 'Sign-in' 
                        ? 'Sign in to access your surveillance dashboard' 
                        : 'Join NexGuard to secure your property'
                    }
                </p>
            </div>

            {/* Success/Error Messages */}
            {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                        {success}
                    </AlertDescription>
                </Alert>
            )}

            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 relative overflow-hidden">
                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full transform translate-x-16 -translate-y-16 opacity-50"></div>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 relative z-10">
                        {type === "Sign-up" ? (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <CustomInput
                                        control={form.control}
                                        name="firstName"
                                        label="First Name"
                                        placeholder="John"
                                    />
                                    <CustomInput
                                        control={form.control}
                                        name="lastName"
                                        label="Last Name"
                                        placeholder="Doe"
                                    />
                                    <CustomInput
                                        control={form.control}
                                        name="middleName"
                                        label="Middle"
                                        placeholder="M."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <CustomInput
                                        control={form.control}
                                        name="userName"
                                        label="Username"
                                        placeholder="johndoe"
                                    />
                                    <CustomInput
                                        control={form.control}
                                        name="email"
                                        label="Email"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <CustomInput
                                    control={form.control}
                                    name="phoneNumber"
                                    label="Phone Number"
                                    placeholder="+1 (555) 123-4567"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <CustomInput
                                        control={form.control}
                                        name="password"
                                        label="Password"
                                        placeholder="Password"
                                    />
                                    <CustomInput
                                        control={form.control}
                                        name="confirmPassword"
                                        label="Confirm"
                                        placeholder="Confirm"
                                    />
                                </div>
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="acceptTerms"
                                        {...form.register("acceptTerms")}
                                        className="w-4 h-4 text-gray-900 bg-white border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                                    />
                                    <label htmlFor="acceptTerms" className="text-xs text-gray-700 leading-tight">
                                        I agree to the{' '}
                                        <a href="#" className="text-gray-900 hover:underline font-semibold">
                                            Terms
                                        </a>{' '}
                                        and{' '}
                                        <a href="#" className="text-gray-900 hover:underline font-semibold">
                                            Privacy Policy
                                        </a>
                                    </label>
                                </div>
                            </>
                        ) : (
                            <>
                                <CustomInput
                                    control={form.control}
                                    name="userName"
                                    label="Username"
                                    placeholder="Enter your username"
                                />

                                <CustomInput
                                    control={form.control}
                                    name="password"
                                    label="Password"
                                    placeholder="Enter your password"
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id="rememberMe"
                                            className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                                        />
                                        <label htmlFor="rememberMe" className="text-sm text-gray-700 font-medium">
                                            Remember me
                                        </label>
                                    </div>
                                    <a href="#" className="text-sm text-gray-900 hover:underline font-semibold">
                                        Forgot password?
                                    </a>
                                </div>
                            </>
                        )}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-3 px-6 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <span className="relative z-10">
                                    {loading ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center space-x-2">
                                            <span>{type}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    )}
                                </span>
                            </button>
                        </div>
                        <div className="text-center pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-600">
                                {type === 'Sign-in' ? "Don't have an account?" : "Already have an account?"}{' '}
                                <a 
                                    href={type === 'Sign-in' ? '/sign-up' : '/sign-in'} 
                                    className="text-gray-900 hover:underline font-bold"
                                >
                                    {type === 'Sign-in' ? 'Sign up for free' : 'Sign in here'}
                                </a>
                            </p>
                        </div>
                    </form>
                </Form>
            </div>
        </>
    )
}

export default AuthForm
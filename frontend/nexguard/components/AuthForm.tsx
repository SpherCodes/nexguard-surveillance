'use client'
import { signIn, signUp } from '@/lib/actions/user.actions';
import { authFormSchema } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod/dist/zod.js';
import { useRouter } from 'next/dist/client/components/navigation';
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'; // Add FormProvider
import CustomInput from './CustomInput';
import { Form } from '@/components/ui/form'; // Import your Form component

const AuthForm = ({type}: {type: 'Sign-in' | 'Sign-up'}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const formSchema = authFormSchema(type);
    
    const form = useForm({
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
        try {
            if(type == 'Sign-up') {
                const userData = {
                    userName: data.userName as string,
                    firstName: data.firstName as string,
                    lastName: data.lastName as string,
                    middleName: data.middleName as string,
                    password: data.password as string,
                    phoneNumber: data.phoneNumber as string,
                    email: data.email as string,
                }
                await signUp(userData);
                router.push('/sign-in');
            }
            else {
                console.log('submitting sign-in form with data:', data);
                const signInData = {
                    userName: data.userName as string,
                    password: data.password as string,
                }
                const loggedInUser = await signIn(signInData);

                if(loggedInUser) {
                    router.push('/');
                }
            }
        } catch (error) {
            console.error('Authentication failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding & Information */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-12 text-white">
                    {/* Logo */}
                    <div className="mb-12">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold">NexGuard</h1>
                        </div>
                        
                        <h2 className="text-4xl font-bold mb-4 leading-tight">
                            {type === 'Sign-in' ? 'Welcome back to your' : 'Start protecting your'} 
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                Security Command Center
                            </span>
                        </h2>
                        
                        <p className="text-gray-300 text-lg leading-relaxed">
                            {type === 'Sign-in' 
                                ? 'Access your comprehensive surveillance dashboard and monitor your property with advanced AI-powered security features.' 
                                : 'Join thousands who trust NexGuard for intelligent surveillance, real-time alerts, and complete peace of mind.'
                            }
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold">AI-Powered Detection</h3>
                                <p className="text-gray-400 text-sm">Advanced object recognition and threat analysis</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold">24/7 Monitoring</h3>
                                <p className="text-gray-400 text-sm">Round-the-clock surveillance and instant alerts</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold">Enterprise Security</h3>
                                <p className="text-gray-400 text-sm">Bank-grade encryption and data protection</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Authentication Form */}
            <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
                <div className="w-full max-w-lg">
                    {/* Mobile Logo (shown only on small screens) */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">NexGuard</h1>
                    </div>

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
                    <div className="text-center mt-6">
                        <p className="text-xs text-gray-500">
                            © 2025 NexGuard. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthForm

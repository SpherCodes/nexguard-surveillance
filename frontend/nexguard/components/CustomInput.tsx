import { Control } from "react-hook-form"
import { FormControl, FormField, FormLabel, FormMessage } from "./ui/form"
import { Input } from "./ui/input"

interface CustomInputProps {
    control: Control<Record<string, unknown>>,
    name: string,
    label: string,
    placeholder: string
}

function CustomInput({ control, name, label, placeholder }: CustomInputProps) {
    return (
        <div className="space-y-2">
            <FormField
                control={control}
                name={name}
                render={({ field, fieldState }) => (
                    <div className="space-y-2">
                        <FormLabel className="text-sm font-bold text-gray-900 tracking-wide">
                            {label}
                        </FormLabel>
                        <div className="relative">
                            <FormControl>
                                <Input
                                    placeholder={placeholder}
                                    className={`
                                        h-12 px-4 rounded-2xl border-2 bg-gray-50/50 backdrop-blur-sm 
                                        transition-all duration-300 text-gray-900 placeholder:text-gray-400
                                        focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10
                                        hover:border-gray-400 hover:bg-white
                                        ${fieldState.error 
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                                            : 'border-gray-200'
                                        }
                                    `}
                                    {...field}
                                    value={typeof field.value === "boolean" ? (field.value ? "true" : "false") : (field.value as string) ?? ""}
                                    type={name === 'password' || name === 'confirmPassword' ? 'password' : name === 'email' ? 'email' : name === 'phoneNumber' ? 'tel' : 'text'}
                                />
                            </FormControl>
                            
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                {name === 'email' && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                )}
                                {name === 'phoneNumber' && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                )}
                                {(name === 'password' || name === 'confirmPassword') && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                )}
                                {name === 'userName' && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                                {(name === 'firstName' || name === 'lastName' || name === 'middleName') && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        {fieldState.error && (
                            <div className="flex items-center space-x-2 text-red-500">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <FormMessage className="text-sm font-medium" />
                            </div>
                        )}
                    </div>
                )}
            />
        </div>
    );
}

export default CustomInput
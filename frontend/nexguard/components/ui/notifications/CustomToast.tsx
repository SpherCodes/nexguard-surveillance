'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Bell,
  Shield,
  Settings
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'detection' | 'security' | 'system';

interface CustomToastProps {
  type: ToastType;
  title: string;
  description?: string;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp?: Date;
  isDismissible?: boolean;
}

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        iconColor: 'text-emerald-500',
        borderColor: 'border-l-emerald-500',
        bgColor: 'bg-emerald-50',
        titleColor: 'text-emerald-900',
        descColor: 'text-emerald-700'
      };
    case 'error':
      return {
        icon: XCircle,
        iconColor: 'text-red-500',
        borderColor: 'border-l-red-500',
        bgColor: 'bg-red-50',
        titleColor: 'text-red-900',
        descColor: 'text-red-700'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconColor: 'text-amber-500',
        borderColor: 'border-l-amber-500',
        bgColor: 'bg-amber-50',
        titleColor: 'text-amber-900',
        descColor: 'text-amber-700'
      };
    case 'info':
      return {
        icon: Info,
        iconColor: 'text-blue-500',
        borderColor: 'border-l-blue-500',
        bgColor: 'bg-blue-50',
        titleColor: 'text-blue-900',
        descColor: 'text-blue-700'
      };
    case 'detection':
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        borderColor: 'border-l-black-500',
        bgColor: 'bg-red-50',
        titleColor: 'text-red-900',
        descColor: 'text-black-500'
      };
    case 'security':
      return {
        icon: Shield,
        iconColor: 'text-red-600',
        borderColor: 'border-l-red-600',
        bgColor: 'bg-red-50',
        titleColor: 'text-red-900',
        descColor: 'text-red-700'
      };
    case 'system':
      return {
        icon: Settings,
        iconColor: 'text-gray-500',
        borderColor: 'border-l-gray-500',
        bgColor: 'bg-gray-50',
        titleColor: 'text-gray-900',
        descColor: 'text-gray-700'
      };
    default:
      return {
        icon: Bell,
        iconColor: 'text-gray-500',
        borderColor: 'border-l-gray-500',
        bgColor: 'bg-gray-50',
        titleColor: 'text-gray-900',
        descColor: 'text-gray-700'
      };
  }
};

export const CustomToast: React.FC<CustomToastProps> = ({
  type,
  title,
  description,
  onClose,
  timestamp,
  isDismissible = true
}) => {
  const config = getToastConfig(type);
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        'relative flex w-full max-w-sm rounded-xl border-l-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl',
        config.borderColor,
        config.bgColor,
        'border border-white/20'
      )}
    >
      {/* Main content */}
      <div className="flex flex-1 p-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={cn('rounded-full p-2 bg-white/50', config.iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className={cn('text-sm font-semibold', config.titleColor)}>
                {title}
              </h4>
              {description && (
                <p className={cn('mt-1 text-sm', config.descColor)}>
                  {description}
                </p>
              )}
              {timestamp && (
                <p className="mt-1 text-xs text-gray-500">
                  {timestamp.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Close button */}
            {isDismissible && onClose && (
              <button
                onClick={onClose}
                className="ml-2 flex-shrink-0 rounded-full p-1 hover:bg-white/50 transition-colors"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
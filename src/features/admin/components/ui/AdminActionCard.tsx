import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme.ts';

interface AdminActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: string;
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
}

export const AdminActionCard: React.FC<AdminActionCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge,
  variant = 'secondary',
  isLoading = false,
  disabled = false
}) => {
  const { isLight } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return isLight
          ? 'bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-900'
          : 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/30 text-blue-300';
      case 'warning':
        return isLight
          ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'danger':
        return isLight
          ? 'bg-rose-50/50 hover:bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 text-rose-300';
      default:
        return isLight
          ? 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-900'
          : 'bg-[#161b26] hover:bg-[#1f2637] border-[#21262d] text-white';
    }
  };

  const getIconContainerStyles = () => {
    switch (variant) {
      case 'primary':
        return isLight ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white';
      case 'warning':
        return isLight ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white';
      case 'danger':
        return isLight ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white';
      default:
        return isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#21262d] text-slate-300';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 select-none shadow-sm flex flex-col justify-between min-h-[110px] ${getVariantStyles()} ${
        disabled 
          ? 'opacity-40 cursor-not-allowed grayscale-[30%] pointer-events-none' 
          : isLoading 
            ? 'opacity-60 cursor-not-allowed' 
            : 'cursor-pointer active:scale-[0.98] hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${getIconContainerStyles()}`}>
          <Icon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
            {badge}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-sm font-bold leading-tight">{title}</h4>
        <p className={`text-xs mt-1 line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {description}
        </p>
      </div>
    </button>
  );
};

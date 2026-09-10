import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme.ts';

interface AdminSectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  actions?: React.ReactNode;
}

export const AdminSectionHeader: React.FC<AdminSectionHeaderProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  actions
}) => {
  const { isLight } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-[#21262d]">
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {title}
            </h3>
            {badge && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-[#21262d] text-slate-300 border border-[#30363d]'
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

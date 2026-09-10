import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme.ts';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    text: string;
    isPositive?: boolean;
  };
  accentColor?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = '#3B82F6'
}) => {
  const { isLight } = useTheme();

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
        isLight
          ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
          : 'bg-[#111622] border-[#21262d] hover:border-[#30363d]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {title}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
          style={{
            backgroundColor: `${accentColor}1A`,
            color: accentColor
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            {trend && (
              <span
                className={`px-1.5 py-0.5 rounded-md font-bold ${
                  trend.isPositive
                    ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                    : isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {trend.text}
              </span>
            )}
            {subtitle && (
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

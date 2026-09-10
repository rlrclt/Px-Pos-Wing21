import React from 'react';
import { useTheme } from '../../../../hooks/useTheme.ts';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface AdminFilterPillsProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const AdminFilterPills: React.FC<AdminFilterPillsProps> = ({
  options,
  selectedId,
  onSelect,
  className = ''
}) => {
  const { isLight } = useTheme();

  return (
    <div className={`relative py-1 ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0 min-h-[40px] cursor-pointer select-none active:scale-[0.98] ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : isLight
                    ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                    : 'bg-[#161b26] text-slate-400 hover:text-white hover:bg-[#202738] border border-[#21262d]'
              }`}
            >
              {opt.icon && <span className="text-sm">{opt.icon}</span>}
              <span>{opt.label}</span>
              {typeof opt.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isLight
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-[#21262d] text-slate-300'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

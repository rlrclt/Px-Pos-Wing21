import React, { useRef } from 'react';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme.ts';

interface CategorySliderProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
}

export const CategorySlider: React.FC<CategorySliderProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts = {}
}) => {
  const { isLight } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allCategories = ['ALL', ...categories.filter(c => c !== 'ALL')];

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center group">
      {/* Scroll Left Button */}
      <button
        onClick={() => handleScroll('left')}
        className={`hidden sm:flex items-center justify-center w-7 h-7 rounded-full border shadow-md absolute left-0 z-10 -translate-x-2 transition-all cursor-pointer ${
          isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-[#1a2336] border-[#2b3a55] text-slate-200 hover:bg-[#223048]'
        }`}
        title="เลื่อนซ้าย"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 sm:px-6 w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allCategories.map((cat) => {
          const isActive = activeCategory === cat;
          const count = categoryCounts[cat];

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`relative flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-2 border ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    : 'bg-[#131b2c] border-[#233048] text-slate-300 hover:bg-[#1c273e] hover:border-[#2f4263]'
              }`}
            >
              {cat === 'ALL' ? (
                <Layers className="w-3.5 h-3.5" />
              ) : null}
              <span>{cat === 'ALL' ? 'สินค้าทั้งหมด' : cat}</span>

              {count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#1e2a42] text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => handleScroll('right')}
        className={`hidden sm:flex items-center justify-center w-7 h-7 rounded-full border shadow-md absolute right-0 z-10 translate-x-2 transition-all cursor-pointer ${
          isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-[#1a2336] border-[#2b3a55] text-slate-200 hover:bg-[#223048]'
        }`}
        title="เลื่อนขวา"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

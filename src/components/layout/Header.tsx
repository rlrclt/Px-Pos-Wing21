import { Wifi, WifiOff, Moon, Sun, LogOut } from 'lucide-react';
import type { RoutePath, Theme } from '../../types/ui.ts';

interface HeaderProps {
  currentPath: RoutePath;
  onNavigate: (path: RoutePath) => void;
  onLogout: () => void;
  currentUser: { name: string; role: string } | null;
  isOnline: boolean;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({
  onLogout,
  currentUser,
  isOnline,
  theme,
  onToggleTheme
}: HeaderProps) {
  const isLight = theme === 'light';

  return (
    <header className={`px-6 py-3 sticky top-0 z-40 border-b transition-colors ${
      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#111622] border-[#21262d]'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onLogout}
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold hover:scale-105 transition-transform cursor-pointer shadow-xs ${
              isLight 
                ? 'bg-blue-600 text-white border border-blue-700' 
                : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
            }`}
            title="กลับหน้าหลัก"
          >
            PX
          </button>
          <div>
            <div className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              PX หน่วยฝึกทหารใหม่ (พัน.อย.บน.21)
              <span className={`px-1.5 py-0.2 text-[10px] rounded font-semibold ${
                isLight 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}>
                ENTERPRISE POS
              </span>
            </div>
            <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ผู้ใช้งาน: <span className={`font-semibold ${isLight ? 'text-blue-600' : 'text-cyan-300'}`}>{currentUser?.name || 'ระบบ'}</span> ({currentUser?.role || 'SYSTEM'})
            </div>
          </div>
        </div>

        {/* Theme Switcher, Status & Exit */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-700 shadow-2xs' 
                : 'bg-[#161b26] hover:bg-[#202d45] border-[#2b3a55] text-cyan-300'
            }`}
            title="สลับธีม Enterprise Light / Tactical Dark"
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Tactical Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Clean Light</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 text-xs">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <Wifi className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <WifiOff className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isLight 
                ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200 hover:border-rose-300' 
                : 'bg-[#161b26] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border-[#21262d] hover:border-rose-500/30'
            }`}
            title="ออกจากระบบ"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออก</span>
          </button>
        </div>
      </div>
    </header>
  );
}

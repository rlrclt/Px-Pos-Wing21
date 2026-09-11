import React from 'react';
import { 
  LogOut, Moon, Sun, Bell, Search, Menu, Sparkles, Lock
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme.ts';
import type { RoutePath } from '../../../types/ui.ts';
import type { AuthUser } from '../../../types/schema.ts';

interface AdminHeaderProps {
  currentPath?: RoutePath;
  onNavigate: (path: RoutePath) => void;
  onLogout: () => void;
  onLock?: () => void;
  onOpenProfile?: () => void;
  currentUser: { name?: string; full_name?: string; role: string; seller_id?: string; avatar_url?: string } | AuthUser | null;
  isOnline: boolean;
  onToggleTheme: () => void;
  toggleMobileMenu?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onNavigate,
  onLogout,
  onLock,
  onOpenProfile,
  currentUser,
  isOnline,
  onToggleTheme,
  toggleMobileMenu
}) => {
  const { isLight } = useTheme();

  return (
    <header className={`h-16 px-4 lg:px-6 flex items-center justify-between border-b shrink-0 transition-all ${
      isLight ? 'bg-white/90 backdrop-blur-md border-slate-200/80 shadow-xs' : 'bg-[#0F1115]/90 backdrop-blur-md border-[#21262d]'
    }`}>
      {/* Left section: Branding & Mobile Toggle */}
      <div className="flex items-center gap-3 sm:gap-4">
        {toggleMobileMenu && (
          <button 
            onClick={toggleMobileMenu}
            className={`lg:hidden p-2.5 rounded-xl border transition min-h-[42px] min-w-[42px] flex items-center justify-center ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-[#181B22] border-[#262A36] text-slate-300 hover:bg-[#232732]'
            }`}
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
            PX
          </div>
          <div>
            <div className={`text-sm font-black tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Enterprise Admin
              <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> POS HQ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right section: Search, Theme, Staff Profile, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search */}
        <div className={`hidden md:flex items-center px-3 py-1.5 rounded-xl border w-48 lg:w-64 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
        }`}>
          <Search className={`w-4 h-4 mr-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          <input 
            type="text" 
            placeholder="ค้นหาข้อมูลระบบ..." 
            className={`bg-transparent border-none outline-none text-xs w-full ${
              isLight ? 'text-slate-800 placeholder-slate-400' : 'text-slate-200 placeholder-slate-500'
            }`}
          />
        </div>

        <div className={`h-6 w-px mx-0.5 hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-[#262A36]'}`} />

        {/* Open POS Sell Terminal Button */}
        <button
          onClick={() => onNavigate('/pos')}
          className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs min-h-[42px] ${
            isLight
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 shadow-emerald-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/20'
          }`}
          title="เข้าสู่หน้าขายหน้าร้าน (POS Terminal)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>หน้าขาย POS</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer min-h-[42px] min-w-[42px] ${
            isLight 
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
              : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-amber-400'
          }`}
          title="สลับธีม สว่าง/มืด"
        >
          {isLight ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Notifications */}
        <button className={`p-2.5 rounded-xl border flex items-center justify-center relative transition-all cursor-pointer min-h-[42px] min-w-[42px] ${
          isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-400'
        }`}>
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </button>

        {/* User Profile & Status */}
        <div className={`pl-2 sm:pl-3 flex items-center gap-2.5 border-l ${isLight ? 'border-slate-200' : 'border-[#262A36]'}`}>
          <button
            type="button"
            onClick={onOpenProfile}
            className={`hidden sm:flex items-center gap-2 p-1.5 -my-1 rounded-xl transition cursor-pointer text-left ${
              onOpenProfile 
                ? isLight 
                  ? 'hover:bg-slate-100/80 active:bg-slate-200/80' 
                  : 'hover:bg-[#181B22] active:bg-[#202532]' 
                : ''
            }`}
            title="คลิกเพื่อไปที่โปรไฟล์และความปลอดภัย"
          >
            {(currentUser as any)?.avatar_url ? (
              <img 
                src={(currentUser as any).avatar_url} 
                alt={(currentUser as any)?.full_name || (currentUser as any)?.name} 
                className="w-8 h-8 rounded-full object-cover border border-blue-500/30 shadow-xs" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 flex items-center justify-center text-xs font-bold">
                {((currentUser as any)?.full_name || (currentUser as any)?.name || 'AD').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <div className={`text-xs font-bold truncate max-w-[140px] flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>{(currentUser as any)?.full_name || (currentUser as any)?.name || 'Administrator'}</span>
              </div>
              <div className="text-[10px] font-medium flex items-center gap-1.5">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  currentUser?.role === 'SELLER'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                }`}>
                  {currentUser?.role === 'SELLER' ? `SELLER ${(currentUser as any)?.seller_id || ''}` : 'HQ ADMIN'}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`text-[9px] ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </button>

          {onLock && (
            <button
              onClick={onLock}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs min-h-[42px] min-w-[42px] ${
                isLight 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200' 
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
              }`}
              title="ล็อคหน้าจอชั่วคราว (PIN Lock)"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs min-h-[42px] min-w-[42px] ${
              isLight 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200' 
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
            }`}
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

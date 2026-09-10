import React from 'react';
import { 
  Shield, Users, FolderPlus, FolderOpen, Package, Command, Store, Wifi, Database, X,
  ChevronLeft, ChevronRight, ReceiptText, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminTab } from '../../../types/ui.ts';
import type { AuthUser } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface AdminSidebarProps {
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  loadDriveFolders?: () => void;
  loadProducts?: () => void;
  loadSellers?: () => void;
  loadPromotions?: () => void;
  activePromosCount?: number;
  currentUser?: AuthUser | null;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  adminTab,
  setAdminTab,
  isOpenMobile = false,
  onCloseMobile = () => {},
  isCollapsed = false,
  onToggleCollapse,
  loadDriveFolders,
  loadProducts,
  loadSellers,
  loadPromotions,
  activePromosCount,
  currentUser
}) => {
  const { isLight } = useTheme();
  const isSeller = currentUser?.role === 'SELLER';

  const allNavItems: {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    onSelect?: () => void;
    adminOnly?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ด & คำสั่งด่วน',
      icon: Command,
      adminOnly: true
    },
    {
      id: 'orders',
      label: 'ประวัติการซื้อขาย',
      icon: ReceiptText
    },
    {
      id: 'welfare',
      label: 'บัญชีสวัสดิการ',
      icon: Users,
      adminOnly: true
    },
    {
      id: 'batches',
      label: 'จัดการผลัดทหาร',
      icon: FolderPlus,
      adminOnly: true
    },
    {
      id: 'folders',
      label: 'Google Drive & ซิงค์',
      icon: FolderOpen,
      adminOnly: true,
      onSelect: () => {
        if (loadDriveFolders) loadDriveFolders();
      }
    },
    {
      id: 'products',
      label: isSeller ? 'สินค้าของร้าน' : 'คลังสินค้า & ราคา',
      icon: Package,
      onSelect: () => {
        if (loadProducts) loadProducts();
        if (loadSellers) loadSellers();
      }
    },
    {
      id: 'sellers',
      label: isSeller ? `ร้านค้าของฉัน (${currentUser?.seller_id || 'S01'})` : 'ผู้ฝากขาย',
      icon: Store,
      onSelect: () => {
        if (loadProducts) loadProducts();
        if (loadSellers) loadSellers();
      }
    },
    {
      id: 'promotions',
      label: 'จัดการโปรโมชั่น',
      icon: Tag,
      badge: activePromosCount && activePromosCount > 0 ? `${activePromosCount}` : undefined,
      onSelect: () => {
        if (loadPromotions) loadPromotions();
        if (loadProducts) loadProducts();
        if (loadSellers) loadSellers();
      }
    }
  ];

  const navItems = isSeller 
    ? allNavItems.filter(item => !item.adminOnly)
    : allNavItems;

  const renderContent = (collapsed: boolean) => (
    <div className={`flex flex-col justify-between h-full ${collapsed ? 'p-2.5' : 'p-4'} transition-all duration-300`}>
      <div className="space-y-4">
        {/* Header */}
        <div className={`pb-3.5 border-b border-slate-200 dark:border-[#21262d] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold shadow-xs ${
              isSeller 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            }`}>
              {isSeller ? <Store className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h2 className={`font-black text-sm tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {isSeller ? 'PX Seller Portal' : 'PX พัน.อย.บน.21'}
                </h2>
                <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isSeller ? `ร้านค้า: ${currentUser?.seller_id || 'S01'}` : 'หน่วยฝึกทหารใหม่'}
                </p>
              </motion.div>
            )}
          </div>

          {/* Close Button on Mobile */}
          <button
            onClick={onCloseMobile}
            className={`lg:hidden p-2 rounded-lg border transition min-h-[38px] min-w-[38px] flex items-center justify-center ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] border-[#262A36] text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setAdminTab(item.id);
                  if (item.onSelect) item.onSelect();
                  onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full text-left rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center ${
                  collapsed ? 'justify-center p-2.5 min-h-[44px]' : 'justify-between px-3.5 py-3 min-h-[46px]'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white hover:bg-[#181B22]'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status & Collapse Toggle */}
      <div className="space-y-2">
        {/* Collapse toggle button on desktop */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center ${
              collapsed ? 'justify-center' : 'justify-between px-3'
            } w-full py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none active:scale-[0.97] ${
              isLight 
                ? 'bg-slate-100/80 hover:bg-slate-200/80 border-slate-200 text-slate-700' 
                : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
            }`}
            title={collapsed ? 'ขยายแถบเมนู' : 'หุบแถบเมนู'}
          >
            {!collapsed && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                ย่อแถบเมนู
              </span>
            )}
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-blue-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}

        {/* Status card */}
        <div className={`rounded-lg border text-[11px] ${collapsed ? 'p-2 flex flex-col items-center' : 'p-3 space-y-1.5'} ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
        }`}>
          {collapsed ? (
            <div className="relative group cursor-pointer" title="Cloud Database: SYNCED">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  <Database className="w-3.5 h-3.5 text-blue-500" /> Cloud Sync
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <div className={`flex items-center justify-between text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-500" /> POS Edge
                </span>
                <span className="font-mono">v2.4</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer with AnimatePresence */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className={`fixed top-0 left-0 h-full z-50 w-72 lg:hidden border-r shadow-2xl ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0F1115] border-[#21262d]'
              }`}
            >
              {renderContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Collapsible Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        className={`hidden lg:flex shrink-0 flex-col justify-between border-r h-full overflow-hidden ${
          isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-[#0F1115] border-[#21262d]'
        }`}
      >
        {renderContent(isCollapsed)}
      </motion.aside>
    </>
  );
};

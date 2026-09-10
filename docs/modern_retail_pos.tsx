import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Menu,
  X,
  Bell,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Store,
  Layers,
  BarChart3,
  Users,
  Settings,
  Receipt,
  Wifi,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Percent,
  Check,
  PackageCheck,
  Palette,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

export const THEMES = [
  {
    id: 'midnight',
    name: 'มิดไนท์บลู (Midnight Slate)',
    desc: 'โทนดาร์กโมเดิร์นมาตรฐาน สีดำอมฟ้า สบายตา',
    type: 'dark',
    accentColor: '#3B82F6',
    previewGradient: 'from-blue-600 to-indigo-700',
    vars: {
      '--bg-color': '#0F1115',
      '--surface-color': '#181B22',
      '--surface-hover': '#232732',
      '--border-color': '#262A36',
      '--primary-color': '#3B82F6',
      '--primary-hover': '#2563EB',
      '--primary-soft': 'rgba(59, 130, 246, 0.15)',
      '--text-primary': '#E5E7EB',
      '--text-secondary': '#9CA3AF',
      '--badge-bg': '#1E293B',
    }
  },
  {
    id: 'emerald',
    name: 'มินต์อีเมอรัลด์ (Mint Forest)',
    desc: 'โทนเขียวธรรมชาติ สไตล์มินิมาร์ทสดใหม่และคาเฟ่',
    type: 'dark',
    accentColor: '#10B981',
    previewGradient: 'from-emerald-500 to-teal-700',
    vars: {
      '--bg-color': '#0B1310',
      '--surface-color': '#131F1B',
      '--surface-hover': '#1B2B26',
      '--border-color': '#1E362E',
      '--primary-color': '#10B981',
      '--primary-hover': '#059669',
      '--primary-soft': 'rgba(16, 185, 129, 0.15)',
      '--text-primary': '#ECFDF5',
      '--text-secondary': '#94A3B8',
      '--badge-bg': '#064E3B',
    }
  },
  {
    id: 'amethyst',
    name: 'โอเล็ดนีออน (Cyber Violet)',
    desc: 'ดาร์กสนิทระดับ OLED พร้อมไฮไลท์ม่วงนีออนล้ำสมัย',
    type: 'dark',
    accentColor: '#A855F7',
    previewGradient: 'from-purple-600 to-fuchsia-600',
    vars: {
      '--bg-color': '#08080B',
      '--surface-color': '#13131A',
      '--surface-hover': '#1C1C26',
      '--border-color': '#242433',
      '--primary-color': '#A855F7',
      '--primary-hover': '#9333EA',
      '--primary-soft': 'rgba(168, 85, 247, 0.15)',
      '--text-primary': '#F3E8FF',
      '--text-secondary': '#A1A1AA',
      '--badge-bg': '#3B0764',
    }
  },
  {
    id: 'amber',
    name: 'มอคค่าแอมเบอร์ (Warm Roast)',
    desc: 'โทนอบอุ่น เรียบหรู คลาสสิก เหมาะสำหรับเบเกอรี่/ร้านอาหาร',
    type: 'dark',
    accentColor: '#F59E0B',
    previewGradient: 'from-amber-500 to-orange-600',
    vars: {
      '--bg-color': '#14110E',
      '--surface-color': '#1F1B16',
      '--surface-hover': '#2B251F',
      '--border-color': '#383027',
      '--primary-color': '#F59E0B',
      '--primary-hover': '#D97706',
      '--primary-soft': 'rgba(245, 158, 11, 0.15)',
      '--text-primary': '#FEF3C7',
      '--text-secondary': '#A8A29E',
      '--badge-bg': '#451A03',
    }
  },
  {
    id: 'rose',
    name: 'ซันเซ็ตคอรัล (Sunset Rose)',
    desc: 'โทนชมพูกุหลาบ อ่อนหวาน ชัดเจน มีเสน่ห์สดใส',
    type: 'dark',
    accentColor: '#F43F5E',
    previewGradient: 'from-rose-500 to-pink-600',
    vars: {
      '--bg-color': '#140E11',
      '--surface-color': '#1E1419',
      '--surface-hover': '#2C1B24',
      '--border-color': '#3C2331',
      '--primary-color': '#F43F5E',
      '--primary-hover': '#E11D48',
      '--primary-soft': 'rgba(244, 63, 94, 0.15)',
      '--text-primary': '#FFE4E6',
      '--text-secondary': '#A1A1AA',
      '--badge-bg': '#4C0519',
    }
  },
  {
    id: 'light_clean',
    name: 'คลีนมินิมอล ไลท์ (Clean Crisp)',
    desc: 'โหมดสว่าง คมชัด สะอาดตา เหมาะกับร้านค้าที่มีแสงธรรมชาติจ้า',
    type: 'light',
    accentColor: '#2563EB',
    previewGradient: 'from-blue-500 to-indigo-600',
    vars: {
      '--bg-color': '#F3F4F6',
      '--surface-color': '#FFFFFF',
      '--surface-hover': '#F9FAFB',
      '--border-color': '#E2E8F0',
      '--primary-color': '#2563EB',
      '--primary-hover': '#1D4ED8',
      '--primary-soft': 'rgba(37, 99, 235, 0.1)',
      '--text-primary': '#0F172A',
      '--text-secondary': '#64748B',
      '--badge-bg': '#EFF6FF',
    }
  }
];

// Sample product database with Thai retail/minimart items
const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'โออิชิ กรีนที ต้นตำรับ 500ml', category: 'beverages', price: 25, stock: 48, barcode: '885171700101', icon: '🍵' },
  { id: 'p2', name: 'เลย์ มันฝรั่งแท้ คลาสสิค 50g', category: 'snacks', price: 32, stock: 30, barcode: '885071880122', icon: '🥔' },
  { id: 'p3', name: 'มาม่า บะหมี่ต้มยำกุ้งน้ำข้น', category: 'instant_food', price: 15, stock: 75, barcode: '885098710334', icon: '🍜' },
  { id: 'p4', name: 'นมไทยเดนมาร์ค รสจืด 200ml', category: 'dairy', price: 14, stock: 36, barcode: '885234500112', icon: '🥛' },
  { id: 'p5', name: 'น้ำดื่มสิงห์ 600ml', category: 'beverages', price: 10, stock: 120, barcode: '885002901198', icon: '💧' },
  { id: 'p6', name: 'ขนมปังฟาร์มเฮ้าส์ โฮลวีต', category: 'bakery', price: 24, stock: 18, barcode: '885012389012', icon: '🍞' },
  { id: 'p7', name: 'โค้ก ซีโร่ แคน 325ml', category: 'beverages', price: 16, stock: 52, barcode: '885195913201', icon: '🥤' },
  { id: 'p8', name: 'เป๊ก แซนวิชโบโลน่าชีส', category: 'instant_food', price: 35, stock: 12, barcode: '885888200192', icon: '🥪' },
  { id: 'p9', name: 'ฮอลล์ ลูกอม เมนทอล 8 เม็ด', category: 'snacks', price: 10, stock: 90, barcode: '885111100234', icon: '🍬' },
  { id: 'p10', name: 'ยาสีฟันคอลเกต โททอล 150g', category: 'daily_goods', price: 69, stock: 22, barcode: '885000239102', icon: '🪥' },
  { id: 'p11', name: 'ทิชชู่ม้วนคลีเน็กซ์ (แพ็ค 6)', category: 'daily_goods', price: 89, stock: 15, barcode: '885044433321', icon: '🧻' },
  { id: 'p12', name: 'กาแฟเบอร์ดี้ โรบัสต้า 180ml', category: 'beverages', price: 17, stock: 64, barcode: '885012300088', icon: '☕' },
];

const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด', icon: '🏷️' },
  { id: 'beverages', label: 'เครื่องดื่ม', icon: '🧃' },
  { id: 'snacks', label: 'ขนมขบเคี้ยว', icon: '🍿' },
  { id: 'instant_food', label: 'อาหารพร้อมทาน', icon: '🍱' },
  { id: 'dairy', label: 'นม & ผลิตภัณฑ์นม', icon: '🥛' },
  { id: 'bakery', label: 'เบเกอรี่', icon: '🥐' },
  { id: 'daily_goods', label: 'ของใช้ประจำวัน', icon: '🧼' },
];

const ThemeSelectorModal = ({ isOpen, onClose, currentThemeId, onSelectTheme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-5 overflow-hidden animate-in zoom-in-95 duration-200 text-[var(--text-primary)]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary-soft)] text-[var(--primary-color)] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">เลือกธีมระบบ (POS Theme)</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">ปรับเปลี่ยนสีและบรรยากาศให้เหมาะกับร้านของคุณ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme cards list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4 max-h-[60vh] overflow-y-auto">
          {THEMES.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative group active:scale-[0.98] ${
                  isSelected
                    ? 'border-[var(--primary-color)] bg-[var(--primary-soft)] shadow-md'
                    : 'border-[var(--border-color)] bg-[var(--bg-color)] hover:border-gray-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded-full shadow-sm flex items-center justify-center text-[9px] text-white font-bold"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <span className="text-xs font-semibold">{theme.name.split(' (')[0]}</span>
                  </div>
                  {theme.type === 'light' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>

                <div className="w-full h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-color)] flex items-center px-2 gap-1.5 overflow-hidden mb-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                  <div className="h-1.5 w-12 rounded-full opacity-60" style={{ backgroundColor: theme.accentColor }} />
                  <div className="h-1.5 flex-1 rounded-full bg-gray-500/20" />
                </div>

                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                  {theme.desc}
                </p>

                {isSelected && (
                  <span 
                    className="absolute top-2 right-2 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--surface-hover)] text-[var(--text-primary)] hover:bg-gray-500/20 transition min-h-[40px]"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

const AppHeader = ({
  searchTerm,
  setSearchTerm,
  toggleSidebar,
  cartCount,
  onOpenMobileCart,
  onOpenThemeModal,
  currentTheme,
  cashierName = 'สมชาย มีสุข (Cashier 01)'
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface-color)] border-b border-[var(--border-color)] shadow-sm">
      {/* Brand & Drawer Hamburger */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar Menu"
          className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition active:scale-95 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 select-none">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Store className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">MINI POS</h1>
            <p className="text-[10px] text-[var(--text-secondary)]">สมาร์ทมาร์ท สาขา 01</p>
          </div>
        </div>
      </div>

      {/* Global Quick Search */}
      <div className="flex-1 max-w-md mx-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ สแกนบาร์โค้ด..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-color)] text-sm text-[var(--text-primary)] pl-9 pr-8 py-2 rounded-xl border border-[var(--border-color)] focus:outline-none focus:border-[var(--primary-color)] transition placeholder:text-[var(--text-secondary)] min-h-[42px]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action / Cashier / Theme / Notification */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Theme Switcher Button */}
        <button
          onClick={onOpenThemeModal}
          title={`เปลี่ยนธีม (ปัจจุบัน: ${currentTheme.name})`}
          className="relative p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] transition active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5"
          aria-label="Change Theme"
        >
          <span 
            className="w-3.5 h-3.5 rounded-full shadow-inner ring-2 ring-[var(--border-color)]"
            style={{ backgroundColor: currentTheme.accentColor }}
          />
          <Palette className="w-4 h-4 text-[var(--text-secondary)] hidden sm:inline" />
        </button>

        <button
          aria-label="Notifications"
          className="relative p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Bell className="w-5 h-5" />
          <span 
            className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--primary-color)' }}
          />
        </button>

        {/* Mobile quick cart icon with badge */}
        <button
          onClick={onOpenMobileCart}
          className="lg:hidden relative p-2.5 rounded-xl text-[var(--text-primary)] bg-[var(--surface-hover)] hover:opacity-90 border border-[var(--border-color)] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open Cart"
        >
          <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
          {cartCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-bounce"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {cartCount}
            </span>
          )}
        </button>

        {/* Staff profile badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[var(--border-color)]">
          <div 
            className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold"
            style={{ 
              backgroundColor: 'var(--primary-soft)', 
              borderColor: 'var(--primary-color)',
              color: 'var(--primary-color)' 
            }}
          >
            SC
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="text-[var(--text-primary)] font-medium truncate max-w-[120px]">{cashierName}</p>
            <p className="text-[10px] text-emerald-500 font-medium">ออนไลน์ (กะเช้า)</p>
          </div>
        </div>
      </div>
    </header>
  );
};

const AppSidebar = ({ isOpen, onClose, activeTab, setActiveTab, onOpenThemeModal }) => {
  const menuItems = [
    { id: 'sales', label: 'รายการขาย (POS)', icon: Store },
    { id: 'inventory', label: 'สินค้า / สต็อก', icon: Layers, badge: '12 แจ้งเตือน' },
    { id: 'reports', label: 'รายงานยอดขาย', icon: BarChart3 },
    { id: 'customers', label: 'สมาชิกลูกค้า', icon: Users },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full z-50 w-64 bg-[var(--surface-color)] border-r border-[var(--border-color)] flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4">
          {/* Drawer close for mobile */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] lg:hidden">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <Store className="w-4 h-4" />
              </div>
              <span className="font-semibold text-[var(--text-primary)]">ระบบจัดการร้านค้า</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="hidden lg:block text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-3 px-2">
            เมนูหลัก
          </p>

          {/* Nav Items */}
          <nav className="space-y-1.5 mt-2 lg:mt-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition min-h-[48px] ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  }`}
                  style={isActive ? { backgroundColor: 'var(--primary-color)' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[var(--text-secondary)]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Current cashier & shift info footer inside sidebar */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-color)]/50 space-y-2">
          {/* Quick Theme Switch in Sidebar */}
          <button
            onClick={onOpenThemeModal}
            className="w-full py-2 px-3 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition flex items-center justify-between min-h-[42px]"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--primary-color)]" />
              <span>ปรับแต่งธีมสี</span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
          </button>

          <div className="flex items-center gap-3 py-1">
            <div 
              className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold"
              style={{ 
                backgroundColor: 'var(--primary-soft)', 
                borderColor: 'var(--primary-color)',
                color: 'var(--primary-color)' 
              }}
            >
              POS
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">เครื่องแคชเชียร์ 01</p>
              <p className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> เชื่อมต่อคลาวด์
              </p>
            </div>
          </div>
          <button
            onClick={() => {}}
            className="w-full py-2 px-3 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition flex items-center justify-center gap-2 min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>ปิดกะ / สรุปยอดเงินสด</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const ProductCategoryTabs = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="relative py-2 -mx-3 px-3 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 min-h-[44px] ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)]'
              }`}
              style={isSelected ? { backgroundColor: 'var(--primary-color)' } : {}}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ProductCard = ({ product, onAddToCart, inCartQty = 0 }) => {
  const isOutOfStock = product.stock <= 0;

  return (
    <div
      onClick={() => !isOutOfStock && onAddToCart(product)}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition-all duration-200 cursor-pointer select-none active:scale-[0.98] shadow-sm hover:shadow-md ${
        isOutOfStock ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Badge when already in cart */}
      {inCartQty > 0 && (
        <span 
          className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full text-white font-bold text-xs shadow-md"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          {inCartQty} ในตะกร้า
        </span>
      )}

      {/* Top area: Icon & Stock */}
      <div>
        <div className="w-full aspect-[4/3] rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-center justify-center text-4xl mb-2.5 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
          <span>{product.icon}</span>
          <span className="absolute bottom-1.5 left-2 text-[10px] text-[var(--text-secondary)] font-mono">
            {product.barcode.slice(-4)}
          </span>
        </div>

        <h3 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
          {product.name}
        </h3>
      </div>

      {/* Bottom area: Price & Action */}
      <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[var(--text-secondary)] block">ราคา</span>
          <span className="text-base sm:text-lg font-bold" style={{ color: 'var(--primary-color)' }}>
            ฿{product.price.toLocaleString()}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          aria-label={`เพิ่ม ${product.name} ลงในตะกร้า`}
          className="w-10 h-10 rounded-xl border border-[var(--border-color)] flex items-center justify-center transition active:scale-90 hover:opacity-90"
          style={{ 
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--primary-color)'
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ProductGrid = ({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  onAddToCart,
  cartItems
}) => {
  const getCartQuantity = (id) => {
    const item = cartItems.find((i) => i.id === id);
    return item ? item.quantity : 0;
  };

  return (
    <section className="flex-1 flex flex-col min-w-0">
      {/* Category selector */}
      <ProductCategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />

      {/* Grid container */}
      <div className="flex-1 overflow-y-auto pt-2 pb-24 lg:pb-6">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)] text-center p-6">
            <PackageCheck className="w-12 h-12 mb-2 text-gray-600" />
            <p className="text-base font-medium text-white">ไม่พบรายการสินค้า</p>
            <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5">
            {products.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onAddToCart={onAddToCart}
                inCartQty={getCartQuantity(prod.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const CartItemList = ({ items, onUpdateQty, onRemoveItem }) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center text-[var(--text-secondary)]">
        <div className="w-14 h-14 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border-color)] flex items-center justify-center mb-3 text-[var(--text-secondary)]">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">ยังไม่มีสินค้าในตะกร้า</p>
        <p className="text-xs mt-1 text-[var(--text-secondary)]">แตะเลือกสินค้าจากเมนูด้านซ้ายเพื่อเริ่มต้นคิดเงิน</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="p-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-center justify-between gap-3 shadow-sm hover:border-[var(--primary-color)] transition"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
                {item.name}
              </h4>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--primary-color)' }}>
                ฿{item.price.toLocaleString()}{' '}
                <span className="text-[10px] text-[var(--text-secondary)] font-normal">x {item.quantity}</span>
              </p>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-8 h-8 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center transition active:scale-90"
            >
              {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3.5 h-3.5" />}
            </button>

            <span className="w-7 text-center font-bold text-sm text-[var(--text-primary)] font-mono">
              {item.quantity}
            </span>

            <button
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
              aria-label="Increase quantity"
              className="w-8 h-8 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center transition active:scale-90"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const CartSummary = ({ subtotal, discount, taxRate = 0.07, total }) => {
  const taxAmount = (total * taxRate);

  return (
    <div className="space-y-2 py-3 border-t border-[var(--border-color)] text-xs">
      <div className="flex justify-between text-[var(--text-secondary)]">
        <span>ยอดรวมก่อนหัก (Subtotal)</span>
        <span className="font-mono text-[var(--text-primary)]">฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      {discount > 0 && (
        <div className="flex justify-between text-amber-500 font-medium">
          <span>ส่วนลด (Discount)</span>
          <span className="font-mono">-฿{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      <div className="flex justify-between text-[var(--text-secondary)]">
        <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมแล้ว)</span>
        <span className="font-mono text-[var(--text-primary)]">฿{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-baseline">
        <span className="text-sm font-semibold text-[var(--text-primary)]">ยอดชำระสุทธิ (Total)</span>
        <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight" style={{ color: 'var(--primary-color)' }}>
          ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

const CheckoutButton = ({ total, count, onCheckout, disabled }) => {
  return (
    <button
      onClick={onCheckout}
      disabled={disabled || count === 0}
      className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-base flex items-center justify-between shadow-lg transition active:scale-[0.99] min-h-[50px] ${
        disabled || count === 0
          ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-[var(--border-color)]'
          : 'hover:opacity-95'
      }`}
      style={count > 0 && !disabled ? { backgroundColor: 'var(--primary-color)' } : {}}
    >
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5" />
        <span>ชำระเงิน ({count} ชิ้น)</span>
      </div>
      <span className="font-mono text-lg">฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    </button>
  );
};

const CartPanel = ({
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  discount,
  setDiscount,
  onCheckout,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  return (
    <>
      {/* 1. DESKTOP CART PANEL (Right side fixed on large screens) */}
      <div className="hidden lg:flex w-80 xl:w-96 bg-[var(--surface-color)] border-l border-[var(--border-color)] flex-col justify-between p-4 h-[calc(100vh-58px)] sticky top-[58px]">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
            <h2 className="font-semibold text-[var(--text-primary)] text-base">ตะกร้าคิดเงิน</h2>
            <span 
              className="text-xs px-2 py-0.5 rounded-full border font-medium"
              style={{ 
                backgroundColor: 'var(--primary-soft)', 
                borderColor: 'var(--primary-color)',
                color: 'var(--primary-color)' 
              }}
            >
              {count} รายการ
            </span>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-rose-500 hover:opacity-80 transition flex items-center gap-1 p-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้าง
            </button>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto my-3">
          <CartItemList
            items={cartItems}
            onUpdateQty={onUpdateQty}
            onRemoveItem={onRemoveItem}
          />
        </div>

        {/* Quick Discount Tool */}
        {cartItems.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setDiscount(discount === 0 ? 20 : 0)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition flex items-center justify-center gap-1 ${
                discount > 0
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Percent className="w-3 h-3" />
              {discount > 0 ? 'ลบคูปองส่วนลด ฿20' : 'ใช้คูปองส่วนลด ฿20'}
            </button>
          </div>
        )}

        {/* Summary & Checkout */}
        <div>
          <CartSummary subtotal={subtotal} discount={discount} total={total} />
          <div className="mt-3">
            <CheckoutButton
              total={total}
              count={count}
              onCheckout={onCheckout}
              disabled={cartItems.length === 0}
            />
          </div>
        </div>
      </div>

      {/* 2. MOBILE BOTTOM BAR & SHEET */}
      {/* Mobile Sticky Bar at Bottom when closed */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-20 px-3 py-2 bg-[var(--surface-color)]/95 backdrop-blur border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="flex items-center gap-2 text-left"
          >
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <ShoppingCart className="w-5 h-5" />
              </div>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">ยอดรวม ({count} ชิ้น)</p>
              <p className="text-base font-bold font-mono" style={{ color: 'var(--primary-color)' }}>
                ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </button>

          <button
            onClick={count > 0 ? onCheckout : () => setIsMobileOpen(true)}
            disabled={count === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition flex items-center gap-1.5 min-h-[44px] ${
              count === 0
                ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                : 'text-white hover:opacity-90'
            }`}
            style={count > 0 ? { backgroundColor: 'var(--primary-color)' } : {}}
          >
            <span>คิดเงิน</span>
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Expandable Bottom Sheet */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Overlay */}
          <div
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <div className="relative w-full max-h-[85vh] bg-[var(--surface-color)] border-t border-[var(--border-color)] rounded-t-3xl shadow-2xl flex flex-col z-10 p-4 animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-gray-500/50 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                <h3 className="font-semibold text-[var(--text-primary)]">รายการในตะกร้า ({count})</h3>
              </div>
              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <button
                    onClick={onClearCart}
                    className="text-xs text-rose-500 hover:opacity-80 p-1"
                  >
                    ล้างตะกร้า
                  </button>
                )}
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Item list in bottom sheet */}
            <div className="flex-1 overflow-y-auto my-3 max-h-[40vh]">
              <CartItemList
                items={cartItems}
                onUpdateQty={onUpdateQty}
                onRemoveItem={onRemoveItem}
              />
            </div>

            {/* Quick coupon */}
            {cartItems.length > 0 && (
              <button
                onClick={() => setDiscount(discount === 0 ? 20 : 0)}
                className={`w-full py-2 px-3 mb-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  discount > 0
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                {discount > 0 ? 'ยกเลิกคูปองส่วนลด ฿20' : 'ใช้คูปองส่วนลดท้ายบิล ฿20'}
              </button>
            )}

            {/* Summary */}
            <CartSummary subtotal={subtotal} discount={discount} total={total} />

            {/* Action */}
            <div className="mt-3">
              <CheckoutButton
                total={total}
                count={count}
                onCheckout={() => {
                  setIsMobileOpen(false);
                  onCheckout();
                }}
                disabled={cartItems.length === 0}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PaymentModal = ({ isOpen, onClose, total, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState(total);

  useEffect(() => {
    setCashReceived(total);
  }, [total]);

  if (!isOpen) return null;

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 50) * 50 || 50,
    Math.ceil(total / 100) * 100 || 100,
    500,
    1000
  ].filter((v, i, a) => v >= total && a.indexOf(v) === i);

  const change = Math.max(0, cashReceived - total);

  const handleFinish = () => {
    onPaymentSuccess({
      method: paymentMethod,
      received: paymentMethod === 'cash' ? cashReceived : total,
      change: paymentMethod === 'cash' ? change : 0,
      total: total
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--primary-color)'
              }}
            >
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-base">ชำระเงิน</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total to pay display */}
        <div className="my-4 p-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-secondary)]">ยอดที่ต้องชำระทั้งหมด</p>
          <p className="text-3xl font-extrabold font-mono mt-1" style={{ color: 'var(--primary-color)' }}>
            ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'cash', label: 'เงินสด', icon: Banknote },
            { id: 'promptpay', label: 'พร้อมเพย์', icon: QrCode },
            { id: 'card', label: 'บัตรเครดิต', icon: CreditCard },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition min-h-[56px] ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                }`}
                style={isSelected ? { backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Payment Method Content */}
        {paymentMethod === 'cash' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-1">
                รับเงินสดมา (บาท)
              </label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(Number(e.target.value))}
                className="w-full bg-[var(--bg-color)] text-xl font-bold font-mono text-[var(--text-primary)] p-3 rounded-xl border border-[var(--border-color)] focus:border-[var(--primary-color)] focus:outline-none min-h-[48px]"
              />
            </div>

            {/* Quick cash buttons */}
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCashReceived(amt)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-color)] text-xs text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition min-h-[38px]"
                >
                  ฿{amt}
                </button>
              ))}
            </div>

            {/* Change display */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between">
              <span className="text-xs text-emerald-500 font-medium">เงินทอน (Change)</span>
              <span className="text-xl font-bold text-emerald-500 font-mono">
                ฿{change.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === 'promptpay' && (
          <div className="flex flex-col items-center py-4 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)]">
            <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-md mb-2">
              <QrCode className="w-32 h-32 text-gray-900" />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">สแกน QR PromptPay เพื่อชำระ</p>
            <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">บจก. สมาร์ทมาร์ท รีเทล</p>
          </div>
        )}

        {paymentMethod === 'card' && (
          <div className="text-center py-6 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)]">
            <CreditCard className="w-12 h-12 mx-auto mb-2 animate-pulse" style={{ color: 'var(--primary-color)' }} />
            <p className="text-sm font-medium text-[var(--text-primary)]">แตะหรือเสียบบัตรที่เครื่อง EDC</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">รองรับ Visa, Mastercard, PromptCard</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[46px]"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleFinish}
            disabled={paymentMethod === 'cash' && cashReceived < total}
            className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-1.5 shadow-md min-h-[46px] ${
              paymentMethod === 'cash' && cashReceived < total
                ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ยืนยันการรับเงิน</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceiptModal = ({ isOpen, onClose, saleData, onNewSale }) => {
  if (!isOpen || !saleData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white text-gray-900 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in zoom-in-95">
        <div className="text-center border-b border-dashed border-gray-300 pb-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-1.5 font-bold">
            POS
          </div>
          <h4 className="font-bold text-base text-gray-900">สมาร์ทมาร์ท สาขา 01</h4>
          <p className="text-[11px] text-gray-500">TAX ID: 0105562098711 (VAT Included)</p>
          <p className="text-[11px] text-gray-500">{new Date().toLocaleString('th-TH')}</p>
        </div>

        {/* Items List on Receipt */}
        <div className="py-3 border-b border-dashed border-gray-300 max-h-48 overflow-y-auto space-y-1.5 text-xs">
          {saleData.items.map((it) => (
            <div key={it.id} className="flex justify-between items-start">
              <span className="truncate max-w-[180px]">
                {it.name} x{it.quantity}
              </span>
              <span className="font-mono">฿{(it.price * it.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Calculation */}
        <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-gray-300">
          <div className="flex justify-between text-gray-600">
            <span>ยอดรวม (Subtotal)</span>
            <span className="font-mono">฿{saleData.subtotal.toFixed(2)}</span>
          </div>
          {saleData.discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>ส่วนลด (Discount)</span>
              <span className="font-mono">-฿{saleData.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
            <span>ยอดสุทธิ (Total)</span>
            <span className="font-mono text-base">฿{saleData.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 pt-1">
            <span>วิธีชำระ ({saleData.payment.method})</span>
            <span className="font-mono">฿{saleData.payment.received.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>เงินทอน (Change)</span>
            <span className="font-mono">฿{saleData.payment.change.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-2">
          ขอบคุณที่ใช้บริการ / Thank you for shopping with us
        </p>

        {/* Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              window.print();
            }}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 min-h-[44px]"
          >
            พิมพ์ใบเสร็จ
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-md min-h-[44px]"
          >
            ขายรายการใหม่
          </button>
        </div>
      </div>
    </div>
  );
};

const AppFooter = () => {
  return (
    <footer className="hidden lg:flex items-center justify-between px-4 py-2 bg-[var(--surface-color)] border-t border-[var(--border-color)] text-[11px] text-[var(--text-secondary)]">
      <div className="flex items-center gap-4">
        <span>MINI POS Retail Suite v2.4.0</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <Wifi className="w-3.5 h-3.5" /> ระบบ Online ซิงค์เรียลไทม์
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>ฐานข้อมูล: Cloud SQLite-Edge</span>
        <span>เวลาเปิดกะ: 08:00 น.</span>
      </div>
    </footer>
  );
};

const BottomNavBar = ({ activeTab, setActiveTab }) => {
  const navTabs = [
    { id: 'sales', label: 'ขายสินค้า', icon: Store },
    { id: 'inventory', label: 'สต็อก', icon: Layers },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
    { id: 'customers', label: 'ลูกค้า', icon: Users },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[var(--surface-color)] border-t border-[var(--border-color)] flex items-center justify-around px-1">
      {navTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[48px] ${
              isActive ? 'font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={isActive ? { color: 'var(--primary-color)' } : {}}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const SettingsView = ({ currentThemeId, onSelectTheme, onOpenThemeModal }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">ตั้งค่าระบบ (Settings)</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">จัดการรูปลักษณ์ ธีมสี เครื่องพิมพ์ และข้อมูลร้าน</p>
      </div>

      {/* Theme selection card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] mb-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">ธีมสีและการแสดงผล</h3>
              <p className="text-xs text-[var(--text-secondary)]">เลือกโทนสีที่เหมาะสมกับสภาพแสงและประเภทของร้านคุณ</p>
            </div>
          </div>
          <button
            onClick={onOpenThemeModal}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            ดูตัวอย่างทั้งหมด
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition relative ${
                  isSelected
                    ? 'border-[var(--primary-color)] bg-[var(--primary-soft)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-color)] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                  {isSelected && <Check className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />}
                </div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{theme.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">{theme.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* POS hardware dummy settings */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">อุปกรณ์ต่อพ่วง (Hardware Devices)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-center justify-between">
            <span>เครื่องพิมพ์ใบเสร็จ (Receipt Thermal 80mm)</span>
            <span className="text-emerald-500 font-semibold">พร้อมใช้งาน</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-center justify-between">
            <span>เครื่องสแกนบาร์โค้ด (2D Wireless Scanner)</span>
            <span className="text-emerald-500 font-semibold">เชื่อมต่อแล้ว</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecondaryViewPlaceholder = ({ title, icon: Icon, description }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div 
        className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-3"
        style={{ 
          backgroundColor: 'var(--primary-soft)',
          borderColor: 'var(--primary-color)',
          color: 'var(--primary-color)'
        }}
      >
        <Icon className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">{title}</h2>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">{description}</p>
      <div className="p-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
        หน้าขาย POS พร้อมใช้งานเต็มรูปแบบแล้ว คลิกที่แท็บ "ขายสินค้า (POS)" เพื่อเริ่มการขาย
      </div>
    </div>
  );
};

export default function App() {
  const [products] = useState(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');

  // Multi-Theme State
  const [currentThemeId, setCurrentThemeId] = useState('midnight');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const activeTheme = useMemo(() => {
    return THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
  }, [currentThemeId]);

  // Cart state
  const [cartItems, setCartItems] = useState([
    { id: 'p1', name: 'โออิชิ กรีนที ต้นตำรับ 500ml', price: 25, quantity: 2, icon: '🍵' },
    { id: 'p3', name: 'มาม่า บะหมี่ต้มยำกุ้งน้ำข้น', price: 15, quantity: 3, icon: '🍜' },
  ]);
  const [discount, setDiscount] = useState(0);

  // Mobile cart sheet state
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Checkout and Receipt Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Filter products by category and search term
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Cart operations
  const handleAddToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (id, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
  };

  // Checkout process
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  const handleOpenCheckout = () => {
    if (cartItems.length === 0) return;
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (paymentInfo) => {
    setReceiptData({
      items: [...cartItems],
      subtotal: cartSubtotal,
      discount: discount,
      total: cartTotal,
      payment: paymentInfo
    });
    setIsPaymentOpen(false);
  };

  const handleNewSale = () => {
    setReceiptData(null);
    setCartItems([]);
    setDiscount(0);
  };

  return (
    <div 
      className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200"
      style={activeTheme.vars}
    >
      {/* 1. AppHeader with Theme Switcher */}
      <AppHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
        onOpenMobileCart={() => setIsMobileCartOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        currentTheme={activeTheme}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2. AppSidebar */}
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
        />

        {/* 3. MainContent */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'sales' ? (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left/Main Column: Product Catalog */}
              <div className="flex-1 flex flex-col px-3.5 py-2.5 overflow-hidden">
                <ProductGrid
                  products={filteredProducts}
                  categories={CATEGORIES}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onAddToCart={handleAddToCart}
                  cartItems={cartItems}
                />
              </div>

              {/* Right Column / Mobile Bottom Sheet: Cart */}
              <CartPanel
                cartItems={cartItems}
                onUpdateQty={handleUpdateQty}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                discount={discount}
                setDiscount={setDiscount}
                onCheckout={handleOpenCheckout}
                isMobileOpen={isMobileCartOpen}
                setIsMobileOpen={setIsMobileCartOpen}
              />
            </div>
          ) : activeTab === 'inventory' ? (
            <SecondaryViewPlaceholder
              title="ระบบจัดการสินค้าและสต็อก (Inventory)"
              icon={Layers}
              description="จัดการสต็อก ตรวจนับสินค้า กำหนดจุดสั่งซื้อขั้นต่ำ และพิมพ์บาร์โค้ด"
            />
          ) : activeTab === 'reports' ? (
            <SecondaryViewPlaceholder
              title="รายงานและสถิติยอดขาย (Sales Reports)"
              icon={BarChart3}
              description="กราฟสรุปยอดขายรายวัน สินค้าขายดี 10 อันดับ และกำไรขั้นต้น"
            />
          ) : activeTab === 'customers' ? (
            <SecondaryViewPlaceholder
              title="ระบบสมาชิกลูกค้า (Customer Loyalty)"
              icon={Users}
              description="สะสมแต้ม สมาชิก ประวัติการซื้อ และคูปองส่วนลดพิเศษ"
            />
          ) : (
            <SettingsView
              currentThemeId={currentThemeId}
              onSelectTheme={setCurrentThemeId}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* 4. AppFooter (Desktop only) */}
      <AppFooter />

      {/* 5. BottomNavBar (Mobile only) */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={setCurrentThemeId}
      />

      {/* Payment and Receipt Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={cartTotal}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ReceiptModal
        isOpen={!!receiptData}
        saleData={receiptData}
        onClose={() => setReceiptData(null)}
        onNewSale={handleNewSale}
      />
    </div>
  );
}
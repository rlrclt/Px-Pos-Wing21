import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Store, Package, ArrowLeft, Search, Edit2, History, Boxes, ChevronRight, ChevronLeft,
  ChevronsLeft, ChevronsRight, Layers, Box, CircleDollarSign, ArrowUpRight, Phone, User,
  Plus, List, TrendingUp, X, Filter, Table as TableIcon,
  LayoutGrid, PieChart, Trash2
} from 'lucide-react';
import type { Seller, ProductCatalog, ProductUOMConversion, DriveFolder } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';
import { CreateSellerModal } from './CreateSellerModal.tsx';
import { DeleteSellerModal } from './DeleteSellerModal.tsx';

interface SellersTabProps {
  sellers: Seller[];
  products: ProductCatalog[];
  onOpenEditProduct: (product: ProductCatalog) => void;
  onOpenDeleteProduct?: (product: ProductCatalog) => void;
  onOpenStockIn: (barcode?: string) => void;
  onOpenProductHistory?: (product: ProductCatalog) => void;
  onOpenSellerHistory?: (sellerId: string) => void;
  onCreateSeller?: (seller: Partial<Seller>) => Promise<boolean>;
  onUpdateSeller?: (sellerId: string, updates: Partial<Seller>) => Promise<boolean>;
  onDeleteSeller?: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>;
  driveFolders?: DriveFolder[];
  liveUOMs?: ProductUOMConversion[];
}

export const SellersTab: React.FC<SellersTabProps> = ({
  sellers,
  products,
  onOpenEditProduct,
  onOpenDeleteProduct,
  onOpenStockIn,
  onOpenProductHistory,
  onOpenSellerHistory,
  onCreateSeller,
  onUpdateSeller,
  onDeleteSeller,
  driveFolders = [],
  liveUOMs = []
}) => {
  const { isLight } = useTheme();
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [deletingSeller, setDeletingSeller] = useState<Seller | null>(null);

  // Drill-down states
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tiles' | 'analytics'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Compute stats for all sellers
  const sellerStats = useMemo(() => {
    const stats = sellers.map(seller => {
      const sellerProducts = products.filter(p => p.seller_id === seller.seller_id);
      const totalStock = sellerProducts.reduce((sum, p) => sum + (p.stock_qty || 0), 0);
      const totalValue = sellerProducts.reduce((sum, p) => sum + ((p.stock_qty || 0) * (p.selling_price || p.cost_price || 0)), 0);
      const totalCost = sellerProducts.reduce((sum, p) => sum + ((p.stock_qty || 0) * (p.cost_price || 0)), 0);
      const lowStockCount = sellerProducts.filter(p => (p.stock_qty || 0) > 0 && (p.stock_qty || 0) <= (p.low_stock_threshold || 10)).length;
      const outOfStockCount = sellerProducts.filter(p => (p.stock_qty || 0) <= 0).length;

      return {
        seller,
        totalProducts: sellerProducts.length,
        totalStock,
        totalValue,
        totalCost,
        lowStockCount,
        outOfStockCount,
        products: sellerProducts
      };
    });

    const unknownProducts = products.filter(p => !p.seller_id || !sellers.find(s => s.seller_id === p.seller_id));
    if (unknownProducts.length > 0) {
      const totalStock = unknownProducts.reduce((sum, p) => sum + (p.stock_qty || 0), 0);
      const totalValue = unknownProducts.reduce((sum, p) => sum + ((p.stock_qty || 0) * (p.selling_price || p.cost_price || 0)), 0);
      const totalCost = unknownProducts.reduce((sum, p) => sum + ((p.stock_qty || 0) * (p.cost_price || 0)), 0);
      const lowStockCount = unknownProducts.filter(p => (p.stock_qty || 0) > 0 && (p.stock_qty || 0) <= (p.low_stock_threshold || 10)).length;
      const outOfStockCount = unknownProducts.filter(p => (p.stock_qty || 0) <= 0).length;

      stats.push({
        seller: { seller_id: 'UNKNOWN', seller_name: 'สินค้าส่วนกลาง (ไม่ระบุผู้ฝากขาย)', contact_info: '', default_fee_pct: 0, avatar_url: '', is_active: true },
        totalProducts: unknownProducts.length,
        totalStock,
        totalValue,
        totalCost,
        lowStockCount,
        outOfStockCount,
        products: unknownProducts
      });
    }

    return stats.sort((a, b) => b.totalProducts - a.totalProducts);
  }, [sellers, products]);

  // Filtered sellers for bento grid view
  const filteredSellers = useMemo(() => {
    let result = sellerStats;
    if (sellerStatusFilter === 'active') {
      result = result.filter(s => s.seller.is_active !== false);
    } else if (sellerStatusFilter === 'inactive') {
      result = result.filter(s => s.seller.is_active === false);
    }

    if (!sellerSearch.trim()) return result;
    const q = sellerSearch.toLowerCase();
    return result.filter(s => 
      s.seller.seller_name.toLowerCase().includes(q) ||
      s.seller.seller_id.toLowerCase().includes(q) ||
      (s.seller.contact_info && s.seller.contact_info.toLowerCase().includes(q))
    );
  }, [sellerStats, sellerSearch, sellerStatusFilter]);

  const activeStat = useMemo(() => {
    if (!selectedSellerId) return null;
    return sellerStats.find(s => s.seller.seller_id === selectedSellerId) || null;
  }, [selectedSellerId, sellerStats]);

  // Categories of the active seller
  const sellerCategories = useMemo(() => {
    if (!activeStat) return ['all'];
    const cats = new Set(activeStat.products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [activeStat]);

  // Filtered products within the active seller drill-down
  const filteredProducts = useMemo(() => {
    if (!activeStat) return [];
    return activeStat.products.filter(p => {
      const q = productSearch.toLowerCase();
      const matchSearch = !q || p.product_name.toLowerCase().includes(q) || p.barcode.includes(q);
      const stock = p.stock_qty || 0;
      const threshold = p.low_stock_threshold || 10;
      
      let matchStatus = true;
      if (statusFilter === 'in-stock') matchStatus = stock > threshold;
      else if (statusFilter === 'low-stock') matchStatus = stock > 0 && stock <= threshold;
      else if (statusFilter === 'out-of-stock') matchStatus = stock <= 0;

      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [activeStat, productSearch, statusFilter, selectedCategory]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [productSearch, statusFilter, selectedCategory, itemsPerPage]);

  // Helper to extract seller name & shop subname
  const parseSellerName = (fullName: string, sellerId: string) => {
    let displayName = fullName;
    let shopSubname = sellerId === 'UNKNOWN' ? 'สินค้าส่วนกลาง' : 'ร้านค้าคู่ค้า / ผู้ฝากขาย';
    
    const match = fullName.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      displayName = match[1].trim();
      shopSubname = match[2].trim();
    }
    return { displayName, shopSubname };
  };

  // =========================================================================
  // VIEW: SELLER DRILL-DOWN / PRODUCT INVENTORY VIEW
  // =========================================================================
  if (activeStat) {
    const { displayName, shopSubname } = parseSellerName(activeStat.seller.seller_name, activeStat.seller.seller_id);
    const inStockCount = activeStat.products.filter(p => (p.stock_qty || 0) > (p.low_stock_threshold || 10)).length;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* Top Header Banner - High-fidelity Gradient matching Reference */}
        <div className="rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-[#173a4d] via-[#1a4459] to-[#26586b] text-white py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-700/30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                setSelectedSellerId(null);
                setProductSearch('');
                setStatusFilter('all');
                setSelectedCategory('all');
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white border border-white/15 transition-all select-none active:scale-[0.95] cursor-pointer shrink-0"
              title="ย้อนกลับหน้ารวมผู้ฝากขาย"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
                <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white truncate">
                  รายการสินค้าของร้าน {displayName}
                </h1>
                <span className="text-xs font-normal text-teal-100/80 hidden md:inline">
                  ({shopSubname})
                </span>
              </div>
              <p className="text-[11px] text-teal-200/70 font-mono mt-0.5">
                รหัสบัญชี: {activeStat.seller.seller_id} • ค่า GP: {((activeStat.seller.default_fee_pct || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-teal-100 shrink-0 flex-wrap">
            {activeStat.seller.seller_id !== 'UNKNOWN' && (
              <>
                <button
                  onClick={() => setEditingSeller(activeStat.seller)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-xs font-bold text-white flex items-center gap-1.5 transition select-none active:scale-[0.97] cursor-pointer shadow-xs"
                  title="แก้ไขข้อมูลผู้ฝากขายรายนี้"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>แก้ไขข้อมูล</span>
                </button>

                {activeStat.seller.seller_id !== 'S01' && (
                  <button
                    onClick={() => setDeletingSeller(activeStat.seller)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 backdrop-blur-xs font-bold text-rose-200 hover:text-white flex items-center gap-1.5 transition select-none active:scale-[0.97] cursor-pointer shadow-xs"
                    title="ลบผู้ฝากขายรายนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>ลบผู้ฝากขาย</span>
                  </button>
                )}
              </>
            )}

            {onOpenSellerHistory && (
              <button
                onClick={() => onOpenSellerHistory(activeStat.seller.seller_id)}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-xs font-bold text-white flex items-center gap-1.5 transition select-none active:scale-[0.97] cursor-pointer shadow-xs"
                title={`ดูประวัติการรับเข้าทั้งหมดของร้าน ${displayName}`}
              >
                <History className="w-3.5 h-3.5 text-teal-300" />
                <span>ประวัติรับเข้าของร้านนี้</span>
              </button>
            )}
            <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs font-mono font-bold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-teal-300" />
              <span>{activeStat.totalProducts} SKU</span>
            </span>
          </div>
        </div>

        {/* Top 4 Summary Cards (KPI Widgets) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Card 1: Seller Info */}
          <div className={`lg:col-span-4 rounded-2xl p-3 sm:p-3.5 border shadow-2xs flex items-center gap-3 transition hover:shadow-sm ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}>
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-blue-500/30 shrink-0 shadow-2xs bg-slate-100 dark:bg-[#181D2C] flex items-center justify-center">
              {activeStat.seller.avatar_url ? (
                <img
                  src={activeStat.seller.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 text-blue-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  {activeStat.seller.seller_id}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  activeStat.seller.is_active !== false 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                  {activeStat.seller.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className={`font-bold text-xs sm:text-sm truncate mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {displayName}
              </h3>
              <p className={`text-[11px] truncate flex items-center gap-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="font-mono">{activeStat.seller.contact_info || shopSubname}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Total Items */}
          <div className={`lg:col-span-3 rounded-2xl p-3 sm:p-3.5 border shadow-2xs flex items-center gap-3 transition hover:shadow-sm ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <List className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className={`text-[11px] sm:text-xs font-semibold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                รายการทั้งหมด
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-xl sm:text-2xl font-black font-mono leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {activeStat.totalProducts}
                </span>
                <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  SKU
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Stock Status */}
          <div className={`lg:col-span-3 rounded-2xl p-3 sm:p-3.5 border shadow-2xs flex items-center gap-3 transition hover:shadow-sm ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className={`text-[11px] sm:text-xs font-semibold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                สต็อกคงเหลือรวม
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black font-mono leading-tight text-teal-500">
                  {activeStat.totalStock.toLocaleString()}
                </span>
                <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ชิ้น
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono">
                {activeStat.lowStockCount > 0 && (
                  <span className="text-amber-500 font-semibold">เตือน {activeStat.lowStockCount}</span>
                )}
                {activeStat.outOfStockCount > 0 && (
                  <span className="text-rose-500 font-semibold">หมด {activeStat.outOfStockCount}</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Inventory Valuation */}
          <div className={`lg:col-span-2 rounded-2xl p-3 sm:p-3.5 border shadow-2xs flex items-center gap-2.5 transition hover:shadow-sm ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] sm:text-xs font-semibold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                มูลค่าขายรวม
              </span>
              <span className="text-xs sm:text-sm font-black font-mono text-emerald-500 leading-tight block truncate mt-0.5">
                ฿{activeStat.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Main Control Panel (Actions, Filters, Search & View Switcher) */}
        <div className={`rounded-2xl border p-3 sm:p-4 shadow-sm space-y-3 ${
          isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenStockIn()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>รับของเข้าสต็อก</span>
              </button>
            </div>

            {/* Right: Search, Filter Dropdowns & View Mode */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64 md:w-72">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด..."
                  className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    isLight 
                      ? 'bg-slate-50 hover:bg-slate-100/70 focus:bg-white border-slate-300/80 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500' 
                      : 'bg-[#181D2C] hover:bg-[#1E2436] focus:bg-[#181D2C] border-[#252B3B] text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={`pl-3 pr-8 py-2 rounded-xl border text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLight 
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-300/80 text-slate-700' 
                      : 'bg-[#181D2C] hover:bg-[#1E2436] border-[#252B3B] text-slate-200'
                  }`}
                >
                  <option value="all">กรองสถานะ (ทั้งหมด)</option>
                  <option value="in-stock">สต็อกปกติ (พร้อมขาย)</option>
                  <option value="low-stock">สต็อกใกล้หมด (≤ จุดเตือน)</option>
                  <option value="out-of-stock">สินค้าหมดสต็อก (0)</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Switcher (Table / Tiles / Analytics) */}
              <div className={`flex items-center p-1 rounded-xl border text-xs ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
              }`}>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                  title="มุมมองตารางมาตรฐาน"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">ตาราง</span>
                </button>
                <button
                  onClick={() => setViewMode('tiles')}
                  className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'tiles'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                  title="มุมมองแผ่นป้ายรูปภาพ (Tiles)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">แผ่นป้าย</span>
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'analytics'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                  title="มุมมองวิเคราะห์สถิติ (Analytics)"
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">วิเคราะห์</span>
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Category Pills */}
          {sellerCategories.length > 2 && (
            <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-2 border-t ${
              isLight ? 'border-slate-100' : 'border-[#252B3B]'
            }`}>
              <span className={`text-[11px] font-medium mr-1 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                หมวดหมู่:
              </span>
              {sellerCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition text-xs font-semibold cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-[#181D2C] text-slate-300 hover:bg-[#202738] border border-[#252B3B]'
                  }`}
                >
                  {cat === 'all' ? 'ทั้งหมด' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: Table View                                                   */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                {/* Header matching Reference */}
                <thead className="bg-[#173a4d] text-white text-xs font-semibold select-none">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">รูปภาพ</th>
                    <th className="py-3 px-4">
                      บาร์โค้ด
                      <span className="block text-[10px] font-normal text-teal-100/70">Barcode</span>
                    </th>
                    <th className="py-3 px-4">
                      ชื่อสินค้า
                      <span className="block text-[10px] font-normal text-teal-100/70">Product Name</span>
                    </th>
                    <th className="py-3 px-4 text-center">
                      คงเหลือในคลัง
                      <span className="block text-[10px] font-normal text-teal-100/70">In-Stock</span>
                    </th>
                    <th className="py-3 px-4 text-right">
                      ราคาทุน
                      <span className="block text-[10px] font-normal text-teal-100/70">Cost Price</span>
                    </th>
                    <th className="py-3 px-4 text-right">
                      ราคาขาย
                      <span className="block text-[10px] font-normal text-teal-100/70">Selling Price</span>
                    </th>
                    <th className="py-3 px-4 text-center w-40">การจัดการ</th>
                  </tr>
                </thead>

                <tbody className={`divide-y text-xs ${
                  isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#252B3B] text-slate-300'
                }`}>
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                        <p className="font-semibold">ไม่พบรายการสินค้าที่ค้นหา</p>
                        <p className="text-xs text-slate-500 mt-0.5">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p, idx) => {
                      const stock = p.stock_qty || 0;
                      const threshold = p.low_stock_threshold || 10;
                      const isOutOfStock = stock <= 0;
                      const isLowStock = stock > 0 && stock <= threshold;

                      return (
                        <tr
                          key={p.barcode}
                          className={`transition ${
                            isLight 
                              ? idx % 2 === 1 ? 'bg-slate-50/50 hover:bg-blue-50/40' : 'bg-white hover:bg-blue-50/40'
                              : idx % 2 === 1 ? 'bg-[#161B28] hover:bg-[#1A2132]' : 'bg-[#141824] hover:bg-[#1A2132]'
                          }`}
                        >
                          {/* Image */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#181D2C] border border-slate-200 dark:border-[#252B3B] mx-auto shadow-2xs flex items-center justify-center">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.product_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </td>

                          {/* Barcode Column: Explicit Single vs Pack */}
                          <td className="py-2.5 px-4">
                            <div className="flex flex-col gap-1">
                              {/* บาร์โค้ดชิ้น */}
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  ชิ้น
                                </span>
                                <span className="font-bold text-blue-500">
                                  {p.barcode}
                                </span>
                              </div>

                              {/* บาร์โค้ดแพ็ค/ลัง */}
                              {liveUOMs.filter(u => u.base_barcode === p.barcode && u.is_active !== false).map(uom => (
                                <div key={uom.barcode} className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    {uom.unit_name}
                                  </span>
                                  <span>{uom.barcode}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Product Name & Category & UOM Breakdown */}
                          <td className="py-2.5 px-4">
                            <div className={`font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {p.product_name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                {p.category || 'ทั่วไป'}
                              </span>
                              {/* Linked UOM pack badges with clear pricing */}
                              {liveUOMs.filter(u => u.base_barcode === p.barcode && u.is_active !== false).map(uom => (
                                <span
                                  key={uom.barcode}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400"
                                  title={`บาร์โค้ดแพ็ค: ${uom.barcode} (1 ${uom.unit_name} = ${uom.conversion_factor} ${p.unit_name || 'ชิ้น'})`}
                                >
                                  <Boxes className="w-3 h-3 text-indigo-500" />
                                  <span>{uom.unit_name}: ฿{(Number(uom.selling_price) || 0).toFixed(2)}</span>
                                  <span className="opacity-75">({uom.conversion_factor} {p.unit_name || 'ชิ้น'})</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Stock Quantity Badge with Multi-Unit Breakdown */}
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-block font-mono font-bold px-2.5 py-0.5 rounded-lg text-xs border ${
                                  isOutOfStock
                                    ? isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-950/50 text-rose-300 border-rose-800/50'
                                    : isLowStock
                                    ? isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/50 text-amber-300 border-amber-800/50'
                                    : isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                                }`}
                              >
                                {stock.toLocaleString()} {p.unit_name || 'ชิ้น'}
                              </span>

                              {/* Multi-Unit Pack Conversion Stock Breakdown */}
                              {liveUOMs.filter(u => u.base_barcode === p.barcode && u.is_active !== false).map(uom => {
                                const factor = Number(uom.conversion_factor) || 1;
                                const packs = Math.floor(stock / factor);
                                const remainder = stock % factor;
                                return (
                                  <span
                                    key={uom.barcode}
                                    className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                                    title={`1 ${uom.unit_name} = ${factor} ${p.unit_name || 'ชิ้น'}`}
                                  >
                                    <span>📦 {packs} {uom.unit_name}</span>
                                    {remainder > 0 && (
                                      <span className="text-slate-500 dark:text-slate-400 font-sans text-[9px] font-normal">
                                        +{remainder} {p.unit_name || 'ชิ้น'}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Cost Price */}
                          <td className={`py-2.5 px-4 text-right font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            ฿{(p.cost_price || 0).toFixed(2)}
                          </td>

                          {/* Selling Price */}
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-500 font-mono">
                            ฿{(p.selling_price || 0).toFixed(2)}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenProductHistory && (
                                <button
                                  onClick={() => onOpenProductHistory(p)}
                                  className={`p-1.5 px-2 rounded-lg border text-xs transition min-h-[30px] flex items-center gap-1 cursor-pointer ${
                                    isLight 
                                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' 
                                      : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                                  }`}
                                  title="ดูประวัติการรับเข้า"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">ประวัติ</span>
                                </button>
                              )}

                              <button
                                onClick={() => onOpenStockIn(p.barcode)}
                                className={`p-1.5 px-2 rounded-lg border text-xs transition min-h-[30px] flex items-center gap-1 cursor-pointer ${
                                  isLight 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                                }`}
                                title="รับของเข้าสต็อก"
                              >
                                <Boxes className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">สต็อก</span>
                              </button>

                              <button
                                onClick={() => onOpenEditProduct(p)}
                                className={`p-1.5 px-2 rounded-lg border text-xs transition min-h-[30px] flex items-center gap-1 cursor-pointer ${
                                  isLight 
                                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                                    : 'bg-[#181D2C] hover:bg-[#202738] border-[#252B3B] text-slate-300'
                                }`}
                                title="แก้ไขข้อมูลสินค้า"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">แก้ไข</span>
                              </button>

                              {onOpenDeleteProduct && (
                                <button
                                  onClick={() => onOpenDeleteProduct(p)}
                                  className={`p-1.5 px-2 rounded-lg border text-xs transition min-h-[30px] flex items-center gap-1 cursor-pointer ${
                                    isLight 
                                      ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600' 
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                                  }`}
                                  title="ลบหรือระงับการขายสินค้านี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls matching Reference */}
            <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50/50 border-slate-200/90' : 'bg-[#161B28] border-[#252B3B]'
            }`}>
              <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                แสดง {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} จากทั้งหมด{' '}
                <strong className={isLight ? 'text-slate-900' : 'text-white'}>{filteredProducts.length}</strong> รายการ
              </div>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100' 
                      : 'border-[#252B3B] bg-[#181D2C] text-slate-300 hover:bg-[#202738]'
                  }`}
                  title="หน้าแรก"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100' 
                      : 'border-[#252B3B] bg-[#181D2C] text-slate-300 hover:bg-[#202738]'
                  }`}
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : isLight
                        ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-[#181D2C] border border-[#252B3B] text-slate-300 hover:bg-[#202738]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100' 
                      : 'border-[#252B3B] bg-[#181D2C] text-slate-300 hover:bg-[#202738]'
                  }`}
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100' 
                      : 'border-[#252B3B] bg-[#181D2C] text-slate-300 hover:bg-[#202738]'
                  }`}
                  title="หน้าสุดท้าย"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Items Per Page Selector */}
              <div className={`hidden sm:flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>แสดงหน้าละ:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className={`border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-700' 
                      : 'bg-[#181D2C] border-[#252B3B] text-slate-200'
                  }`}
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: Tiles View                                                  */}
        {/* ========================================================================= */}
        {viewMode === 'tiles' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {paginatedProducts.map((p) => {
              const stock = p.stock_qty || 0;
              const threshold = p.low_stock_threshold || 10;
              const productUOMs = liveUOMs.filter((u) => u.base_barcode === p.barcode);
              return (
                <motion.div
                  key={p.barcode}
                  whileHover={{ y: -3 }}
                  className={`rounded-2xl border p-3 shadow-2xs flex flex-col justify-between transition ${
                    isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
                  }`}
                >
                  <div>
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-[#181D2C] border border-slate-200 dark:border-[#252B3B] mb-2 relative group flex items-center justify-center">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-400" />
                      )}
                      <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-0.5">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shadow-xs ${
                            stock === 0
                              ? 'bg-rose-600 text-white'
                              : stock <= threshold
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {stock} {p.unit_name || 'ชิ้น'}
                        </span>
                        {productUOMs.map((uom, idx) => {
                          const factor = Number(uom.conversion_factor) || 1;
                          const packs = Math.floor(stock / factor);
                          const remainder = stock % factor;
                          return (
                            <span
                              key={idx}
                              className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500/90 text-white shadow-xs flex items-center gap-0.5"
                              title={`1 ${uom.unit_name} = ${factor} ${p.unit_name || 'ชิ้น'}`}
                            >
                              <span>{packs} {uom.unit_name || 'แพ็ค'}</span>
                              {remainder > 0 && <span className="opacity-80">+{remainder}</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <h4 className={`font-bold text-xs line-clamp-2 leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {p.product_name}
                    </h4>
                    
                    {/* Barcodes breakdown: Single vs Pack */}
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">ชิ้น</span>
                        <span className="font-mono text-[10px] text-blue-500 font-bold truncate">{p.barcode}</span>
                      </div>
                      {productUOMs.length > 0 && (
                        <div className="space-y-0.5">
                          {productUOMs.map((uom, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[9px] text-amber-500 dark:text-amber-400 font-mono">
                              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">{uom.unit_name || 'แพ็ค'}</span>
                              <span className="truncate">{uom.barcode}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`mt-3 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-[#252B3B]'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-[10px] block ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>ราคาขาย</span>
                        <span className="font-bold text-xs text-emerald-500 font-mono">฿{(p.selling_price || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenStockIn(p.barcode)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          title="รับเข้าสต็อก"
                        >
                          <Boxes className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onOpenEditProduct(p)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {onOpenDeleteProduct && (
                          <button
                            onClick={() => onOpenDeleteProduct(p)}
                            className={`p-1.5 rounded-lg text-[10px] font-bold cursor-pointer border ${
                              isLight 
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200' 
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                            }`}
                            title="ลบหรือระงับการขาย"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 3: Analytics View                                              */}
        {/* ========================================================================= */}
        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Metrics & Valuation */}
            <div className="lg:col-span-5 space-y-3">
              <div className={`rounded-2xl p-4 border shadow-2xs ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
              }`}>
                <h3 className={`font-bold text-sm flex items-center gap-2 mb-3 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>มูลค่าและสรุปสินค้าคงคลัง</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className={`flex justify-between pb-2 border-b ${isLight ? 'border-slate-100' : 'border-[#252B3B]'}`}>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>มูลค่าราคาทุนรวม:</span>
                    <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      ฿{activeStat.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className={`flex justify-between pb-2 border-b ${isLight ? 'border-slate-100' : 'border-[#252B3B]'}`}>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>มูลค่าราคาขายรวม:</span>
                    <strong className="font-mono text-emerald-500">
                      ฿{activeStat.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className={`flex justify-between pb-2 border-b ${isLight ? 'border-slate-100' : 'border-[#252B3B]'}`}>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>ส่วนต่างกำไรขั้นต้น (Est. Margin):</span>
                    <strong className="font-mono text-blue-500">
                      ฿{(activeStat.totalValue - activeStat.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>จำนวนหน่วยในคลังทั้งหมด:</span>
                    <strong className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {activeStat.totalStock.toLocaleString()} ชิ้น
                    </strong>
                  </div>
                </div>
              </div>

              {/* Stock Health Widget */}
              <div className={`rounded-2xl p-4 border shadow-2xs ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
              }`}>
                <h4 className={`text-xs font-bold mb-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  สุขภาพสต็อกสินค้า (Stock Health)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  }`}>
                    <span className="text-[10px] block font-semibold">ปกติ</span>
                    <span className="text-base font-black font-mono">{inStockCount}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-amber-50/70 border-amber-200 text-amber-800' : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                  }`}>
                    <span className="text-[10px] block font-semibold">ใกล้หมด</span>
                    <span className="text-base font-black font-mono">{activeStat.lowStockCount}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-rose-50/70 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] block font-semibold">หมด</span>
                    <span className="text-base font-black font-mono">{activeStat.outOfStockCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Category Distribution */}
            <div className={`lg:col-span-7 rounded-2xl p-4 border shadow-2xs ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
            }`}>
              <h3 className={`font-bold text-sm mb-3 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                การกระจายตามหมวดหมู่ (Category Breakdown)
              </h3>
              <div className="space-y-2.5">
                {sellerCategories.filter(c => c !== 'all').map(cat => {
                  const catProducts = activeStat.products.filter(p => p.category === cat);
                  const catUnits = catProducts.reduce((sum, p) => sum + (p.stock_qty || 0), 0);
                  const pct = activeStat.totalStock > 0 ? (catUnits / activeStat.totalStock) * 100 : 0;
                  
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{cat || 'ทั่วไป'}</span>
                        <span className="font-mono text-slate-500">{catUnits.toLocaleString()} ชิ้น ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#181D2C]'}`}>
                        <div 
                          className="h-full rounded-full bg-blue-500 transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // =========================================================================
  // VIEW: OVERVIEW CONSIGNMENT SELLERS BENTO GRID
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <AdminSectionHeader
            title="บัญชีผู้ฝากขาย (Consignment Sellers)"
            description="จัดการรายชื่อผู้ฝากขาย ติดตามยอดสต็อก และแยกประเภทสินค้าตามเจ้าของ"
            icon={Store}
            badge={`${sellerStats.length} บัญชี`}
          />

          {/* Quick Search & Filter & Add Seller */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter Dropdown */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
            }`}>
              <Filter className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <select
                value={sellerStatusFilter}
                onChange={(e) => setSellerStatusFilter(e.target.value as any)}
                className={`bg-transparent font-bold text-xs focus:outline-none cursor-pointer ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}
              >
                <option value="all" className={isLight ? 'bg-white text-slate-900' : 'bg-[#181D2C] text-white'}>ทุกสถานะ</option>
                <option value="active" className={isLight ? 'bg-white text-slate-900' : 'bg-[#181D2C] text-white'}>🟢 เปิดใช้งาน (Active)</option>
                <option value="inactive" className={isLight ? 'bg-white text-slate-900' : 'bg-[#181D2C] text-white'}>⚪ ปิดใช้งาน (Inactive)</option>
              </select>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder="ค้นหาชื่อผู้ฝากขาย หรือรหัส..."
                className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none transition ${
                  isLight 
                    ? 'bg-slate-50 hover:bg-slate-100/70 focus:bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500' 
                    : 'bg-[#181D2C] hover:bg-[#1E2436] focus:bg-[#181D2C] border-[#252B3B] text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {sellerSearch && (
                <button
                  onClick={() => setSellerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* + Add Seller Button */}
            {onCreateSeller && (
              <button
                onClick={() => {
                  setEditingSeller(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all select-none active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มผู้ฝากขาย</span>
              </button>
            )}
          </div>
        </div>

        {/* 🌟 Refined Modern Bento Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
          {filteredSellers.map(stat => {
            const s = stat.seller;
            const { displayName, shopSubname } = parseSellerName(s.seller_name, s.seller_id);

            return (
              <motion.div 
                key={s.seller_id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className={`rounded-2xl border p-4 shadow-md transition-all duration-200 flex flex-col sm:flex-row gap-3.5 ${
                  isLight 
                    ? 'border-slate-200/90 bg-white text-slate-800 hover:shadow-lg hover:border-blue-300' 
                    : 'border-[#252C3D] bg-[#141824] text-slate-100 hover:border-blue-500/40'
                }`}
              >
                {/* ฝั่งซ้าย: Profile Box */}
                <div className={`w-full sm:w-40 shrink-0 rounded-xl p-3 border flex flex-col items-center justify-center text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
                }`}>
                  {s.avatar_url ? (
                    <img
                      src={s.avatar_url}
                      alt={displayName}
                      className="w-16 h-16 rounded-xl object-cover border border-blue-500/30 shadow-xs mb-2 ring-2 ring-blue-500/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold mb-2">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                  
                  <span className="text-[11px] font-mono font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded mb-1">
                    {s.seller_id}
                  </span>
                  
                  <p className={`text-[10px] font-medium flex items-center justify-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="font-mono">{s.contact_info || '-'}</span>
                  </p>
                </div>

                {/* ฝั่งขวา: 3 ชั้น สเกลขนาดพอดีตา */}
                <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
                  
                  {/* ชั้น 1: Header ร้านค้า & สถานะ + ปุ่มจัดการ (แก้ไข, ลบ) */}
                  <div className={`px-3 py-2 rounded-xl border flex justify-between items-center ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
                  }`}>
                    <div className="min-w-0 pr-2">
                      <h3 className={`text-sm font-bold truncate leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {displayName}
                      </h3>
                      <p className={`text-[11px] truncate font-medium mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {shopSubname}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        s.is_active !== false 
                          ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                          : isLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {s.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>

                  {/* ชั้น 2: สถิติ SKU & จำนวนชิ้น */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
                    }`}>
                      <div>
                        <span className={`text-[10px] font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          รายการสินค้า
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black font-mono text-indigo-500">
                            {stat.totalProducts}
                          </span>
                          <span className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            SKU
                          </span>
                        </div>
                      </div>
                      <Layers className="w-4 h-4 text-indigo-500/70" />
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
                    }`}>
                      <div>
                        <span className={`text-[10px] font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          จำนวนทั้งหมด
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black font-mono text-sky-500">
                            {stat.totalStock.toLocaleString()}
                          </span>
                          <span className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            ชิ้น
                          </span>
                        </div>
                      </div>
                      <Box className="w-4 h-4 text-sky-500/70" />
                    </div>
                  </div>

                  {/* ชั้น 3: มูลค่ารวม & ปุ่ม Action */}
                  <div className={`px-3 py-2 rounded-xl border flex justify-between items-center ${
                    isLight 
                      ? 'border-blue-200 bg-gradient-to-r from-blue-50/70 to-slate-50' 
                      : 'border-blue-500/25 bg-gradient-to-r from-blue-950/30 to-[#181D2C]'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CircleDollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-blue-500 block leading-tight">
                          มูลค่ารวมสินค้า
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-emerald-500">
                          ฿{stat.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenSellerHistory && (
                        <button
                          onClick={() => onOpenSellerHistory(s.seller_id)}
                          className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all select-none active:scale-[0.97] cursor-pointer ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              : 'bg-[#181D2C] hover:bg-[#202738] border-[#252B3B] text-slate-300'
                          }`}
                          title={`ดูประวัติการรับเข้าทั้งหมดของ ${displayName}`}
                        >
                          <History className="w-3.5 h-3.5 text-blue-500" />
                          <span className="hidden sm:inline">ประวัติ</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedSellerId(s.seller_id)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all select-none active:scale-[0.97] cursor-pointer"
                      >
                        <span>ตรวจนับ</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Seller Modal */}
      <CreateSellerModal
        isOpen={isCreateModalOpen || !!editingSeller}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSeller(null);
        }}
        onSave={async (payload) => {
          if (editingSeller && onUpdateSeller) {
            return await onUpdateSeller(editingSeller.seller_id, payload);
          } else if (onCreateSeller) {
            return await onCreateSeller(payload);
          }
          return false;
        }}
        initialData={editingSeller}
        existingSellers={sellers}
        driveFolders={driveFolders}
      />

      {/* Delete Seller Safety Modal */}
      <DeleteSellerModal
        isOpen={!!deletingSeller}
        onClose={() => setDeletingSeller(null)}
        onConfirmDelete={async (sellerId, cascade) => {
          if (onDeleteSeller) {
            const ok = await onDeleteSeller(sellerId, cascade);
            if (ok && selectedSellerId === sellerId) {
              setSelectedSellerId(null);
            }
            return ok;
          }
          return false;
        }}
        seller={deletingSeller}
        linkedProducts={deletingSeller ? (sellerStats.find(s => s.seller.seller_id === deletingSeller.seller_id)?.products || []) : []}
      />
    </div>
  );
};


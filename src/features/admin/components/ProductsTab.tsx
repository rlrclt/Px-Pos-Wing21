import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Package,
  Plus,
  Upload,
  Download,
  Search,
  Edit2,
  RefreshCw,
  Boxes,
  History,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  PieChart,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import type { ProductCatalog, ProductUOMConversion } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';

interface ProductsTabProps {
  products: ProductCatalog[];
  isLoading: boolean;
  productSearch: string;
  onSearchChange: (search: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: ProductCatalog) => void;
  onOpenDeleteProduct?: (product: ProductCatalog) => void;
  onOpenStockIn: (barcode?: string) => void;
  onOpenImportHub: () => void;
  onOpenDownloadTemplate: () => void;
  onOpenStockInHistory?: () => void;
  onOpenProductHistory?: (product: ProductCatalog) => void;
  liveUOMs?: ProductUOMConversion[];
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  isLoading,
  productSearch,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  onOpenAddProduct,
  onOpenEditProduct,
  onOpenDeleteProduct,
  onOpenStockIn,
  onOpenImportHub,
  onOpenDownloadTemplate,
  onOpenStockInHistory,
  onOpenProductHistory,
  liveUOMs = []
}) => {
  const { isLight } = useTheme();

  // Local UI States
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tiles' | 'analytics'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Category List
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  }, [products]);

  // Overall Inventory Stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active !== false).length;
    const inactiveProducts = totalProducts - activeProducts;

    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock_qty) || 0), 0);
    const totalSellingValuation = products.reduce((sum, p) => sum + ((Number(p.stock_qty) || 0) * (Number(p.selling_price) || 0)), 0);
    const totalCostValuation = products.reduce((sum, p) => sum + ((Number(p.stock_qty) || 0) * (Number(p.cost_price) || 0)), 0);

    const outOfStockCount = products.filter(p => (Number(p.stock_qty) || 0) <= 0).length;
    const lowStockCount = products.filter(p => {
      const stock = Number(p.stock_qty) || 0;
      const threshold = Number(p.low_stock_threshold) || 10;
      return stock > 0 && stock <= threshold;
    }).length;
    const inStockCount = totalProducts - outOfStockCount - lowStockCount;

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalStock,
      totalSellingValuation,
      totalCostValuation,
      outOfStockCount,
      lowStockCount,
      inStockCount,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchSearch =
        !productSearch ||
        p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch) ||
        (p.seller_id && p.seller_id.toLowerCase().includes(productSearch.toLowerCase()));

      const stock = Number(p.stock_qty) || 0;
      const threshold = Number(p.low_stock_threshold) || 10;

      let matchStatus = true;
      if (statusFilter === 'in-stock') matchStatus = stock > threshold;
      if (statusFilter === 'low-stock') matchStatus = stock > 0 && stock <= threshold;
      if (statusFilter === 'out-of-stock') matchStatus = stock <= 0;

      return matchCat && matchSearch && matchStatus;
    });
  }, [products, categoryFilter, productSearch, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Top Bento KPI Overview (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total SKUs */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-[11px] sm:text-xs font-bold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              รายการสินค้าทั้งหมด
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {stats.totalProducts}
              </span>
              <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                SKU
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              พร้อมขาย {stats.activeProducts} • ระงับ {stats.inactiveProducts}
            </div>
          </div>
        </motion.div>

        {/* Card 2: Total Units in Stock */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-[11px] sm:text-xs font-bold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              สต็อกคงเหลือรวม
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {stats.totalStock.toLocaleString()}
              </span>
              <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ชิ้น / หน่วย
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              เฉลี่ย {(stats.totalStock / Math.max(1, stats.totalProducts)).toFixed(0)} ชิ้น / รายการ
            </div>
          </div>
        </motion.div>

        {/* Card 3: Inventory Valuation */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-[11px] sm:text-xs font-bold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              มูลค่าสินค้าคงคลัง
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
                ฿{stats.totalSellingValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              ทุนรวม ฿{stats.totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </motion.div>

        {/* Card 4: Health & Stock Alerts */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all ${
            isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            stats.outOfStockCount > 0
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
              : stats.lowStockCount > 0
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
          }`}>
            {stats.outOfStockCount > 0 ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-[11px] sm:text-xs font-bold block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              สถานะความพร้อมขาย
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 font-mono font-black text-base sm:text-lg">
              {stats.outOfStockCount > 0 && (
                <span className="text-rose-500">{stats.outOfStockCount} หมด</span>
              )}
              {stats.outOfStockCount > 0 && stats.lowStockCount > 0 && <span className="text-slate-400">•</span>}
              {stats.lowStockCount > 0 && (
                <span className="text-amber-500">{stats.lowStockCount} ใกล้หมด</span>
              )}
              {stats.outOfStockCount === 0 && stats.lowStockCount === 0 && (
                <span className="text-emerald-500">สต็อกพร้อมขาย 100%</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              ปกติ {stats.inStockCount} รายการ
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Main Workspace Card ── */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <AdminSectionHeader
          title="คลังสินค้า & แคตตาล็อก (Product Catalog)"
          description="จัดการรายการสินค้า ราคาทุน/ราคาขาย แปลงหน่วยนับ UOM และตรวจสอบสต็อกคงเหลือ"
          icon={Package}
          badge={`${products.length} รายการ`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenDownloadTemplate}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.98] min-h-[38px] ${
                  isLight 
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                    : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                }`}
                title="ดาวน์โหลดไฟล์แม่แบบ Excel/CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">โหลดเทมเพลต</span>
              </button>

              <button
                onClick={onOpenImportHub}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.98] min-h-[38px] ${
                  isLight 
                    ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' 
                    : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400'
                }`}
                title="นำเข้าข้อมูลสินค้าผ่าน Excel / CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ศูนย์นำเข้า (Import)</span>
              </button>

              <button
                onClick={() => onOpenStockIn()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs select-none active:scale-[0.98] min-h-[38px]"
                title="บันทึกรับของเข้าคลัง"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>📥 รับของเข้าสต็อก</span>
              </button>

              {onOpenStockInHistory && (
                <button
                  onClick={onOpenStockInHistory}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none active:scale-[0.98] min-h-[38px] ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                  }`}
                  title="ดูประวัติการรับเข้าสต็อกทั้งหมดในระบบ"
                >
                  <History className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">ประวัติรับเข้า</span>
                </button>
              )}

              <button
                onClick={onOpenAddProduct}
                className="px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 select-none active:scale-[0.98] min-h-[38px]"
                title="สร้างรายการสินค้าใหม่"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มสินค้าใหม่</span>
              </button>
            </div>
          }
        />

        {/* ── Control Panel (Search, Filters, View Switcher & Category Pills) ── */}
        <div className={`mt-5 rounded-2xl border p-3 sm:p-4 shadow-2xs space-y-3 ${
          isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141824] border-[#252C3D]'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด..."
                  className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    isLight 
                      ? 'bg-white hover:bg-slate-100/70 focus:bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500' 
                      : 'bg-[#181D2C] hover:bg-[#1E2436] focus:bg-[#181D2C] border-[#252B3B] text-slate-200 placeholder-slate-500 focus:border-blue-500'
                  }`}
                />
                {productSearch && (
                  <button
                    onClick={() => {
                      onSearchChange('');
                      setCurrentPage(1);
                    }}
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
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className={`pl-3 pr-8 py-2 rounded-xl border text-xs font-bold appearance-none cursor-pointer focus:outline-none ${
                    isLight 
                      ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700' 
                      : 'bg-[#181D2C] hover:bg-[#1E2436] border-[#252B3B] text-slate-200'
                  }`}
                >
                  <option value="all">สถานะสต็อก: ทั้งหมด</option>
                  <option value="in-stock">🟢 สต็อกปกติ (พร้อมขาย)</option>
                  <option value="low-stock">🟡 สต็อกใกล้หมด (≤ จุดเตือน)</option>
                  <option value="out-of-stock">🔴 สินค้าหมดสต็อก (0)</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className={`flex items-center p-1 rounded-xl border text-xs self-start lg:self-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
            }`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer select-none active:scale-[0.97] ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองตารางมาตรฐาน"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode('tiles')}
                className={`p-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer select-none active:scale-[0.97] ${
                  viewMode === 'tiles'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองแผ่นป้ายรูปภาพ (Tiles)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>แผ่นป้าย</span>
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer select-none active:scale-[0.97] ${
                  viewMode === 'analytics'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองวิเคราะห์สถิติ (Analytics)"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>วิเคราะห์</span>
              </button>
            </div>
          </div>

          {/* Horizontal Category Filter Pills */}
          <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-2 border-t ${
            isLight ? 'border-slate-200' : 'border-[#252B3B]'
          }`}>
            <span className={`text-[11px] font-bold mr-1 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              หมวดหมู่:
            </span>
            <button
              onClick={() => {
                onCategoryFilterChange('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition text-xs font-bold cursor-pointer select-none active:scale-[0.97] ${
                categoryFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : isLight
                  ? 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  : 'bg-[#181D2C] text-slate-300 hover:bg-[#202738] border border-[#252B3B]'
              }`}
            >
              ทั้งหมด ({products.length})
            </button>
            {uniqueCategories.map((cat) => {
              const count = products.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    onCategoryFilterChange(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition text-xs font-bold cursor-pointer select-none active:scale-[0.97] ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isLight
                      ? 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      : 'bg-[#181D2C] text-slate-300 hover:bg-[#202738] border border-[#252B3B]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── VIEW 1: Table View ── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto mt-4 rounded-2xl border border-slate-200 dark:border-[#252B3B] shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] uppercase tracking-wider border-b ${
                isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#161B28] text-slate-400 border-[#252B3B]'
              }`}>
                <tr>
                  <th className="py-3 px-3.5 font-bold">บาร์โค้ด & รหัส</th>
                  <th className="py-3 px-3.5 font-bold">สินค้า</th>
                  <th className="py-3 px-3.5 font-bold">หมวดหมู่</th>
                  <th className="py-3 px-3.5 font-bold text-center">คงเหลือในคลัง</th>
                  <th className="py-3 px-3.5 font-bold text-right">ราคาทุน</th>
                  <th className="py-3 px-3.5 font-bold text-right">ราคาขาย</th>
                  <th className="py-3 px-3.5 font-bold">หน่วยนับ & แพ็ค/ลัง (Multi-UOM)</th>
                  <th className="py-3 px-3.5 font-bold text-center">สถานะ</th>
                  <th className="py-3 px-3.5 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#252B3B] text-slate-300'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                      <RefreshCw className="w-7 h-7 mx-auto animate-spin mb-2 text-blue-500" />
                      กำลังโหลดข้อมูลสินค้า...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500 text-xs">
                      ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => {
                    const isLegacyPack = !!(product.parent_barcode || (product.conversion_factor && product.conversion_factor > 1));
                    const linkedUoms = liveUOMs.filter(u => u.base_barcode === product.barcode && u.is_active !== false);
                    const currentStock = Number(product.stock_qty) || 0;
                    const threshold = Number(product.low_stock_threshold) || 10;
                    const isOutOfStock = currentStock <= 0;
                    const isLowStock = currentStock > 0 && currentStock <= threshold;

                    return (
                      <tr key={product.barcode} className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181D2C]/60'
                      }`}>
                        {/* Barcode Column */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                ชิ้น
                              </span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {product.barcode}
                              </span>
                            </div>
                            {linkedUoms.map(uom => (
                              <div key={uom.barcode} className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                  {uom.unit_name}
                                </span>
                                <span>{uom.barcode}</span>
                              </div>
                            ))}
                            {isLegacyPack && (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                  แพ็ค
                                </span>
                                <span>{product.parent_barcode || product.barcode}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Product Name & Thumbnail */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.product_name}
                                className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-[#252B3B] shrink-0 shadow-2xs"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-[#181D2C] border-[#252B3B] text-slate-500'
                              }`}>
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className={`font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {product.product_name}
                              </div>
                              {product.seller_id && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  ผู้ฝากขาย: {product.seller_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#181D2C] text-slate-300 border border-[#252B3B]'
                          }`}>
                            {product.category || 'ทั่วไป'}
                          </span>
                        </td>

                        {/* Stock Balance with Multi-UOM Breakdown */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-lg text-xs ${
                              isOutOfStock
                                ? isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
                                : isLowStock
                                ? isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-950/50 text-amber-300 border border-amber-800/50'
                                : isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
                            }`}>
                              {currentStock.toLocaleString()} {product.unit_name || 'ชิ้น'}
                            </span>

                            {/* Multi-Unit Pack Conversion Stock Equivalent */}
                            {linkedUoms.length > 0 && (
                              <div className="flex flex-col items-center gap-0.5">
                                {linkedUoms.map((uom) => {
                                  const factor = Number(uom.conversion_factor) || 1;
                                  const packs = Math.floor(currentStock / factor);
                                  const remainder = currentStock % factor;
                                  return (
                                    <span
                                      key={uom.barcode}
                                      className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                                      title={`1 ${uom.unit_name} = ${factor} ${product.unit_name || 'ชิ้น'}`}
                                    >
                                      <span>📦 {packs} {uom.unit_name}</span>
                                      {remainder > 0 && (
                                        <span className="text-slate-500 dark:text-slate-400 font-sans text-[9px] font-normal">
                                          +{remainder} {product.unit_name || 'ชิ้น'}
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Cost Price */}
                        <td className={`py-3 px-3.5 text-right font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          ฿{(Number(product.cost_price) || 0).toFixed(2)}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-500 text-sm">
                          ฿{(Number(product.selling_price) || 0).toFixed(2)}
                        </td>

                        {/* UOM Breakdown Column */}
                        <td className="py-3 px-3.5">
                          {isLegacyPack ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                              📦 บาร์โค้ดแพ็ค ({product.conversion_factor} {product.unit_name || 'ชิ้น'} ➜ {product.parent_barcode})
                            </span>
                          ) : linkedUoms.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span>ชิ้นเดี่ยว: 1 {product.unit_name || 'ชิ้น'} (฿{(Number(product.selling_price) || 0).toFixed(2)})</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                {linkedUoms.map(uom => (
                                  <div 
                                    key={uom.barcode}
                                    className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-1 font-bold">
                                      <Boxes className="w-3 h-3 text-indigo-500 shrink-0" />
                                      <span>{uom.unit_name}:</span>
                                      <span className="font-mono text-slate-900 dark:text-white">{uom.barcode}</span>
                                    </div>
                                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                      ฿{(Number(uom.selling_price) || 0).toFixed(2)} ({uom.conversion_factor} {product.unit_name || 'ชิ้น'})
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>หน่วยเดี่ยว (1 {product.unit_name || 'ชิ้น'})</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.is_active !== false 
                              ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {product.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {onOpenProductHistory && (
                              <button
                                onClick={() => onOpenProductHistory(product)}
                                className={`p-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer select-none active:scale-[0.95] ${
                                  isLight 
                                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' 
                                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                                }`}
                                title="ดูประวัติการรับเข้าของสินค้านี้"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">ประวัติ</span>
                              </button>
                            )}
                            <button
                              onClick={() => onOpenStockIn(product.barcode)}
                              className={`p-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer select-none active:scale-[0.95] ${
                                isLight 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                              }`}
                              title="รับของเข้าสต็อกสินค้านี้"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">สต็อก</span>
                            </button>
                            <button
                              onClick={() => onOpenEditProduct(product)}
                              className={`p-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer select-none active:scale-[0.95] ${
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
                                onClick={() => onOpenDeleteProduct(product)}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer select-none active:scale-[0.95] ${
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

            {/* Pagination Controls */}
            {!isLoading && filteredProducts.length > 0 && (
              <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#161B28] border-[#252B3B]'
              }`}>
                <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  แสดง {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredProducts.length)} จากทั้งหมด{' '}
                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>{filteredProducts.length}</strong> รายการ
                </div>

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

                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, currentPage - 3),
                    Math.min(totalPages, currentPage + 2)
                  ).map((pageNum) => (
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

                <div className={`hidden sm:flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>แสดงหน้าละ:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-lg border font-bold ${
                      isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#181D2C] border-[#252B3B] text-slate-200'
                    }`}
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: Tiles View ── */}
        {viewMode === 'tiles' && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {paginatedProducts.map((p) => {
                const stock = Number(p.stock_qty) || 0;
                const threshold = Number(p.low_stock_threshold) || 10;
                const productUOMs = liveUOMs.filter((u) => u.base_barcode === p.barcode && u.is_active !== false);

                return (
                  <motion.div
                    key={p.barcode}
                    whileHover={{ y: -3 }}
                    className={`rounded-2xl border p-3 shadow-2xs flex flex-col justify-between transition ${
                      isLight ? 'bg-white border-slate-200/90 hover:shadow-md' : 'bg-[#141824] border-[#252C3D] hover:border-blue-500/40'
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
                          <span className="font-bold text-xs text-emerald-500 font-mono">฿{(Number(p.selling_price) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {onOpenProductHistory && (
                            <button
                              onClick={() => onOpenProductHistory(p)}
                              className="p-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-lg text-[10px] font-bold cursor-pointer"
                              title="ดูประวัติ"
                            >
                              <History className="w-3 h-3" />
                            </button>
                          )}
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

            {/* Pagination for Tiles View */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-40"
                >
                  ก่อนหน้า
                </button>
                <span className="text-xs font-mono font-bold px-3 py-1.5">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-40"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 3: Analytics View ── */}
        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            {/* Left Column: Health Metrics & Valuation */}
            <div className={`lg:col-span-5 rounded-2xl p-4 sm:p-5 border shadow-2xs space-y-4 ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
            }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>สรุปสุขภาพสต็อกสินค้า (Inventory Health)</span>
              </h3>

              <div className="space-y-3">
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold block">🟢 สต็อกพร้อมขายปกติ</span>
                    <span className="text-[11px] opacity-75">มากกว่าจุดเตือนขั้นต่ำ</span>
                  </div>
                  <span className="text-lg font-black font-mono">{stats.inStockCount} SKU</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold block">🟡 สต็อกใกล้หมด (Low Stock)</span>
                    <span className="text-[11px] opacity-75">ต้องรับของเข้าเพิ่ม</span>
                  </div>
                  <span className="text-lg font-black font-mono">{stats.lowStockCount} SKU</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold block">🔴 สินค้าหมดสต็อก (Out of Stock)</span>
                    <span className="text-[11px] opacity-75">สต็อกเหลือ 0 ชิ้น</span>
                  </div>
                  <span className="text-lg font-black font-mono">{stats.outOfStockCount} SKU</span>
                </div>
              </div>
            </div>

            {/* Right Column: Category Distribution */}
            <div className={`lg:col-span-7 rounded-2xl p-4 sm:p-5 border shadow-2xs ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
            }`}>
              <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Layers className="w-4 h-4 text-blue-500" />
                <span>การกระจายสินค้าตามหมวดหมู่ (Category Breakdown)</span>
              </h3>

              <div className="space-y-3">
                {uniqueCategories.map((cat) => {
                  const catProducts = products.filter(p => p.category === cat);
                  const catUnits = catProducts.reduce((sum, p) => sum + (Number(p.stock_qty) || 0), 0);
                  const catValuation = catProducts.reduce((sum, p) => sum + ((Number(p.stock_qty) || 0) * (Number(p.selling_price) || 0)), 0);
                  const pct = stats.totalStock > 0 ? (catUnits / stats.totalStock) * 100 : 0;

                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                          {cat} <span className="font-normal text-slate-400">({catProducts.length} SKU)</span>
                        </span>
                        <span className="font-mono text-slate-500">
                          {catUnits.toLocaleString()} ชิ้น (฿{catValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}) • {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#181D2C]'}`}>
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
      </div>
    </div>
  );
};

export default ProductsTab;

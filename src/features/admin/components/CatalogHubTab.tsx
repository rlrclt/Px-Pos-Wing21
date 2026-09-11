import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package,
  Store,
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
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Layers,
  Box,
  Phone,
  User,
  List,
  TrendingUp,
  Filter
} from 'lucide-react';
import type { Seller, ProductCatalog, ProductUOMConversion, DriveFolder } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';
import { AdminStatCard } from './ui/AdminStatCard.tsx';
import { CreateSellerModal } from './CreateSellerModal.tsx';
import { DeleteSellerModal } from './DeleteSellerModal.tsx';

export interface CatalogHubTabProps {
  products: ProductCatalog[];
  sellers: Seller[];
  isLoading?: boolean;
  productSearch?: string;
  onSearchChange?: (search: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (cat: string) => void;
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: ProductCatalog) => void;
  onOpenDeleteProduct?: (product: ProductCatalog) => void;
  onOpenStockIn: (barcode?: string) => void;
  onOpenImportHub: () => void;
  onOpenDownloadTemplate: () => void;
  onOpenStockInHistory?: () => void;
  onOpenProductHistory?: (product: ProductCatalog) => void;
  onOpenSellerHistory?: (sellerId: string) => void;
  onCreateSeller?: (seller: Partial<Seller>) => Promise<boolean>;
  onUpdateSeller?: (sellerId: string, updates: Partial<Seller>) => Promise<boolean>;
  onDeleteSeller?: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>;
  driveFolders?: DriveFolder[];
  liveUOMs?: ProductUOMConversion[];
  onRefresh?: () => void;
}

export const CatalogHubTab: React.FC<CatalogHubTabProps> = ({
  products = [],
  sellers = [],
  isLoading = false,
  productSearch: propSearch,
  onSearchChange,
  categoryFilter: propCategory,
  onCategoryFilterChange,
  onOpenAddProduct,
  onOpenEditProduct,
  onOpenDeleteProduct,
  onOpenStockIn,
  onOpenImportHub,
  onOpenDownloadTemplate,
  onOpenStockInHistory,
  onOpenProductHistory,
  onOpenSellerHistory,
  onCreateSeller,
  onUpdateSeller,
  onDeleteSeller,
  driveFolders = [],
  liveUOMs = [],
  onRefresh
}) => {
  const { isLight } = useTheme();

  // Top-level View Mode: 'products' (All items) | 'sellers' (Consignment Board) | 'analytics' (Combined Analytics)
  const [hubTab, setHubTab] = useState<'products' | 'sellers' | 'analytics'>('products');

  // Local Filter States for Products View
  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('all');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [productDisplayMode, setProductDisplayMode] = useState<'table' | 'tiles'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // States for Sellers View (matching SellersTab.tsx)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateSellerOpen, setIsCreateSellerOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [deletingSeller, setDeletingSeller] = useState<Seller | null>(null);

  // Drill-down states inside Seller View
  const [drillProductSearch, setDrillProductSearch] = useState('');
  const [drillStatusFilter, setDrillStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [drillSelectedCategory, setDrillSelectedCategory] = useState<string>('all');
  const [drillViewMode, setDrillViewMode] = useState<'table' | 'tiles' | 'analytics'>('table');
  const [drillCurrentPage, setDrillCurrentPage] = useState(1);
  const [drillItemsPerPage, setDrillItemsPerPage] = useState(6);

  // Sync Search & Category with props if provided
  const activeSearch = propSearch !== undefined ? propSearch : localSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setLocalSearch(val);
    setCurrentPage(1);
  };

  const activeCategory = propCategory !== undefined ? propCategory : localCategory;
  const handleCategoryChange = (cat: string) => {
    if (onCategoryFilterChange) onCategoryFilterChange(cat);
    else setLocalCategory(cat);
    setCurrentPage(1);
  };

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

  // Map Multi-UOM packs by base barcode
  const uomMap = useMemo(() => {
    const map = new Map<string, ProductUOMConversion[]>();
    liveUOMs.forEach((uom) => {
      const existing = map.get(uom.base_barcode) || [];
      existing.push(uom);
      map.set(uom.base_barcode, existing);
    });
    return map;
  }, [liveUOMs]);

  // Map Sellers by seller_id for quick lookup
  const sellerLookup = useMemo(() => {
    const map = new Map<string, Seller>();
    sellers.forEach((s) => map.set(s.seller_id, s));
    return map;
  }, [sellers]);

  // Compute Overall Inventory & Seller KPIs
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.is_active !== false).length;
    const inactiveProducts = totalProducts - activeProducts;

    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock_qty) || 0), 0);
    const totalSellingValuation = products.reduce(
      (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.selling_price) || 0),
      0
    );
    const totalCostValuation = products.reduce(
      (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.cost_price) || 0),
      0
    );
    const totalPotentialProfit = totalSellingValuation - totalCostValuation;

    const outOfStockCount = products.filter((p) => (Number(p.stock_qty) || 0) <= 0).length;
    const lowStockCount = products.filter((p) => {
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
      totalPotentialProfit,
      outOfStockCount,
      lowStockCount,
      inStockCount,
      totalSellers: sellers.length
    };
  }, [products, sellers]);

  // Compute per-seller metrics
  const sellerStats = useMemo(() => {
    const list = sellers.map((seller) => {
      const sellerProducts = products.filter((p) => p.seller_id === seller.seller_id);
      const totalStock = sellerProducts.reduce((sum, p) => sum + (Number(p.stock_qty) || 0), 0);
      const totalValue = sellerProducts.reduce(
        (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.selling_price) || Number(p.cost_price) || 0),
        0
      );
      const totalCost = sellerProducts.reduce(
        (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.cost_price) || 0),
        0
      );
      const lowStockCount = sellerProducts.filter(
        (p) => (Number(p.stock_qty) || 0) > 0 && (Number(p.stock_qty) || 0) <= (Number(p.low_stock_threshold) || 10)
      ).length;
      const outOfStockCount = sellerProducts.filter((p) => (Number(p.stock_qty) || 0) <= 0).length;

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

    // Handle products with unknown or unassigned seller
    const unknownProducts = products.filter(
      (p) => !p.seller_id || !sellers.some((s) => s.seller_id === p.seller_id)
    );
    if (unknownProducts.length > 0) {
      const totalStock = unknownProducts.reduce((sum, p) => sum + (Number(p.stock_qty) || 0), 0);
      const totalValue = unknownProducts.reduce(
        (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.selling_price) || Number(p.cost_price) || 0),
        0
      );
      const totalCost = unknownProducts.reduce(
        (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.cost_price) || 0),
        0
      );
      const lowStockCount = unknownProducts.filter(
        (p) => (Number(p.stock_qty) || 0) > 0 && (Number(p.stock_qty) || 0) <= (Number(p.low_stock_threshold) || 10)
      ).length;
      const outOfStockCount = unknownProducts.filter((p) => (Number(p.stock_qty) || 0) <= 0).length;

      list.push({
        seller: {
          seller_id: 'UNKNOWN',
          seller_name: 'สินค้าส่วนกลาง (ไม่ระบุผู้ฝากขาย)',
          contact_info: '',
          default_fee_pct: 0,
          avatar_url: '',
          is_active: true
        },
        totalProducts: unknownProducts.length,
        totalStock,
        totalValue,
        totalCost,
        lowStockCount,
        outOfStockCount,
        products: unknownProducts
      });
    }

    return list;
  }, [sellers, products]);

  // Unique categories for filtering
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  // Filtered products list for All Products view
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase().trim();
        const matchName = (p.product_name || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const sellerName = p.seller_id ? sellerLookup.get(p.seller_id)?.seller_name || '' : '';
        const matchSeller = sellerName.toLowerCase().includes(q) || (p.seller_id || '').toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchCat && !matchSeller) return false;
      }

      // 2. Category Filter
      if (activeCategory !== 'all' && p.category !== activeCategory) {
        return false;
      }

      // 3. Seller Filter
      if (selectedSellerFilter !== 'all') {
        if (selectedSellerFilter === 'UNKNOWN' && p.seller_id && sellers.some((s) => s.seller_id === p.seller_id)) {
          return false;
        } else if (selectedSellerFilter !== 'UNKNOWN' && p.seller_id !== selectedSellerFilter) {
          return false;
        }
      }

      // 4. Stock Status Filter
      const stock = Number(p.stock_qty) || 0;
      const threshold = Number(p.low_stock_threshold) || 10;
      if (stockStatusFilter === 'out-of-stock' && stock > 0) return false;
      if (stockStatusFilter === 'low-stock' && (stock <= 0 || stock > threshold)) return false;
      if (stockStatusFilter === 'in-stock' && stock <= threshold) return false;

      return true;
    });
  }, [products, activeSearch, activeCategory, selectedSellerFilter, stockStatusFilter, sellerLookup, sellers]);

  // Pagination for products
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Filtered sellers for bento grid view (matching SellersTab.tsx)
  const filteredSellers = useMemo(() => {
    let result = sellerStats;
    if (sellerStatusFilter === 'active') {
      result = result.filter((s) => s.seller.is_active !== false);
    } else if (sellerStatusFilter === 'inactive') {
      result = result.filter((s) => s.seller.is_active === false);
    }

    if (!sellerSearch.trim()) return result;
    const q = sellerSearch.toLowerCase();
    return result.filter(
      (s) =>
        s.seller.seller_name.toLowerCase().includes(q) ||
        s.seller.seller_id.toLowerCase().includes(q) ||
        (s.seller.contact_info && s.seller.contact_info.toLowerCase().includes(q))
    );
  }, [sellerStats, sellerSearch, sellerStatusFilter]);

  // Active seller drill-down state
  const activeSellerStat = useMemo(() => {
    if (!selectedSellerId) return null;
    return sellerStats.find((s) => s.seller.seller_id === selectedSellerId) || null;
  }, [selectedSellerId, sellerStats]);

  // Categories of the active seller
  const sellerCategories = useMemo(() => {
    if (!activeSellerStat) return ['all'];
    const cats = new Set(activeSellerStat.products.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [activeSellerStat]);

  // Filtered products within the active seller drill-down
  const drillFilteredProducts = useMemo(() => {
    if (!activeSellerStat) return [];
    return activeSellerStat.products.filter((p) => {
      const q = drillProductSearch.toLowerCase();
      const matchSearch = !q || p.product_name.toLowerCase().includes(q) || p.barcode.includes(q);
      const stock = p.stock_qty || 0;
      const threshold = p.low_stock_threshold || 10;

      let matchStatus = true;
      if (drillStatusFilter === 'in-stock') matchStatus = stock > threshold;
      else if (drillStatusFilter === 'low-stock') matchStatus = stock > 0 && stock <= threshold;
      else if (drillStatusFilter === 'out-of-stock') matchStatus = stock <= 0;

      const matchCategory = drillSelectedCategory === 'all' || p.category === drillSelectedCategory;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [activeSellerStat, drillProductSearch, drillStatusFilter, drillSelectedCategory]);

  const drillTotalPages = Math.max(1, Math.ceil(drillFilteredProducts.length / drillItemsPerPage));
  const drillPaginatedProducts = useMemo(() => {
    const start = (drillCurrentPage - 1) * drillItemsPerPage;
    return drillFilteredProducts.slice(start, start + drillItemsPerPage);
  }, [drillFilteredProducts, drillCurrentPage, drillItemsPerPage]);

  useEffect(() => {
    setDrillCurrentPage(1);
  }, [drillProductSearch, drillStatusFilter, drillSelectedCategory, drillItemsPerPage]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Hub Mode Switcher */}
      <AdminSectionHeader
        title="ศูนย์รวมแคตตาล็อกสินค้าและผู้ฝากขาย (Catalog & Consignment Hub)"
        description="บริหารจัดการสินค้าปลีก, หน่วยนับ Multi-UOM, สต็อกคงคลัง, และคู่ค้าร้านค้าฝากขายครบวงจรในที่เดียว"
        icon={Boxes}
        badge={`${stats.totalProducts} รายการสินค้า | ${stats.totalSellers} ร้านค้า`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Pills */}
            <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161c28] border-[#273042]'
            }`}>
              <button
                type="button"
                onClick={() => { setHubTab('products'); setSelectedSellerId(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  hubTab === 'products'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>สินค้าทั้งหมด ({stats.totalProducts})</span>
              </button>

              <button
                type="button"
                onClick={() => { setHubTab('sellers'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  hubTab === 'sellers'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>ร้านค้าผู้ฝากขาย ({stats.totalSellers})</span>
              </button>

              <button
                type="button"
                onClick={() => { setHubTab('analytics'); setSelectedSellerId(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  hubTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>วิเคราะห์สต็อก & GP</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="รีเฟรชข้อมูล"
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    : 'bg-[#161c28] border-[#273042] text-slate-300 hover:bg-[#1f2636]'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenStockIn()}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isLight 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>รับเข้าสต็อก (Stock-In)</span>
            </button>

            {hubTab === 'sellers' ? (
              <button
                type="button"
                onClick={() => { setEditingSeller(null); setIsCreateSellerOpen(true); }}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ เพิ่มผู้ฝากขายใหม่</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddProduct}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ เพิ่มสินค้าใหม่</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards (Adaptive) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard
          title="สินค้าในระบบทั้งหมด"
          value={stats.totalProducts}
          subtitle={`พร้อมขาย ${stats.activeProducts} รายการ`}
          icon={Package}
          accentColor="#3B82F6"
        />
        <AdminStatCard
          title="จำนวนชิ้นในสต็อกรวม"
          value={stats.totalStock.toLocaleString()}
          subtitle={`มูลค่าขายรวม ฿${stats.totalSellingValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={Boxes}
          accentColor="#10B981"
        />
        <AdminStatCard
          title="มูลค่าทุนและกำไรคาดการณ์"
          value={`฿${stats.totalCostValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle={`กำไรคาดการณ์ ฿${stats.totalPotentialProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={CircleDollarSign}
          accentColor="#F59E0B"
        />
        <AdminStatCard
          title="สินค้าใกล้หมด / หมด"
          value={stats.lowStockCount + stats.outOfStockCount}
          subtitle={`ใกล้หมด ${stats.lowStockCount} | หมด ${stats.outOfStockCount}`}
          icon={AlertTriangle}
          accentColor="#EF4444"
        />
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: ALL PRODUCTS CATALOG (รวมฟีเจอร์จาก ProductsTab)               */}
      {/* ========================================================================= */}
      {hubTab === 'products' && (
        <div className="space-y-4">
          {/* Toolbar & Filter Bar */}
          <div className={`p-4 rounded-3xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#121722] border-[#21262d]'
          }`}>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสินค้า, บาร์โค้ด, หมวดหมู่, หรือผู้ฝากขาย..."
                  value={activeSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 focus:bg-white text-slate-900'
                      : 'bg-[#161c28] border-[#273042] focus:bg-[#1a2130] text-white'
                  }`}
                />
                {activeSearch && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <select
                  value={activeCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none transition-all cursor-pointer ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#161c28] border-[#273042] text-slate-300'
                  }`}
                >
                  <option value="all">📂 หมวดหมู่ทั้งหมด ({uniqueCategories.length})</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Seller Filter */}
                <select
                  value={selectedSellerFilter}
                  onChange={(e) => { setSelectedSellerFilter(e.target.value); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none transition-all cursor-pointer ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#161c28] border-[#273042] text-slate-300'
                  }`}
                >
                  <option value="all">🏪 ผู้ฝากขายทั้งหมด ({sellers.length})</option>
                  {sellers.map((s) => (
                    <option key={s.seller_id} value={s.seller_id}>
                      {s.seller_id}: {s.seller_name} ({s.default_fee_pct || 0}%)
                    </option>
                  ))}
                  <option value="UNKNOWN">สินค้าส่วนกลาง (ไม่ระบุร้าน)</option>
                </select>

                {/* Stock Status Pills */}
                <div className={`p-1 rounded-xl border flex items-center gap-1 ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161c28] border-[#273042]'
                }`}>
                  <button
                    type="button"
                    onClick={() => { setStockStatusFilter('all'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      stockStatusFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStockStatusFilter('in-stock'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      stockStatusFilter === 'in-stock'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    มีสต็อก
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStockStatusFilter('low-stock'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      stockStatusFilter === 'low-stock'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    ใกล้หมด
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStockStatusFilter('out-of-stock'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      stockStatusFilter === 'out-of-stock'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    หมด
                  </button>
                </div>

                {/* View Mode (Table / Tiles) */}
                <div className={`p-1 rounded-xl border flex items-center gap-1 ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161c28] border-[#273042]'
                }`}>
                  <button
                    type="button"
                    onClick={() => setProductDisplayMode('table')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      productDisplayMode === 'table'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                    title="มุมมองตาราง"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductDisplayMode('tiles')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      productDisplayMode === 'tiles'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                    title="มุมมองการ์ด (Grid)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Import / Export Hub Shortcuts */}
                <button
                  type="button"
                  onClick={onOpenImportHub}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#161c28] hover:bg-[#1f2636] border-[#273042] text-slate-300'
                  }`}
                  title="นำเข้าสินค้าผ่าน Excel หรือ Google Drive"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">นำเข้า Excel</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenDownloadTemplate}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#161c28] hover:bg-[#1f2636] border-[#273042] text-slate-300'
                  }`}
                  title="ดาวน์โหลดเทมเพลต Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Template</span>
                </button>

                {onOpenStockInHistory && (
                  <button
                    type="button"
                    onClick={onOpenStockInHistory}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#161c28] hover:bg-[#1f2636] border-[#273042] text-slate-300'
                    }`}
                    title="ดูประวัติการรับเข้าสินค้าทั้งหมด"
                  >
                    <History className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">ประวัติรับเข้า</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products Table View */}
          {productDisplayMode === 'table' ? (
            <div className={`rounded-3xl border overflow-hidden transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#121722] border-[#21262d]'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                    isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-[#161c28] text-slate-400 border-[#21262d]'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">สินค้า</th>
                      <th className="py-3.5 px-4">บาร์โค้ด / หมวดหมู่</th>
                      <th className="py-3.5 px-4">ผู้ฝากขาย</th>
                      <th className="py-3.5 px-4 text-right">ราคาขาย</th>
                      <th className="py-3.5 px-4 text-right">ราคาทุน</th>
                      <th className="py-3.5 px-4 text-center">คงเหลือ</th>
                      <th className="py-3.5 px-4">หน่วยนับ & แพ็ค</th>
                      <th className="py-3.5 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#21262d]'}`}>
                    {paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((p) => {
                        const stock = Number(p.stock_qty) || 0;
                        const threshold = Number(p.low_stock_threshold) || 10;
                        const seller = p.seller_id ? sellerLookup.get(p.seller_id) : undefined;
                        const uoms = uomMap.get(p.barcode) || [];

                        return (
                          <tr key={p.barcode} className={`transition-colors ${
                            isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#161c28]/60'
                          }`}>
                            {/* Product Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.product_name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-700/40 bg-slate-800 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className={`font-bold text-sm truncate max-w-[200px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    {p.product_name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span>หน่วย: {p.unit_name || 'ชิ้น'}</span>
                                    {p.is_active === false && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                        ระงับการขาย
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Barcode & Category */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-xs font-semibold text-blue-400">
                                {p.barcode}
                              </div>
                              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#1a2130] text-slate-300 border-[#2b3548]'
                              }`}>
                                {p.category || 'ทั่วไป'}
                              </span>
                            </td>

                            {/* Seller Tag */}
                            <td className="py-3 px-4">
                              {seller ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSellerId(seller.seller_id);
                                    setHubTab('sellers');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all cursor-pointer"
                                  title={`คลิกเพื่อดูเฉพาะร้าน ${seller.seller_name}`}
                                >
                                  <Store className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{seller.seller_name}</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </td>

                            {/* Selling Price */}
                            <td className="py-3 px-4 text-right font-bold text-sm text-emerald-400 font-mono">
                              ฿{(Number(p.selling_price) || 0).toFixed(2)}
                            </td>

                            {/* Cost Price */}
                            <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                              {p.cost_price ? `฿${(Number(p.cost_price)).toFixed(2)}` : '-'}
                            </td>

                            {/* Stock Quantity & Badge */}
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                                stock <= 0
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : stock <= threshold
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {stock <= 0 ? 'หมด (0)' : `${stock.toLocaleString()} ${p.unit_name || 'ชิ้น'}`}
                              </span>
                            </td>

                            {/* Multi-UOM Pack units */}
                            <td className="py-3 px-4">
                              {uoms.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {uoms.map((u) => (
                                    <span
                                      key={u.conversion_id}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-mono"
                                      title={`บาร์โค้ดแพ็ค: ${u.barcode} (แตก ${u.conversion_factor} หน่วย) ราคา ฿${u.selling_price}`}
                                    >
                                      {u.unit_name} (x{u.conversion_factor}) ฿{u.selling_price}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">หน่วยเดี่ยว</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenStockIn(p.barcode)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                                  title="รับเข้าสต็อกสินค้านี้"
                                >
                                  <Boxes className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onOpenEditProduct(p)}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all cursor-pointer"
                                  title="แก้ไขข้อมูลสินค้า"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {onOpenProductHistory && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenProductHistory(p)}
                                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                                    title="ดูประวัติสินค้า"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onOpenDeleteProduct && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDeleteProduct(p)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                                    title="ลบสินค้า"
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
            </div>
          ) : (
            /* Products Tiles (Grid) View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((p) => {
                const stock = Number(p.stock_qty) || 0;
                const threshold = Number(p.low_stock_threshold) || 10;
                const seller = p.seller_id ? sellerLookup.get(p.seller_id) : undefined;
                const uoms = uomMap.get(p.barcode) || [];

                return (
                  <div
                    key={p.barcode}
                    className={`rounded-3xl border p-4 transition-all flex flex-col justify-between ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#121722] border-[#21262d]'
                    }`}
                  >
                    <div>
                      {/* Top Thumbnail & Badges */}
                      <div className="relative h-36 rounded-2xl overflow-hidden bg-slate-800 mb-3 border border-slate-700/40">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <Package className="w-10 h-10 opacity-40" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${
                            isLight ? 'bg-white/90 text-slate-800 border-slate-200' : 'bg-slate-900/90 text-white border-slate-700'
                          }`}>
                            {p.category || 'ทั่วไป'}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border backdrop-blur-md ${
                            stock <= 0
                              ? 'bg-rose-900/80 text-rose-300 border-rose-500'
                              : stock <= threshold
                              ? 'bg-amber-900/80 text-amber-300 border-amber-500'
                              : 'bg-emerald-900/80 text-emerald-300 border-emerald-500'
                          }`}>
                            สต็อก: {stock}
                          </span>
                        </div>
                      </div>

                      {/* Title & Info */}
                      <h4 className={`font-bold text-sm line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {p.product_name}
                      </h4>
                      <div className="text-[11px] font-mono text-blue-400 mt-0.5">{p.barcode}</div>

                      {/* Seller & Multi-UOM */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40 text-xs">
                        <span className="text-slate-400 text-[11px]">ผู้ฝากขาย:</span>
                        <span className="font-semibold text-amber-400 text-[11px] truncate max-w-[120px]">
                          {seller?.seller_name || 'สินค้าส่วนกลาง'}
                        </span>
                      </div>

                      {uoms.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {uoms.map((u) => (
                            <span key={u.conversion_id} className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              {u.unit_name} ฿{u.selling_price}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Price & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">ราคาขาย</div>
                        <div className="text-base font-bold text-emerald-400 font-mono">
                          ฿{(Number(p.selling_price) || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenStockIn(p.barcode)}
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                          title="รับเข้าสต็อก"
                        >
                          <Boxes className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditProduct(p)}
                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all cursor-pointer"
                          title="แก้ไขสินค้า"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#121722] border-[#21262d] text-slate-400'
            }`}>
              <div>
                แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} จาก {filteredProducts.length} รายการ
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: CONSIGNMENT SELLERS & DRILL-DOWN (ตามแบบ SellersTab.tsx 100%) */}
      {/* ========================================================================= */}
      {hubTab === 'sellers' && (
        <div className="space-y-4">
          {activeSellerStat ? (
            (() => {
              const { displayName, shopSubname } = parseSellerName(activeSellerStat.seller.seller_name, activeSellerStat.seller.seller_id);
              const inStockCount = activeSellerStat.products.filter(p => (p.stock_qty || 0) > (p.low_stock_threshold || 10)).length;

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
                          setDrillProductSearch('');
                          setDrillStatusFilter('all');
                          setDrillSelectedCategory('all');
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
                          รหัสบัญชี: {activeSellerStat.seller.seller_id} • ค่า GP: {((activeSellerStat.seller.default_fee_pct || 0) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-teal-100 shrink-0 flex-wrap">
                      {activeSellerStat.seller.seller_id !== 'UNKNOWN' && (
                        <>
                          <button
                            onClick={() => { setEditingSeller(activeSellerStat.seller); setIsCreateSellerOpen(true); }}
                            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-xs font-bold text-white flex items-center gap-1.5 transition select-none active:scale-[0.97] cursor-pointer shadow-xs"
                            title="แก้ไขข้อมูลผู้ฝากขายรายนี้"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-cyan-300" />
                            <span>แก้ไขข้อมูล</span>
                          </button>

                          {activeSellerStat.seller.seller_id !== 'S01' && (
                            <button
                              onClick={() => setDeletingSeller(activeSellerStat.seller)}
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
                          onClick={() => onOpenSellerHistory(activeSellerStat.seller.seller_id)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-xs font-bold text-white flex items-center gap-1.5 transition select-none active:scale-[0.97] cursor-pointer shadow-xs"
                          title={`ดูประวัติการรับเข้าทั้งหมดของร้าน ${displayName}`}
                        >
                          <History className="w-3.5 h-3.5 text-teal-300" />
                          <span>ประวัติรับเข้าของร้านนี้</span>
                        </button>
                      )}
                      <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs font-mono font-bold flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-teal-300" />
                        <span>{activeSellerStat.totalProducts} SKU</span>
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
                        {activeSellerStat.seller.avatar_url ? (
                          <img
                            src={activeSellerStat.seller.avatar_url}
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
                            {activeSellerStat.seller.seller_id}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            activeSellerStat.seller.is_active !== false 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {activeSellerStat.seller.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <h3 className={`font-bold text-xs sm:text-sm truncate mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {displayName}
                        </h3>
                        <p className={`text-[11px] truncate flex items-center gap-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-mono">{activeSellerStat.seller.contact_info || shopSubname}</span>
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
                            {activeSellerStat.totalProducts}
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
                            {activeSellerStat.totalStock.toLocaleString()}
                          </span>
                          <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            ชิ้น
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono">
                          {activeSellerStat.lowStockCount > 0 && (
                            <span className="text-amber-500 font-semibold">เตือน {activeSellerStat.lowStockCount}</span>
                          )}
                          {activeSellerStat.outOfStockCount > 0 && (
                            <span className="text-rose-500 font-semibold">หมด {activeSellerStat.outOfStockCount}</span>
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
                          ฿{activeSellerStat.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            value={drillProductSearch}
                            onChange={(e) => setDrillProductSearch(e.target.value)}
                            placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด..."
                            className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none transition ${
                              isLight 
                                ? 'bg-slate-50 hover:bg-slate-100/70 focus:bg-white border-slate-300/80 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500' 
                                : 'bg-[#181D2C] hover:bg-[#1E2436] focus:bg-[#181D2C] border-[#252B3B] text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500'
                            }`}
                          />
                          {drillProductSearch && (
                            <button
                              onClick={() => setDrillProductSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="relative">
                          <select
                            value={drillStatusFilter}
                            onChange={(e) => setDrillStatusFilter(e.target.value as any)}
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
                            onClick={() => setDrillViewMode('table')}
                            className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                              drillViewMode === 'table'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                            title="มุมมองตารางมาตรฐาน"
                          >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">ตาราง</span>
                          </button>
                          <button
                            onClick={() => setDrillViewMode('tiles')}
                            className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                              drillViewMode === 'tiles'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                            title="มุมมองการ์ดสินค้า"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">การ์ด</span>
                          </button>
                          <button
                            onClick={() => setDrillViewMode('analytics')}
                            className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                              drillViewMode === 'analytics'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                            title="วิเคราะห์มูลค่าและสัดส่วน"
                          >
                            <PieChart className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">วิเคราะห์</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* VIEW MODE 1: Table View                                                  */}
                  {/* ========================================================================= */}
                  {drillViewMode === 'table' && (
                    <div className={`rounded-2xl border shadow-2xs overflow-hidden ${
                      isLight ? 'bg-white border-slate-200/90' : 'bg-[#141824] border-[#252C3D]'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className={`border-b text-[11px] font-bold ${
                            isLight ? 'bg-slate-50/80 text-slate-500 border-slate-200' : 'bg-[#181D2C] text-slate-400 border-[#252B3B]'
                          }`}>
                            <tr>
                              <th className="py-3 px-3.5 w-12 text-center">รูป</th>
                              <th className="py-3 px-3.5">ชื่อสินค้า</th>
                              <th className="py-3 px-3.5">บาร์โค้ด & หน่วย</th>
                              <th className="py-3 px-3.5">หมวดหมู่</th>
                              <th className="py-3 px-3.5 text-center">คงเหลือ</th>
                              <th className="py-3 px-3.5 text-right">ราคาทุน</th>
                              <th className="py-3 px-3.5 text-right">ราคาขาย</th>
                              <th className="py-3 px-3.5 text-center w-28">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#1E2436]'}`}>
                            {drillPaginatedProducts.map((p) => {
                              const stock = p.stock_qty || 0;
                              const threshold = p.low_stock_threshold || 10;
                              const productUOMs = liveUOMs.filter((u) => u.base_barcode === p.barcode);

                              return (
                                <tr 
                                  key={p.barcode} 
                                  className={`transition-colors ${
                                    isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181D2C]/80'
                                  }`}
                                >
                                  {/* Thumbnail */}
                                  <td className="py-2.5 px-3.5 text-center">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#181D2C] border border-slate-200 dark:border-[#252B3B] flex items-center justify-center mx-auto">
                                      {p.image_url ? (
                                        <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                                      ) : (
                                        <Package className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                  </td>

                                  {/* Product Name */}
                                  <td className="py-2.5 px-3.5">
                                    <span className={`font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                      {p.product_name}
                                    </span>
                                  </td>

                                  {/* Barcode & UOMs */}
                                  <td className="py-2.5 px-3.5">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">ชิ้น</span>
                                        <span className="font-mono text-xs font-semibold text-blue-500">{p.barcode}</span>
                                      </div>
                                      {productUOMs.map((uom, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-[10px] text-amber-500 dark:text-amber-400 font-mono">
                                          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">{uom.unit_name || 'แพ็ค'}</span>
                                          <span>{uom.barcode}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>

                                  {/* Category */}
                                  <td className="py-2.5 px-3.5">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                      isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181D2C] border-[#252B3B] text-slate-300'
                                    }`}>
                                      {p.category || 'ทั่วไป'}
                                    </span>
                                  </td>

                                  {/* Stock Qty */}
                                  <td className="py-2.5 px-3.5 text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                                          stock === 0
                                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                            : stock <= threshold
                                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        }`}
                                      >
                                        {stock} {p.unit_name || 'ชิ้น'}
                                      </span>
                                      {productUOMs.map((uom, idx) => {
                                        const factor = Number(uom.conversion_factor) || 1;
                                        const packs = Math.floor(stock / factor);
                                        const remainder = stock % factor;
                                        return (
                                          <span key={idx} className="text-[9px] font-mono text-slate-400">
                                            ({packs} {uom.unit_name || 'แพ็ค'}{remainder > 0 ? ` +${remainder}` : ''})
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>

                                  {/* Cost Price */}
                                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                                    {p.cost_price ? `฿${Number(p.cost_price).toFixed(2)}` : '-'}
                                  </td>

                                  {/* Selling Price */}
                                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-500">
                                    ฿{(p.selling_price || 0).toFixed(2)}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="py-2.5 px-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => onOpenStockIn(p.barcode)}
                                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-[0.95] cursor-pointer"
                                        title="รับเข้าสต็อก (Stock-in)"
                                      >
                                        <Boxes className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => onOpenEditProduct(p)}
                                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-[0.95] cursor-pointer"
                                        title="แก้ไขสินค้า"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      {onOpenDeleteProduct && (
                                        <button
                                          onClick={() => onOpenDeleteProduct(p)}
                                          className={`p-1.5 rounded-lg text-xs font-bold transition shadow-2xs active:scale-[0.95] cursor-pointer border ${
                                            isLight 
                                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200' 
                                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                          }`}
                                          title="ลบหรือระงับการขาย"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {onOpenProductHistory && (
                                        <button
                                          onClick={() => onOpenProductHistory(p)}
                                          className={`p-1.5 rounded-lg text-xs font-bold transition shadow-2xs active:scale-[0.95] cursor-pointer border ${
                                            isLight 
                                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200' 
                                              : 'bg-[#181D2C] hover:bg-[#202738] text-slate-300 border-[#252B3B]'
                                          }`}
                                          title="ดูประวัติการเคลื่อนไหว"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                        isLight ? 'bg-slate-50/80 border-slate-200 text-slate-600' : 'bg-[#181D2C] border-[#252B3B] text-slate-400'
                      }`}>
                        <div className="font-medium text-center sm:text-left">
                          แสดง {(drillCurrentPage - 1) * drillItemsPerPage + 1} - {Math.min(drillCurrentPage * drillItemsPerPage, drillFilteredProducts.length)} จากทั้งหมด {drillFilteredProducts.length} รายการ
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            disabled={drillCurrentPage === 1}
                            onClick={() => setDrillCurrentPage(1)}
                            className="p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            title="หน้าแรก"
                          >
                            <ChevronsLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={drillCurrentPage === 1}
                            onClick={() => setDrillCurrentPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            title="หน้าก่อนหน้า"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <span className="font-mono font-bold px-2">
                            {drillCurrentPage} / {drillTotalPages}
                          </span>

                          <button
                            disabled={drillCurrentPage === drillTotalPages}
                            onClick={() => setDrillCurrentPage((p) => Math.min(drillTotalPages, p + 1))}
                            className="p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            title="หน้าถัดไป"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            disabled={drillCurrentPage === drillTotalPages}
                            onClick={() => setDrillCurrentPage(drillTotalPages)}
                            className="p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            title="หน้าสุดท้าย"
                          >
                            <ChevronsRight className="w-4 h-4" />
                          </button>

                          <select
                            value={drillItemsPerPage}
                            onChange={(e) => setDrillItemsPerPage(Number(e.target.value))}
                            className={`ml-2 border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${
                              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#141824] border-[#252B3B] text-slate-200'
                            }`}
                          >
                            <option value={6}>6 ต่อหน้า</option>
                            <option value={12}>12 ต่อหน้า</option>
                            <option value={24}>24 ต่อหน้า</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* VIEW MODE 2: Tiles View                                                  */}
                  {/* ========================================================================= */}
                  {drillViewMode === 'tiles' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {drillPaginatedProducts.map((p) => {
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
                              
                              {/* Barcodes breakdown */}
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
                                    <Edit2 className="w-3.5 h-3.5" />
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
                  {drillViewMode === 'analytics' && (
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
                                ฿{activeSellerStat.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>
                            <div className={`flex justify-between pb-2 border-b ${isLight ? 'border-slate-100' : 'border-[#252B3B]'}`}>
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>มูลค่าราคาขายรวม:</span>
                              <strong className="font-mono text-emerald-500">
                                ฿{activeSellerStat.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>
                            <div className={`flex justify-between pb-2 border-b ${isLight ? 'border-slate-100' : 'border-[#252B3B]'}`}>
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>ส่วนต่างกำไรขั้นต้น (Est. Margin):</span>
                              <strong className="font-mono text-blue-500">
                                ฿{(activeSellerStat.totalValue - activeSellerStat.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>จำนวนหน่วยในคลังทั้งหมด:</span>
                              <strong className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {activeSellerStat.totalStock.toLocaleString()} ชิ้น
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
                              <span className="text-base font-black font-mono">{activeSellerStat.lowStockCount}</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border ${
                              isLight ? 'bg-rose-50/70 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                            }`}>
                              <span className="text-[10px] block font-semibold">หมด</span>
                              <span className="text-base font-black font-mono">{activeSellerStat.outOfStockCount}</span>
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
                            const catProducts = activeSellerStat.products.filter(p => p.category === cat);
                            const catUnits = catProducts.reduce((sum, p) => sum + (p.stock_qty || 0), 0);
                            const pct = activeSellerStat.totalStock > 0 ? (catUnits / activeSellerStat.totalStock) * 100 : 0;
                            
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
            })()
          ) : (
            /* ========================================================================= */
            /* OVERVIEW CONSIGNMENT SELLERS BENTO GRID (ตามแบบ SellersTab.tsx 100%)       */
            /* ========================================================================= */
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
                          setIsCreateSellerOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all select-none active:scale-[0.98] cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>เพิ่มผู้ฝากขาย</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 🌟 Refined Modern Bento Grid Layout (Matching SellersTab.tsx) */}
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
                          
                          {/* ชั้น 1: Header ร้านค้า & สถานะ */}
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
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: COMBINED ANALYTICS (วิเคราะห์ภาพรวมสต็อกและสัดส่วนผู้ฝากขาย)    */}
      {/* ========================================================================= */}
      {hubTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className={`p-6 rounded-3xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#121722] border-[#21262d]'
          }`}>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-blue-400" />
              สัดส่วนมูลค่าสต็อกตามหมวดหมู่สินค้า
            </h3>

            <div className="space-y-3">
              {uniqueCategories.map((cat) => {
                const catProducts = products.filter((p) => p.category === cat);
                const catValuation = catProducts.reduce(
                  (sum, p) => sum + (Number(p.stock_qty) || 0) * (Number(p.selling_price) || 0),
                  0
                );
                const pct = stats.totalSellingValuation > 0 ? (catValuation / stats.totalSellingValuation) * 100 : 0;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{cat} ({catProducts.length} รายการ)</span>
                      <span className="text-emerald-400 font-mono">฿{catValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seller Share Breakdown */}
          <div className={`p-6 rounded-3xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#121722] border-[#21262d]'
          }`}>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-amber-400" />
              สัดส่วนมูลค่าและสต็อกแยกตามร้านค้าผู้ฝากขาย
            </h3>

            <div className="space-y-3">
              {sellerStats.map((item) => {
                const pct = stats.totalSellingValuation > 0 ? (item.totalValue / stats.totalSellingValuation) * 100 : 0;

                return (
                  <div key={item.seller.seller_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                        {item.seller.seller_name} ({item.totalProducts} รายการ)
                      </span>
                      <span className="text-amber-400 font-mono">
                        ฿{item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Seller Create / Edit Modal */}
      {isCreateSellerOpen && (
        <CreateSellerModal
          isOpen={isCreateSellerOpen}
          onClose={() => { setIsCreateSellerOpen(false); setEditingSeller(null); }}
          onSave={async (sellerData) => {
            if (editingSeller && onUpdateSeller) {
              return await onUpdateSeller(editingSeller.seller_id, sellerData);
            } else if (onCreateSeller) {
              return await onCreateSeller(sellerData);
            }
            return false;
          }}
          initialData={editingSeller}
          existingSellers={sellers}
          driveFolders={driveFolders}
        />
      )}

      {/* Seller Delete Confirmation Modal */}
      {deletingSeller && onDeleteSeller && (
        <DeleteSellerModal
          isOpen={!!deletingSeller}
          onClose={() => setDeletingSeller(null)}
          onConfirmDelete={async (sellerId: string, cascadeProducts: boolean) => {
            if (onDeleteSeller) {
              return await onDeleteSeller(sellerId, cascadeProducts);
            }
            return false;
          }}
          seller={deletingSeller}
          linkedProducts={products.filter((p) => p.seller_id === deletingSeller?.seller_id)}
        />
      )}
    </div>
  );
};

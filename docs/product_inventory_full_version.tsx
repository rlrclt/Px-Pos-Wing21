import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Package,
  List,
  Clock,
  ArrowRightLeft,
  Edit,
  Trash2,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Check,
  X,
  TrendingUp,
  Download,
  Barcode,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  PieChart,
  Smartphone,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';

const INITIAL_SELLER = {
  name: 'คุณ สมชาย - ร้านค้าสมชายพืชผล',
  location: 'ศาลาขาว-ออกคัน',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  totalItemsCount: 345,
  warehouseStatus: '1 สถานะคลัง 4,200 ชิ้น',
  quickCost: '¥1,500',
  quickPrice: '¥ 680 บาท'
};

const INITIAL_PRODUCTS = [
  {
    id: 1,
    barcode: '885123456789',
    name: 'ข้าวหอมมะลิ (Thai Jasmine Rice)',
    category: 'พืชผล & ข้าว',
    stock: 500,
    unit: 'ถุง',
    costPrice: 300,
    sellingPrice: 450,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80',
    status: 'in-stock'
  },
  {
    id: 2,
    barcode: '885123456790',
    name: 'ปุ๋ยสูตร (Mixed Fertilizer)',
    category: 'ปุ๋ย & ดิน',
    stock: 500,
    unit: 'ถุง',
    costPrice: 300,
    sellingPrice: 450,
    image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=300&q=80',
    status: 'in-stock'
  },
  {
    id: 3,
    barcode: '885123456791',
    name: 'เครื่องมือทำสวน (Garden Tool)',
    category: 'อุปกรณ์การเกษตร',
    stock: 200,
    unit: 'ถุง',
    costPrice: 300,
    sellingPrice: 350,
    image: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?auto=format&fit=crop&w=300&q=80',
    status: 'low-stock'
  },
  {
    id: 4,
    barcode: '885123456792',
    name: 'ปุ๋ยสูตรอินทรีย์ (Organic Fertilizer)',
    category: 'ปุ๋ย & ดิน',
    stock: 500,
    unit: 'ถุง',
    costPrice: 300,
    sellingPrice: 450,
    image: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=300&q=80',
    status: 'in-stock'
  },
  {
    id: 5,
    barcode: '885123456793',
    name: 'เครื่องมือทำสวน กรรไกรตัดหญ้า (Pruning Shears)',
    category: 'อุปกรณ์การเกษตร',
    stock: 300,
    unit: 'ถุง',
    costPrice: 300,
    sellingPrice: 450,
    image: 'https://images.unsplash.com/photo-1599685315640-9ceab2f58944?auto=format&fit=crop&w=300&q=80',
    status: 'in-stock'
  },
  {
    id: 6,
    barcode: '885123456794',
    name: 'เครื่องมือทำสวน (Food & Seeds)',
    category: 'อาหารสัตว์ & เมล็ดพันธุ์',
    stock: 150,
    unit: 'ถุง',
    costPrice: 300,
    sellingPrice: 450,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
    status: 'low-stock'
  },
  {
    id: 7,
    barcode: '885123456795',
    name: 'เมล็ดพันธุ์ข้าวโพดหวาน (Sweet Corn Seeds)',
    category: 'อาหารสัตว์ & เมล็ดพันธุ์',
    stock: 80,
    unit: 'ซอง',
    costPrice: 85,
    sellingPrice: 140,
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=300&q=80',
    status: 'low-stock'
  },
  {
    id: 8,
    barcode: '885123456796',
    name: 'ถังพ่นยาสะพายหลัง 16 ลิตร (Knapsack Sprayer)',
    category: 'อุปกรณ์การเกษตร',
    stock: 25,
    unit: 'ถัง',
    costPrice: 650,
    sellingPrice: 990,
    image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=300&q=80',
    status: 'low-stock'
  },
  {
    id: 9,
    barcode: '885123456797',
    name: 'ยาบำรุงรากพืชเข้มข้น (Root Booster 500ml)',
    category: 'ปุ๋ย & ดิน',
    stock: 0,
    unit: 'ขวด',
    costPrice: 120,
    sellingPrice: 195,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    status: 'out-of-stock'
  }
];

export default function ProductInventoryApp() {
  const [seller, setSeller] = useState(INITIAL_SELLER);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in-stock' | 'low-stock' | 'out-of-stock'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'tiles' | 'analytics'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Toast handler
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3200);
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery);

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'in-stock'
          ? p.stock > 100
          : statusFilter === 'low-stock'
          ? p.stock > 0 && p.stock <= 100
          : statusFilter === 'out-of-stock'
          ? p.stock === 0
          : true;

      const matchCategory =
        selectedCategory === 'all' ? true : p.category === selectedCategory;

      return matchQuery && matchStatus && matchCategory;
    });
  }, [products, searchQuery, statusFilter, selectedCategory]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedCategory]);

  // Summary figures
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
  }, [products]);

  const totalUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + p.stock, 0);
  }, [products]);

  const totalRetailValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0);
  }, [products]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSaveProduct = (formData) => {
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...formData } : p))
      );
      showToast(`อัปเดตข้อมูล "${formData.name}" สำเร็จ`);
    } else {
      const newProduct = {
        id: Date.now(),
        ...formData,
        status: formData.stock === 0 ? 'out-of-stock' : formData.stock <= 100 ? 'low-stock' : 'in-stock'
      };
      setProducts((prev) => [newProduct, ...prev]);
      showToast(`เพิ่มสินค้าใหม่ "${formData.name}" เรียบร้อยแล้ว`);
    }
    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDeleteConfirmProduct(null);
    showToast(`ลบสินค้า "${target?.name || ''}" เรียบร้อย`, 'warning');
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
    showToast(`ลบสินค้าที่เลือกทั้งหมด ${count} รายการแล้ว`, 'warning');
  };

  const handleAdjustStock = (id, newStock) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const validStock = Math.max(0, parseInt(newStock) || 0);
          return {
            ...p,
            stock: validStock,
            status: validStock === 0 ? 'out-of-stock' : validStock <= 100 ? 'low-stock' : 'in-stock'
          };
        }
        return p;
      })
    );
    showToast('ปรับปรุงยอดสต็อกสำเร็จ');
    setStockAdjustProduct(null);
  };

  const handleSimulateScan = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    setSearchQuery(randomProduct.barcode);
    showToast(`บาร์โค้ดที่สแกน: ${randomProduct.barcode} (${randomProduct.name})`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#e9eef2] text-slate-800 font-sans antialiased pb-12 selection:bg-blue-100">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs sm:text-sm font-semibold backdrop-blur-md ${
              notification.type === 'warning'
                ? 'bg-rose-900/90 text-rose-100 border-rose-500/40'
                : notification.type === 'info'
                ? 'bg-[#153448]/95 text-blue-100 border-cyan-400/40'
                : 'bg-[#173a4d]/95 text-white border-teal-500/40'
            }`}
          >
            {notification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-teal-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto p-2 sm:p-4 md:p-6 space-y-4">
        {/* Top Header Banner - Exactly as in the Image */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-[#173a4d] via-[#1a4459] to-[#26586b] text-white py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-700/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse hidden sm:block" />
            <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white flex flex-wrap items-baseline gap-2">
              <span>รายการสินค้าของร้าน [ชื่อร้านค้า]</span>
              <span className="text-xs sm:text-sm md:text-base font-normal text-teal-100/80">
                (Product Inventory for [Shop Name])
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-teal-100">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs font-mono font-medium">
              สินค้าทั้งหมด: {products.length} SKU
            </span>
          </div>
        </motion.div>

        {/* Top 4 Summary Cards (Exact Layout from Image) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Card 1: Seller Info */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3 transition hover:shadow-sm">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 shadow-2xs bg-slate-100">
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm md:text-base truncate">
                {seller.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {seller.location}
              </p>
            </div>
          </div>

          {/* Card 2: Total Items */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3 transition hover:shadow-sm">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <List className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block leading-tight">
                รายการทั้งหมด
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {seller.totalItemsCount || products.length}
              </span>
            </div>
          </div>

          {/* Card 3: Stock Status */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3 transition hover:shadow-sm">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block leading-tight">
                สถานะคลัง
              </span>
              <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-tight block truncate">
                {seller.warehouseStatus}
              </span>
            </div>
          </div>

          {/* Card 4: Quick Action */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-2.5 transition hover:shadow-sm">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block leading-tight">
                จัดการด่วน
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight block truncate flex items-center gap-1">
                <span>{seller.quickCost}</span>
                <ArrowRightLeft className="w-3 h-3 text-amber-500 inline shrink-0" />
                <span>{seller.quickPrice}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Control Panel (Actions, Filters, Search & View Switcher) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ สินค้ารายการสินค้า</span>
              </button>

              <button
                onClick={handleSimulateScan}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
                title="จำลองการสแกนบาร์โค้ดด้วยเครื่องยิง"
              >
                <Barcode className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">จำลองสแกน</span>
              </button>

              {selectedIds.size > 0 && (
                <button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบที่เลือก ({selectedIds.size})</span>
                </button>
              )}
            </div>

            {/* Right: Search, Filter Dropdowns & View Mode */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64 md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตามชื่อสินค้าหรือบาร์โค้ด..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-300/80 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-300/80 text-xs sm:text-sm text-slate-700 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">กรองตามสถานะ (ทั้งหมด)</option>
                  <option value="in-stock">สต็อกปกติ (&gt; 100)</option>
                  <option value="low-stock">สต็อกใกล้หมด (≤ 100)</option>
                  <option value="out-of-stock">สินค้าหมดสต็อก (0)</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Switcher (Table / Tiles / Analytics) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
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
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="มุมมองแผ่นป้ายรูปภาพ (Tile View)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">แผ่นป้าย</span>
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'analytics'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="มุมมองกราฟสถิติ (Analytics)"
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">วิเคราะห์</span>
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-1 border-t border-slate-100">
            <span className="text-slate-400 text-[11px] font-medium mr-1 shrink-0">หมวดหมู่:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition text-xs font-semibold cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1e527a] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'ทั้งหมด' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: Standard Table View (Exactly as in User's Image)            */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                {/* Blue Header Exactly as Image 3 */}
                <thead className="bg-[#1e527a] text-white text-xs sm:text-sm font-semibold select-none">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-center">
                      <button
                        onClick={toggleSelectAll}
                        className="text-white hover:text-teal-200 transition cursor-pointer"
                        title="เลือกทั้งหมดในหน้านี้"
                      >
                        {selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-teal-300" />
                        ) : (
                          <Square className="w-4 h-4 text-white/70" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 w-16 text-center">(รูปภาพ)</th>
                    <th className="py-3 px-4">บาร์โค้ด<span className="block text-[10px] font-normal text-teal-100/70">Barcode</span></th>
                    <th className="py-3 px-4">ชื่อสินค้า<span className="block text-[10px] font-normal text-teal-100/70">Product Name</span></th>
                    <th className="py-3 px-4 text-center">คงเหลือในคลัง<span className="block text-[10px] font-normal text-teal-100/70">In-Stock</span></th>
                    <th className="py-3 px-4 text-right">ราคาทุน<span className="block text-[10px] font-normal text-teal-100/70">Cost Price</span></th>
                    <th className="py-3 px-4 text-right">ราคาขาย<span className="block text-[10px] font-normal text-teal-100/70">Selling Price</span></th>
                    <th className="py-3 px-4 text-center w-48">การจัดการ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold">ไม่พบรายการสินค้าที่ค้นหา</p>
                        <p className="text-xs text-slate-400 mt-0.5">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p, idx) => {
                      const isSelected = selectedIds.has(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`transition hover:bg-blue-50/40 ${
                            isSelected ? 'bg-blue-50/70' : idx % 2 === 1 ? 'bg-[#fafbfe]' : 'bg-white'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              onClick={() => toggleSelectRow(p.id)}
                              className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>

                          {/* Image */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mx-auto shadow-2xs">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'https://placehold.co/100x100/1e527a/ffffff?text=ITEM';
                                }}
                              />
                            </div>
                          </td>

                          {/* Barcode */}
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-600 text-xs">
                            {p.barcode}
                          </td>

                          {/* Product Name & Category badge */}
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900 leading-snug">{p.name}</div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {p.category}
                            </span>
                          </td>

                          {/* In-Stock */}
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-block font-bold px-2 py-0.5 rounded-lg text-xs ${
                                p.stock === 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : p.stock <= 100
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-slate-800'
                              }`}
                            >
                              {p.stock.toLocaleString()} {p.unit}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td className="py-2.5 px-4 text-right font-medium text-slate-600 font-mono">
                            ¥ {p.costPrice.toLocaleString()} บาท
                          </td>

                          {/* Selling Price */}
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                            ¥ {p.sellingPrice.toLocaleString()} บาท
                          </td>

                          {/* Actions: Edit, Delete, Stock */}
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsAddModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-[#1e527a] hover:bg-[#163f5e] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="แก้ไขข้อมูลสินค้า"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>แก้ไข</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteConfirmProduct(p)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
                                title="ลบสินค้านี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ลบ</span>
                              </button>

                              {/* Quick Stock Adjust Button */}
                              <button
                                onClick={() => setStockAdjustProduct(p)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
                                title="ปรับยอดสต็อกคงเหลือ"
                              >
                                <Boxes className="w-3.5 h-3.5" />
                                <span>สต๊อก</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Exactly as in the Image */}
            <div className="p-3.5 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium">
                แสดง {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} จากทั้งหมด{' '}
                <strong className="text-slate-900">{filteredProducts.length}</strong> รายการ
              </div>

              {/* Pagination Page Numbers */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  title="หน้าแรก"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Prev Page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#1e527a] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Next Page */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  title="หน้าสุดท้าย"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Items Per Page Selector */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <span>แสดงหน้าละ:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value={6}>6</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: Tile View (แบบที่ 1: การดูแบบแผ่นป้าย)                      */}
        {/* ========================================================================= */}
        {viewMode === 'tiles' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {paginatedProducts.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -3 }}
                className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-2 relative group">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 right-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          p.stock === 0
                            ? 'bg-rose-600 text-white'
                            : p.stock <= 100
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                    {p.name}
                  </h4>
                  <div className="font-mono text-[10px] text-slate-400 mt-1">{p.barcode}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">ราคาขาย</span>
                      <span className="font-bold text-xs text-amber-700">¥ {p.sellingPrice}</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setIsAddModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-[#1e527a] text-white rounded-lg text-[10px] font-bold"
                    >
                      แก้ไข
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 3: Analytics View (แบบที่ 3: แผงควบคุมขั้นสูง)                  */}
        {/* ========================================================================= */}
        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Metrics & Valuation */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>มูลค่าและสรุปสินค้าคงคลัง</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">มูลค่าราคาทุนรวม:</span>
                    <strong className="font-mono text-slate-900">
                      ฿ {totalInventoryValue.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">มูลค่าราคาขายรวม:</span>
                    <strong className="font-mono text-emerald-600">
                      ฿ {totalRetailValue.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">กำไรคาดการณ์รวม:</span>
                    <strong className="font-mono text-blue-600">
                      ฿ {(totalRetailValue - totalInventoryValue).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">จำนวนหน่วยรวม:</span>
                    <strong className="font-bold text-slate-900">{totalUnits.toLocaleString()} หน่วย</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Chart Visualization */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <h3 className="font-bold text-sm text-slate-800 mb-2">แนวโน้มสต็อกและหมวดหมู่ (Stock over Time)</h3>
              <div className="h-48 w-full bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-center">
                <svg viewBox="0 0 400 120" className="w-full h-full stroke-blue-600 fill-none">
                  <path
                    d="M 10 90 Q 60 40, 120 70 T 220 30 T 320 60 T 390 20"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 90 Q 60 40, 120 70 T 220 30 T 320 60 T 390 20 L 390 120 L 10 120 Z"
                    className="fill-blue-500/10 stroke-none"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Add / Edit Product Modal                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>{editingProduct ? 'แก้ไขรายการสินค้า' : 'เพิ่มสินค้ารายการใหม่'}</span>
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  handleSaveProduct({
                    name: fd.get('name'),
                    barcode: fd.get('barcode'),
                    category: fd.get('category'),
                    unit: fd.get('unit'),
                    stock: parseInt(fd.get('stock')) || 0,
                    costPrice: parseFloat(fd.get('costPrice')) || 0,
                    sellingPrice: parseFloat(fd.get('sellingPrice')) || 0,
                    image:
                      fd.get('image') ||
                      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80'
                  });
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อสินค้า (Product Name) *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingProduct?.name || ''}
                    placeholder="เช่น ข้าวหอมมะลิ (Thai Jasmine Rice)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">บาร์โค้ด (Barcode) *</label>
                    <input
                      type="text"
                      name="barcode"
                      required
                      defaultValue={editingProduct?.barcode || '885' + Math.floor(100000000 + Math.random() * 900000000)}
                      className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">หมวดหมู่สินค้า *</label>
                    <input
                      type="text"
                      name="category"
                      required
                      defaultValue={editingProduct?.category || 'พืชผล & ข้าว'}
                      placeholder="เช่น ปุ๋ย & ดิน"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">สต็อกคงเหลือ *</label>
                    <input
                      type="number"
                      name="stock"
                      required
                      min={0}
                      defaultValue={editingProduct?.stock ?? 100}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">หน่วยนับ *</label>
                    <input
                      type="text"
                      name="unit"
                      required
                      defaultValue={editingProduct?.unit || 'ถุง'}
                      placeholder="ถุง, กิโล, ชิ้น"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ราคาทุน (¥) *</label>
                    <input
                      type="number"
                      name="costPrice"
                      required
                      min={0}
                      defaultValue={editingProduct?.costPrice ?? 300}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ราคาขาย (¥) *</label>
                    <input
                      type="number"
                      name="sellingPrice"
                      required
                      min={0}
                      defaultValue={editingProduct?.sellingPrice ?? 450}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">URL รูปภาพ</label>
                    <input
                      type="text"
                      name="image"
                      defaultValue={editingProduct?.image || ''}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: Quick Stock Adjustment Modal                                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {stockAdjustProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-teal-600" />
                  <span>ปรับยอดสต็อก</span>
                </h3>
                <button
                  onClick={() => setStockAdjustProduct(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="text-xs">
                  <span className="text-slate-400 block">ชื่อสินค้า</span>
                  <span className="font-bold text-slate-800 text-sm">{stockAdjustProduct.name}</span>
                </div>

                <div className="flex items-center justify-center gap-3 py-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <button
                    onClick={() =>
                      handleAdjustStock(
                        stockAdjustProduct.id,
                        Math.max(0, stockAdjustProduct.stock - 10)
                      )
                    }
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    onClick={() =>
                      handleAdjustStock(
                        stockAdjustProduct.id,
                        Math.max(0, stockAdjustProduct.stock - 1)
                      )
                    }
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    -1
                  </button>

                  <div className="text-center px-2">
                    <span className="text-xl font-black text-slate-900">
                      {stockAdjustProduct.stock}
                    </span>
                    <span className="text-xs text-slate-400 block">{stockAdjustProduct.unit}</span>
                  </div>

                  <button
                    onClick={() =>
                      handleAdjustStock(stockAdjustProduct.id, stockAdjustProduct.stock + 1)
                    }
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    onClick={() =>
                      handleAdjustStock(stockAdjustProduct.id, stockAdjustProduct.stock + 10)
                    }
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setStockAdjustProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: Delete Confirm Modal                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {(deleteConfirmProduct || isBulkDeleteModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">ยืนยันการลบรายการสินค้า</h3>
              <p className="text-xs text-slate-500 mb-4">
                {isBulkDeleteModalOpen
                  ? `คุณต้องการลบสินค้าที่เลือกจำนวน ${selectedIds.size} รายการใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
                  : `คุณต้องการลบ "${deleteConfirmProduct?.name}" ออกจากคลังสินค้าใช่หรือไม่?`}
              </p>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setDeleteConfirmProduct(null);
                    setIsBulkDeleteModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (isBulkDeleteModalOpen) {
                      handleBulkDelete();
                    } else if (deleteConfirmProduct) {
                      handleDeleteProduct(deleteConfirmProduct.id);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
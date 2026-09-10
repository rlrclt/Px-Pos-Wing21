import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  Boxes,
  ImageIcon,
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  ArrowDownToLine,
  Filter,
  Layers,
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import type {
  StockInLogEntry,
  StockInLogsSummary,
  ProductCatalog,
  Seller,
  ProductUOMConversion,
  StockInLogFilters,
} from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

export interface ProductStockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCatalog | null;
  liveSellers?: Seller[];
  liveUOMs?: ProductUOMConversion[];
  onOpenStockIn?: (barcode: string) => void;
}

export const ProductStockHistoryModal: React.FC<ProductStockHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
  liveSellers = [],
  liveUOMs = [],
  onOpenStockIn,
}) => {
  const { isLight } = useTheme();

  // ── States ──────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<StockInLogEntry[]>([]);
  const [summary, setSummary] = useState<StockInLogsSummary>({
    total_logs: 0,
    total_quantity: 0,
    total_cost_amount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<'today' | 'this_week' | 'this_month' | 'all' | 'custom'>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchProductLogs = useCallback(async () => {
    if (!product) return;
    setIsLoading(true);
    try {
      const filters: StockInLogFilters = {
        barcode: product.barcode,
        date_preset: datePreset !== 'custom' ? datePreset : undefined,
        date_from: datePreset === 'custom' && dateFrom ? dateFrom : undefined,
        date_to: datePreset === 'custom' && dateTo ? dateTo : undefined,
      };
      const res = await api.getStockInLogs(filters);
      if (res.success) {
        setLogs(res.data);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to fetch product stock in logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [product, datePreset, dateFrom, dateTo]);

  useEffect(() => {
    if (isOpen && product) {
      void fetchProductLogs();
    } else if (!isOpen) {
      setLogs([]);
      setSummary({ total_logs: 0, total_quantity: 0, total_cost_amount: 0 });
      setSearchQuery('');
    }
  }, [isOpen, product?.barcode, fetchProductLogs]);

  // Keydown ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resolved Seller & UOM Conversions
  const productSeller = useMemo(() => {
    if (!product) return null;
    return liveSellers.find((s) => s.seller_id === product.seller_id);
  }, [product, liveSellers]);

  const sellerDisplayName = productSeller
    ? `🏪 ${productSeller.seller_name} (${productSeller.seller_id})`
    : product?.seller_id
    ? `🏪 ${product.seller_id}`
    : '🏢 สินค้าส่วนกลาง (กองร้อย)';

  const productUOMs = useMemo(() => {
    if (!product) return [];
    return liveUOMs.filter((u) => u.base_barcode === product.barcode && u.is_active !== false);
  }, [product, liveUOMs]);

  // Current stock calculation
  const currentStock = product && (product as any).stock_qty !== undefined
    ? Number((product as any).stock_qty) || 0
    : 0;

  // Filtered logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(
      (l) =>
        (l.log_id && l.log_id.toLowerCase().includes(q)) ||
        (l.received_by && l.received_by.toLowerCase().includes(q)) ||
        (l.invoice_ref && l.invoice_ref.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  // Date formatting helpers
  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDateOnly = (iso: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const lastReceivedDate =
    logs.length > 0 && logs[0].received_at ? formatDateOnly(logs[0].received_at) : '-';
  const lastReceivedBy = logs.length > 0 && logs[0].received_by ? logs[0].received_by : '-';

  // Dynamic KPI calculations
  const totalQty = summary.total_quantity;
  const totalCost = summary.total_cost_amount;
  const avgCostPerUnit = totalQty > 0 ? totalCost / totalQty : Number(product?.cost_price) || 0;

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md overflow-hidden">
        {/* Fullscreen Slide-Up Modal Drawer */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className={`w-full h-full flex flex-col overflow-hidden shadow-2xl ${
            isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#0b0f19] text-slate-100'
          }`}
        >
          {/* Top Bar with Grab Handle & Actions */}
          <div className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#121624] border-[#22283a]'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                  <span>ประวัติการรับเข้าสต็อกสินค้า</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold">
                    FULLSCREEN VIEW
                  </span>
                </h2>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ตรวจสอบรายการย้อนหลัง คำนวณยอดรับเข้า และมูลค่าต้นทุน
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenStockIn && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenStockIn(product.barcode);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.97]"
                  title="รับเข้าสต็อกเพิ่มทันที"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span className="hidden sm:inline">รับเข้าสต็อกเพิ่ม</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void fetchProductLogs()}
                disabled={isLoading}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-[#181e30] hover:bg-[#222a42] border-[#29324d] text-slate-300'
                }`}
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                }`}
                title="ปิดหน้าต่าง (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Section 1: Product Profile Bento Card */}
            <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Image & Product Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-slate-100 dark:bg-[#181D2C] shrink-0 shadow-sm flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#1e2538] text-slate-300'
                      }`}>
                        {product.category || 'ทั่วไป'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{sellerDisplayName}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        product.is_active !== false
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {product.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <h1 className={`text-base sm:text-lg font-black mt-1 leading-snug truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {product.product_name}
                    </h1>

                    {/* Barcode Breakdown (ชิ้น vs แพ็ค) */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                      <div className="inline-flex items-center gap-1 font-mono font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        <span className="text-[9px] px-1 rounded bg-blue-500 text-white">ชิ้น</span>
                        <span>{product.barcode}</span>
                      </div>

                      {productUOMs.map((uom) => (
                        <div
                          key={uom.barcode}
                          className="inline-flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]"
                          title={`1 ${uom.unit_name} = ${uom.conversion_factor} ${product.unit_name || 'ชิ้น'}`}
                        >
                          <Boxes className="w-3 h-3 text-amber-500" />
                          <span>{uom.unit_name}:</span>
                          <span className="text-slate-900 dark:text-white">{uom.barcode}</span>
                          <span className="opacity-80">({uom.conversion_factor} {product.unit_name || 'ชิ้น'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Current Stock Pill with Multi-UOM */}
                <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col md:items-end justify-center shrink-0 ${
                  currentStock <= 0
                    ? isLight ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                    : currentStock < 10
                    ? isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                    : isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                }`}>
                  <span className="text-[11px] font-bold block opacity-80">สต็อกคงเหลือปัจจุบันในคลัง</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono">
                      {currentStock.toLocaleString('th-TH')}
                    </span>
                    <span className="text-xs font-bold">{product.unit_name || 'ชิ้น'}</span>
                  </div>

                  {productUOMs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 md:justify-end">
                      {productUOMs.map((uom) => {
                        const factor = Number(uom.conversion_factor) || 1;
                        const packs = Math.floor(currentStock / factor);
                        const remainder = currentStock % factor;
                        return (
                          <span
                            key={uom.barcode}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center gap-1"
                          >
                            <span>📦 {packs} {uom.unit_name}</span>
                            {remainder > 0 && (
                              <span className="opacity-80 font-sans text-[9px]">
                                +{remainder} {product.unit_name || 'ชิ้น'}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Date Filters & Presets Bar */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
            }`}>
              <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
                <span className={`text-xs font-bold mr-1 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>ช่วงเวลา:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setDatePreset('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    datePreset === 'today'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-[#1b2234] hover:bg-[#252e46] text-slate-300'
                  }`}
                >
                  วันนี้
                </button>

                <button
                  type="button"
                  onClick={() => setDatePreset('this_week')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    datePreset === 'this_week'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-[#1b2234] hover:bg-[#252e46] text-slate-300'
                  }`}
                >
                  สัปดาห์นี้ (7 วัน)
                </button>

                <button
                  type="button"
                  onClick={() => setDatePreset('this_month')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    datePreset === 'this_month'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-[#1b2234] hover:bg-[#252e46] text-slate-300'
                  }`}
                >
                  เดือนนี้
                </button>

                <button
                  type="button"
                  onClick={() => setDatePreset('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    datePreset === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-[#1b2234] hover:bg-[#252e46] text-slate-300'
                  }`}
                >
                  ทั้งหมด
                </button>

                <button
                  type="button"
                  onClick={() => setDatePreset('custom')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    datePreset === 'custom'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-[#1b2234] hover:bg-[#252e46] text-slate-300'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span>กำหนดเอง</span>
                </button>
              </div>

              {/* Custom Date Pickers & Search */}
              <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                {datePreset === 'custom' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0f1422] border-[#29324d] text-white'
                      }`}
                    />
                    <span className="text-xs text-slate-400">ถึง</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0f1422] border-[#29324d] text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => void fetchProductLogs()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                    >
                      ค้นหา
                    </button>
                  </div>
                )}

                {/* Instant Table Search */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาเลขบิล / ผู้รับ..."
                    className={`w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        : 'bg-[#0f1422] border-[#29324d] text-white focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Summary KPI Bento Grid (4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Received Qty */}
              <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ยอดรับเข้ารวม
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {totalQty.toLocaleString('th-TH')}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{product.unit_name || 'ชิ้น'}</span>
                  </div>
                  {productUOMs.length > 0 && totalQty > 0 && (
                    <div className="text-[10px] font-mono text-amber-500 font-bold mt-0.5 truncate">
                      (= {Math.floor(totalQty / (productUOMs[0].conversion_factor || 1))} {productUOMs[0].unit_name})
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Total Cost Amount */}
              <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    มูลค่าต้นทุนรวม
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
                      ฿{totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">ในช่วงเวลาที่เลือก</span>
                </div>
              </div>

              {/* Card 3: Total Batches / Logs */}
              <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    จำนวนรอบการรับเข้า
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {summary.total_logs}
                    </span>
                    <span className="text-xs font-medium text-slate-400">รอบ / ล็อต</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    ล่าสุด: {lastReceivedDate} {lastReceivedBy !== '-' ? `(${lastReceivedBy})` : ''}
                  </span>
                </div>
              </div>

              {/* Card 4: Avg Cost Per Unit */}
              <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ราคาต้นทุนเฉลี่ย
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black font-mono text-purple-500">
                      ฿{avgCostPerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-medium text-slate-400">/{product.unit_name || 'ชิ้น'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ราคาขาย: ฿{(Number(product.selling_price) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Detailed Transaction History Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-xs ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50/50 border-slate-200/90' : 'bg-[#161c2d] border-[#22283a]'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm">ตารางรายการประวัติการรับเข้า</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {filteredLogs.length} รายการ
                  </span>
                </div>

                <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  เรียงลำดับจากล่าสุด ➜ อดีต
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    กำลังโหลดข้อมูลประวัติจาก Master Sheet...
                  </span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <div className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    ไม่พบรายการรับเข้าในช่วงเวลาที่เลือก
                  </div>
                  <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    ลองเปลี่ยนช่วงเวลาตัวกรอง หรือกดปุ่ม "รับเข้าสต็อกเพิ่ม" ด้านบนเพื่อบันทึกรายการรับเข้าใหม่
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                        isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-[#161c2d] text-slate-400 border-[#22283a]'
                      }`}>
                        <tr>
                          <th className="py-3 px-4 text-center w-12">ลำดับ</th>
                          <th className="py-3 px-4">วันที่ - เวลา</th>
                          <th className="py-3 px-4 text-center">จำนวนที่รับเข้า</th>
                          <th className="py-3 px-4 text-right">ต้นทุน/หน่วย</th>
                          <th className="py-3 px-4 text-right">มูลค่ารวม</th>
                          <th className="py-3 px-4">เลขที่บิล / อ้างอิง</th>
                          <th className="py-3 px-4">ผู้บันทึก / ผู้รับ</th>
                          <th className="py-3 px-4">หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#1e2538] text-slate-300'}`}>
                        {filteredLogs.map((log, idx) => (
                          <tr key={log.log_id || idx} className={`transition ${isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#182033]/50'}`}>
                            <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-[11px] whitespace-nowrap">
                              {formatDateTime(log.received_at)}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`font-mono font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                                isLight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              }`}>
                                +{log.quantity_added.toLocaleString('th-TH')} {product.unit_name || log.unit_name || 'ชิ้น'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                              ฿{(Number(log.cost_price_unit) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-500 whitespace-nowrap">
                              ฿{(Number(log.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {log.invoice_ref ? (
                                <span className="font-bold text-blue-500">{log.invoice_ref}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-medium">
                              {log.received_by || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[160px] truncate" title={log.notes}>
                              {log.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-[#1e2538]">
                    {filteredLogs.map((log, idx) => (
                      <div key={log.log_id || idx} className={`p-4 space-y-2.5 ${isLight ? 'bg-white' : 'bg-[#131826]'}`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{formatDateTime(log.received_at)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                            isLight ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-500/10 text-indigo-300'
                          }`}>
                            +{log.quantity_added.toLocaleString('th-TH')} {product.unit_name || log.unit_name || 'ชิ้น'}
                          </span>
                          <span className="font-mono font-bold text-sm text-emerald-500">
                            ฿{(Number(log.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-[#1e2538]">
                          <span>ทุน: ฿{(Number(log.cost_price_unit) || 0).toFixed(2)}</span>
                          <span>ผู้รับ: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{log.received_by || '-'}</strong></span>
                        </div>

                        {log.invoice_ref && (
                          <div className="text-[10px] font-mono text-blue-500">
                            บิล: {log.invoice_ref}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductStockHistoryModal;

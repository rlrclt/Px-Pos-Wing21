import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  Search,
  Package,
  Boxes,
  DollarSign,
  Calendar,
  Filter,
  History,
  Layers,
  ArrowUpRight,
  Phone,
  User,
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import type {
  StockInLogEntry,
  StockInLogsSummary,
  StockInLogFilters,
  Seller,
  ProductCatalog,
  ProductUOMConversion,
} from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface StockInHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveSellers: Seller[];
  liveProducts: ProductCatalog[];
  liveUOMs?: ProductUOMConversion[];
  initialSellerId?: string;
  onOpenProductHistory?: (product: ProductCatalog) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const StockInHistoryModal: React.FC<StockInHistoryModalProps> = ({
  isOpen,
  onClose,
  liveSellers,
  liveProducts,
  liveUOMs = [],
  initialSellerId,
  onOpenProductHistory,
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
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
  const [filterSellerId, setFilterSellerId] = useState(initialSellerId || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync initialSellerId when modal opens or initialSellerId changes
  useEffect(() => {
    if (isOpen) {
      setFilterSellerId(initialSellerId || '');
    }
  }, [isOpen, initialSellerId]);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const filters: StockInLogFilters = {
        date_preset: datePreset !== 'custom' ? datePreset : undefined,
        date_from: datePreset === 'custom' ? dateFrom : undefined,
        date_to: datePreset === 'custom' ? dateTo : undefined,
        seller_id: filterSellerId || undefined,
      };
      const res = await api.getStockInLogs(filters);
      if (res.success) {
        setLogs(res.data);
        setSummary(res.summary);
      } else {
        showToast({
          type: 'error',
          title: 'โหลดประวัติไม่สำเร็จ',
          message: res.error || 'ไม่สามารถดึงข้อมูลประวัติการรับเข้าสต็อกได้',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      showToast({ type: 'error', title: 'Connection Error', message });
    } finally {
      setIsLoading(false);
    }
  };

  // Primary effect: fires when modal opens, preset (non-custom), or seller changes
  useEffect(() => {
    if (isOpen) {
      void fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, datePreset, filterSellerId]);

  // Secondary effect: custom date range — only when both dates are filled
  useEffect(() => {
    if (datePreset === 'custom' && dateFrom && dateTo) {
      void fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

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

  // ── Client-side search filter ──────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      return (
        (log.product_name && log.product_name.toLowerCase().includes(q)) ||
        (log.barcode && log.barcode.toLowerCase().includes(q)) ||
        (log.invoice_ref && log.invoice_ref.toLowerCase().includes(q)) ||
        (log.received_by && log.received_by.toLowerCase().includes(q)) ||
        (log.seller_name && log.seller_name.toLowerCase().includes(q))
      );
    });
  }, [logs, searchQuery]);

  // Distinct SKUs count
  const distinctSkuCount = useMemo(() => {
    const barcodes = new Set(filteredLogs.map((l) => l.barcode));
    return barcodes.size;
  }, [filteredLogs]);

  // Current selected seller
  const currentSeller = useMemo(() => {
    return liveSellers.find((s) => s.seller_id === filterSellerId);
  }, [liveSellers, filterSellerId]);

  // ── Date formatting helper ──────────────────────────────────────────────────
  const formatDate = (iso: string) => {
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

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  // ── Style helpers ──────────────────────────────────────────────────────────
  const inputClass = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
    : 'bg-[#0f1422] border-[#29324d] text-white placeholder-slate-500 focus:border-blue-500';

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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold shadow-xs">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                    <span>{currentSeller ? `ประวัติการรับเข้าของร้าน: ${currentSeller.seller_name}` : 'ประวัติการรับเข้าสต็อกทั้งหมด'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold">
                      FULLSCREEN VIEW
                    </span>
                  </h2>
                  {currentSeller && (
                    <button
                      onClick={() => setFilterSellerId('')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1"
                      title="คลิกเพื่อดูประวัติของทุกร้านค้า"
                    >
                      <span>รหัส: {currentSeller.seller_id} (ดูทุกร้าน ✕)</span>
                    </button>
                  )}
                </div>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {currentSeller
                    ? `ตรวจสอบบันทึกการรับสินค้าเข้าคลังเฉพาะของ ${currentSeller.seller_name} ตามช่วงเวลาที่เลือก`
                    : 'ตรวจสอบบันทึกการรับสินค้าเข้าคลัง ยอดรวมตามช่วงเวลา และเจาะลึกเฉพาะรายสินค้า'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchLogs()}
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
            {/* Seller Profile Banner if filterSellerId is active */}
            {currentSeller && (
              <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs flex items-center gap-4 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-slate-100 dark:bg-[#181D2C] shrink-0 shadow-sm flex items-center justify-center">
                  {currentSeller.avatar_url ? (
                    <img src={currentSeller.avatar_url} alt={currentSeller.seller_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-blue-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {currentSeller.seller_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      currentSeller.is_active !== false
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {currentSeller.is_active !== false ? 'ACTIVE SELLER' : 'INACTIVE'}
                    </span>
                  </div>
                  <h3 className={`text-base font-bold mt-1 leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {currentSeller.seller_name}
                  </h3>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    <span>{currentSeller.contact_info || 'ไม่มีเบอร์โทรระบุ'}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Section 1: Date Filters & Seller Selector Bar */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs ${
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

              {/* Custom Date Inputs & Search */}
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
                      onClick={() => void fetchLogs()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                    >
                      ค้นหา
                    </button>
                  </div>
                )}

                {/* Seller Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filterSellerId}
                    onChange={(e) => setFilterSellerId(e.target.value)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none transition border cursor-pointer ${inputClass}`}
                  >
                    <option value="">-- ทุกร้านค้า / ผู้ฝากขาย --</option>
                    {liveSellers.map((s) => (
                      <option key={s.seller_id} value={s.seller_id}>
                        🏪 {s.seller_name} ({s.seller_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Instant Search Input */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อ, บาร์โค้ด, เลขบิล..."
                    className={`w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        : 'bg-[#0f1422] border-[#29324d] text-white focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Summary KPI Bento Grid (4 Cards) */}
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
                    ยอดรับเข้าสุทธิ
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {summary.total_quantity.toLocaleString('th-TH')}
                    </span>
                    <span className="text-xs font-medium text-slate-400">ชิ้น / หน่วย</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">ในช่วงเวลาที่เลือก</span>
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
                    มูลค่ารับเข้ารวม
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
                      ฿{summary.total_cost_amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">มูลค่าต้นทุนสินค้า</span>
                </div>
              </div>

              {/* Card 3: Total Batches / Logs */}
              <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    จำนวนรอบรับเข้า
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {summary.total_logs}
                    </span>
                    <span className="text-xs font-medium text-slate-400">รอบ / ล็อต</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">จากฐานข้อมูล Stock_In_Logs</span>
                </div>
              </div>

              {/* Card 4: Distinct SKUs */}
              <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    สินค้าที่เคลื่อนไหว
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl font-black font-mono text-purple-500`}>
                      {distinctSkuCount}
                    </span>
                    <span className="text-xs font-medium text-slate-400">รายการ SKU</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">ไม่นับบาร์โค้ดซ้ำ</span>
                </div>
              </div>
            </div>

            {/* Section 3: Detailed Transactions History Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-xs ${
              isLight ? 'bg-white border-slate-200/90' : 'bg-[#131826] border-[#22283a]'
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50/50 border-slate-200/90' : 'bg-[#161c2d] border-[#22283a]'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm">ตารางรายการประวัติการรับเข้าทั้งหมด</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {filteredLogs.length} รายการ
                  </span>
                </div>

                <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  เรียงตามวันที่รับเข้าล่าสุด
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    กำลังโหลดประวัติการรับเข้าสต็อก...
                  </span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <div className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    ไม่พบรายการรับเข้าในช่วงเวลาที่เลือก
                  </div>
                  <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    ลองเปลี่ยนช่วงวันที่ หรือเลือกตัวกรองร้านค้าอื่นแล้วลองใหม่อีกครั้ง
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
                          <th className="py-3 px-4">วันที่ - เวลา</th>
                          <th className="py-3 px-4">สินค้า & บาร์โค้ด</th>
                          <th className="py-3 px-4 text-center">จำนวนรับเข้า</th>
                          <th className="py-3 px-4 text-right">ต้นทุน/หน่วย</th>
                          <th className="py-3 px-4 text-right">มูลค่ารวม</th>
                          <th className="py-3 px-4">ผู้ฝากขาย</th>
                          <th className="py-3 px-4">ผู้รับ / เลขบิล</th>
                          <th className="py-3 px-4 text-center">เจาะลึกสินค้า</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#1e2538] text-slate-300'}`}>
                        {filteredLogs.map((log) => {
                          const product = liveProducts.find((p) => p.barcode === log.barcode);
                          const uoms = liveUOMs.filter((u) => u.base_barcode === log.barcode);

                          return (
                            <tr key={log.log_id} className={`transition ${isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#182033]/50'}`}>
                              <td className="py-3 px-4 font-mono font-medium text-[11px] whitespace-nowrap">
                                {formatDate(log.received_at)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  {log.image_url ? (
                                    <img
                                      src={log.image_url}
                                      alt={log.product_name}
                                      className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-[#2b3a55] shrink-0"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      isLight ? 'bg-slate-100 border border-slate-200 text-slate-400' : 'bg-[#182033] border border-[#2b3a55] text-slate-500'
                                    }`}>
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div
                                      className={`font-bold truncate max-w-[200px] ${isLight ? 'text-slate-900' : 'text-white'} ${
                                        product && onOpenProductHistory ? 'cursor-pointer hover:text-blue-500' : ''
                                      }`}
                                      onClick={() => { if (product && onOpenProductHistory) onOpenProductHistory(product); }}
                                    >
                                      {log.product_name}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="font-mono text-[10px] text-blue-500 font-bold">{log.barcode}</span>
                                      {uoms.length > 0 && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                                          +{uoms.length} UOM
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className={`font-mono font-bold px-2.5 py-1 rounded-lg ${
                                  isLight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                }`}>
                                  +{log.quantity_added.toLocaleString('th-TH')} {log.unit_name || 'ชิ้น'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-medium">
                                ฿{(Number(log.cost_price_unit) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-500 whitespace-nowrap">
                                ฿{(Number(log.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4">
                                {log.seller_name ? (
                                  <span className="text-xs font-bold">🏪 {log.seller_name}</span>
                                ) : log.seller_id ? (
                                  <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{log.seller_id}</span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{log.received_by}</div>
                                {log.invoice_ref && (
                                  <div className="font-mono text-[10px] text-blue-500 font-bold truncate max-w-[140px]">{log.invoice_ref}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {product && onOpenProductHistory && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenProductHistory(product)}
                                    className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto select-none active:scale-[0.95] ${
                                      isLight
                                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                                    }`}
                                    title="ดูประวัติเฉพาะสินค้าตัวนี้"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                    <span>เจาะลึก</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-[#1e2538]">
                    {filteredLogs.map((log) => {
                      const product = liveProducts.find((p) => p.barcode === log.barcode);
                      return (
                        <div key={log.log_id} className={`p-4 space-y-2.5 ${isLight ? 'bg-white' : 'bg-[#131826]'}`}>
                          <div className="flex items-start gap-3">
                            {log.image_url ? (
                              <img
                                src={log.image_url}
                                alt={log.product_name}
                                className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-[#2b3a55] shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                isLight ? 'bg-slate-100 border border-slate-200 text-slate-400' : 'bg-[#182033] border border-[#2b3a55] text-slate-500'
                              }`}>
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`font-bold text-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'} ${
                                  product && onOpenProductHistory ? 'cursor-pointer hover:text-blue-500' : ''
                                }`}
                                onClick={() => { if (product && onOpenProductHistory) onOpenProductHistory(product); }}
                              >
                                {log.product_name}
                              </div>
                              <div className="font-mono text-[10px] text-blue-500 font-bold">{log.barcode}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.received_at)}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                              isLight ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-500/10 text-indigo-300'
                            }`}>
                              +{log.quantity_added} {log.unit_name || 'ชิ้น'}
                            </span>
                            <span className="font-mono font-bold text-sm text-emerald-500">
                              ฿{(Number(log.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-[#1e2538]">
                            <span>ผู้รับ: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{log.received_by || '-'}</strong></span>
                            {product && onOpenProductHistory && (
                              <button
                                type="button"
                                onClick={() => onOpenProductHistory(product)}
                                className="text-blue-500 font-bold flex items-center gap-0.5"
                              >
                                <span>เจาะลึกสินค้า</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

export default StockInHistoryModal;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  Users,
  Eye,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import type { Order } from '../../../types/schema.ts';
import type { BatchItem } from './BatchesTab.tsx';
import { OrderDetailModal } from './OrderDetailModal.tsx';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';

interface OrdersTabProps {
  selectedBatchId: string;
  availableBatches?: BatchItem[];
}

type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
type PaymentFilter = 'ALL' | 'CREDIT' | 'CASH' | 'TRANSFER';
type SplitFilter = 'ALL' | 'PARTY_ONLY' | 'SINGLE_ONLY';

export const OrdersTab: React.FC<OrdersTabProps> = ({
  selectedBatchId,
  availableBatches = []
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<(Order & { buyer_name?: string; buyer_unit?: string; split_count?: number })[]>([]);
  const [summary, setSummary] = useState({
    total_sales: 0,
    total_orders: 0,
    party_splits: 0,
    credit_sales: 0,
    cash_sales: 0
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [splitFilter, setSplitFilter] = useState<SplitFilter>('ALL');

  // Selected Order for Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [selectedBatchId]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOrders(selectedBatchId, {
        search: searchQuery,
        payment_method: paymentFilter,
        is_party_split: splitFilter === 'PARTY_ONLY' ? true : splitFilter === 'SINGLE_ONLY' ? false : 'ALL',
        date_preset: datePreset,
        date_from: dateFrom,
        date_to: dateTo
      });

      if (res.success) {
        setOrders(res.data);
        setSummary(res.summary);
      } else {
        showToast({
          type: 'error',
          title: 'โหลดประวัติการซื้อขายไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter in memory for immediate responsiveness
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = order.order_id.toLowerCase().includes(q);
        const matchBuyer = (order.buyer_name || '').toLowerCase().includes(q);
        const matchCode = (order.primary_buyer_code || '').toLowerCase().includes(q);
        if (!matchId && !matchBuyer && !matchCode) return false;
      }

      // 2. Payment Method Filter
      if (paymentFilter !== 'ALL' && order.payment_method !== paymentFilter) {
        return false;
      }

      // 3. Split Bill Filter
      if (splitFilter === 'PARTY_ONLY' && !order.is_party_split) return false;
      if (splitFilter === 'SINGLE_ONLY' && order.is_party_split) return false;

      // 4. Date Preset Filter (Client-side fast check)
      if (datePreset !== 'all' && order.order_datetime) {
        const orderDate = new Date(order.order_datetime);
        const now = new Date();
        if (datePreset === 'today') {
          const isToday = orderDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (datePreset === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          if (orderDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (datePreset === 'this_week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (orderDate < oneWeekAgo) return false;
        } else if (datePreset === 'this_month') {
          if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, paymentFilter, splitFilter, datePreset]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast({
        type: 'warning',
        title: 'ไม่มีข้อมูลส่งออก',
        message: 'ไม่พบรายการบิลที่ตรงกับตัวกรอง'
      });
      return;
    }

    const headers = ['รหัสบิล', 'วันเวลาที่ซื้อ', 'ผู้ซื้อหลัก / Host', 'รหัสทหาร', 'สังกัด', 'ประเภทบิล', 'จำนวนหาร', 'ยอดรวม (บาท)', 'ส่วนลด (บาท)', 'ยอดสุทธิ (บาท)', 'วิธีชำระ', 'สถานะ'];
    const rows = filteredOrders.map(o => [
      o.order_id,
      o.order_datetime ? new Date(o.order_datetime).toLocaleString('th-TH') : '',
      `"${(o.buyer_name || '').replace(/"/g, '""')}"`,
      `"${o.primary_buyer_code}"`,
      `"${o.buyer_unit || ''}"`,
      o.is_party_split ? 'หารจ่าย (Party Split)' : 'บิลเดี่ยว (Single)',
      o.is_party_split ? (o.split_count || 2) : 1,
      o.total_amount.toFixed(2),
      o.discount_total.toFixed(2),
      o.net_amount.toFixed(2),
      o.payment_method,
      o.status
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PX_Orders_${selectedBatchId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'ส่งออกข้อมูลสำเร็จ',
      message: `ดาวน์โหลดประวัติการซื้อขาย ${filteredOrders.length} รายการเรียบร้อย`
    });
  };

  const activeBatchName = availableBatches.find(b => b.batch_id === selectedBatchId)?.batch_name || selectedBatchId;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                ประวัติการซื้อขาย & ธุรกรรม
              </h2>
              <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ผลัด: <span className="font-semibold text-blue-500">{activeBatchName}</span> • บันทึกบิลการขายและรายการหารจ่ายทั้งหมด
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadOrders}
            disabled={isLoading}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95 ${
              isLight ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700' : 'bg-[#181B22] border-[#262A36] hover:bg-[#202738] text-slate-300'
            }`}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Revenue */}
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151B] border-[#222734]'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ยอดขายรวมสุทธิ
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-500">
            ฿{summary.total_sales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            จากทั้งหมด {summary.total_orders} บิล
          </p>
        </div>

        {/* Total Orders */}
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151B] border-[#222734]'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              จำนวนบิลที่เปิด
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-blue-500">
            {summary.total_orders.toLocaleString()} <span className="text-xs font-normal">บิล</span>
          </div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            บิลหารจ่าย {summary.party_splits} รายการ
          </p>
        </div>

        {/* Credit Allowance Sales */}
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151B] border-[#222734]'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ยอดเครดิตสวัสดิการ
            </span>
            <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-indigo-400">
            ฿{summary.credit_sales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            ตัดยอดเงินเดือนทหาร
          </p>
        </div>

        {/* Cash / Transfer Sales */}
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151B] border-[#222734]'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ยอดเงินสด / โอน
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-500">
            ฿{summary.cash_sales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            เข้าลิ้นชักแคชเชียร์
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามรหัสบิล, ชื่อ-สกุลทหาร, หรือรหัส PX..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-medium transition focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-slate-100'
              }`}
            />
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-slate-100'
              }`}
            >
              <option value="ALL">💳 วิธีชำระ: ทั้งหมด</option>
              <option value="CREDIT">💳 เครดิตสวัสดิการ</option>
              <option value="CASH">💵 เงินสด (Cash)</option>
              <option value="TRANSFER">📱 โอนเงิน (PromptPay)</option>
            </select>
          </div>

          {/* Party Split Bill Filter */}
          <div>
            <select
              value={splitFilter}
              onChange={(e) => setSplitFilter(e.target.value as SplitFilter)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-slate-100'
              }`}
            >
              <option value="ALL">👥 รูปแบบบิล: ทั้งหมด</option>
              <option value="SINGLE_ONLY">👤 บิลเดี่ยว (Single Bill)</option>
              <option value="PARTY_ONLY">👥 บิลหารจ่าย (Party Split)</option>
            </select>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={`text-xs font-semibold flex items-center gap-1.5 mr-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <Calendar className="w-3.5 h-3.5" /> ช่วงเวลา:
          </span>

          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'today', label: 'วันนี้' },
            { id: 'yesterday', label: 'เมื่อวาน' },
            { id: 'this_week', label: '7 วันล่าสุด' },
            { id: 'this_month', label: 'เดือนนี้' },
            { id: 'custom', label: 'กำหนดเอง' }
          ].map((preset) => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id as DatePreset)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-[#181B22] text-slate-400 hover:bg-[#202738] hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-white'
                }`}
              />
              <span className="text-xs opacity-50">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-white'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Orders Data Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isLight ? 'bg-slate-50/90 border-slate-200 text-slate-600' : 'bg-[#181B22] border-[#262A36] text-slate-400'}`}>
                <th className="py-3 px-4 font-semibold">รหัสบิล</th>
                <th className="py-3 px-4 font-semibold">วันเวลา</th>
                <th className="py-3 px-4 font-semibold">ผู้ซื้อหลัก / Host</th>
                <th className="py-3 px-4 text-center font-semibold">รูปแบบบิล</th>
                <th className="py-3 px-4 text-right font-semibold">ยอดสุทธิ</th>
                <th className="py-3 px-4 text-center font-semibold">วิธีชำระ</th>
                <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
                <th className="py-3 px-4 text-right font-semibold">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#21262d]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      กำลังโหลดรายการประวัติการขาย...
                    </span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Receipt className={`w-10 h-10 mx-auto mb-2 opacity-30 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                    <p className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      ไม่พบประวัติการซื้อขายที่ตรงกับเงื่อนไข
                    </p>
                    <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      ลองปรับคำค้นหา หรือเลือกช่วงเวลาอื่น
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isVoided = order.status === 'VOIDED';
                  return (
                    <tr
                      key={order.order_id}
                      onClick={() => setSelectedOrderId(order.order_id)}
                      className={`transition-colors cursor-pointer group ${
                        isVoided
                          ? 'opacity-50 line-through bg-rose-500/5'
                          : isLight
                            ? 'hover:bg-slate-50/80'
                            : 'hover:bg-[#181B22]/60'
                      }`}
                    >
                      {/* Order ID */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-500 group-hover:underline">
                        {order.order_id}
                      </td>

                      {/* Datetime */}
                      <td className={`py-3 px-4 whitespace-nowrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {order.order_datetime ? new Date(order.order_datetime).toLocaleString('th-TH') : '-'}
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {order.buyer_name || order.primary_buyer_code}
                        </div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                          {order.primary_buyer_code} {order.buyer_unit ? `• ${order.buyer_unit}` : ''}
                        </div>
                      </td>

                      {/* Bill Type (Single vs Party) */}
                      <td className="py-3 px-4 text-center">
                        {order.is_party_split ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                            <Users className="w-3 h-3" /> หารจ่าย ({order.split_count || 2} คน)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'
                          }`}>
                            บิลเดี่ยว
                          </span>
                        )}
                      </td>

                      {/* Net Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ฿{Number(order.net_amount).toFixed(2)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                          order.payment_method === 'CREDIT'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {order.payment_method === 'CREDIT' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                          {order.payment_method === 'CREDIT' ? 'เครดิต' : order.payment_method}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {order.status === 'VOIDED' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            ยกเลิกแล้ว
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            สำเร็จ
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.order_id)}
                          className={`p-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#181B22] hover:bg-[#222736] text-slate-300 border-[#262A36]'
                          }`}
                          title="ดูรายละเอียดบิล"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">ดูบิล</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
        batchId={selectedBatchId}
        onOrderVoided={loadOrders}
      />
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Users, ShieldAlert, CheckCircle2, 
  RefreshCw, AlertTriangle, Search, CheckSquare, 
  Square, Sparkles, RotateCcw, FileSpreadsheet
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { isBatchOperationAllowed } from '../../../core/dateUtils.ts';
import type { Soldier, SalaryTopupRequest, SalaryTopupItem } from '../../../types/schema.ts';
import type { BatchItem } from './BatchesTab.tsx';

interface SalaryTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  currentBatch?: BatchItem;
  soldiers: Soldier[];
  initialSoldier?: Soldier | null;
  currentUser?: { id?: string; name: string; role: string } | null;
  onSuccess?: () => void;
}

interface GridRowState {
  px_code: string;
  selected: boolean;
  amount: number;
  wallet_target: 'CREDIT_LIMIT' | 'CREDIT_BALANCE' | 'CASH_WALLET';
  note: string;
}

export const SalaryTopupModal: React.FC<SalaryTopupModalProps> = ({
  isOpen,
  onClose,
  batchId,
  currentBatch,
  soldiers,
  initialSoldier,
  currentUser,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [topupMode, setTopupMode] = useState<'SPREADSHEET' | 'BATCH_ALL'>('SPREADSHEET');
  const [globalNote, setGlobalNote] = useState<string>('เงินเดือน/เบี้ยเลี้ยงประจำเดือน');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Batch Mode states
  const [batchAmount, setBatchAmount] = useState<number>(2000);
  const [batchWallet, setBatchWallet] = useState<'CREDIT_LIMIT' | 'CREDIT_BALANCE' | 'CASH_WALLET'>('CREDIT_LIMIT');

  // Quick Fill Toolbar states for Spreadsheet
  const [quickFillAmount, setQuickFillAmount] = useState<number>(2000);
  const [quickFillWallet, setQuickFillWallet] = useState<'CREDIT_LIMIT' | 'CREDIT_BALANCE' | 'CASH_WALLET'>('CREDIT_LIMIT');
  const [quickFillNote, setQuickFillNote] = useState<string>('');

  // Grid rows state map by px_code
  const [gridRows, setGridRows] = useState<Record<string, GridRowState>>({});

  // Default top-up amount: use the batch default credit limit instead of a hardcoded 2000 (P2-10 fix)
  const defaultTopupAmount = useMemo(
    () => Number(currentBatch?.default_credit_limit) || 2000,
    [currentBatch]
  );

  // Initialize or update grid rows when soldiers or initialSoldier changes
  useEffect(() => {
    if (!soldiers || soldiers.length === 0) return;
    const initialMap: Record<string, GridRowState> = {};
    soldiers.forEach(s => {
      const isInitial = initialSoldier ? s.px_code === initialSoldier.px_code : s.status === 'ACTIVE';
      initialMap[s.px_code] = {
        px_code: s.px_code,
        selected: isInitial,
        amount: isInitial ? (Number(s.credit_limit) || defaultTopupAmount) : 0,
        wallet_target: 'CREDIT_LIMIT',
        note: ''
      };
    });
    setGridRows(initialMap);
  }, [soldiers, initialSoldier, isOpen, defaultTopupAmount]);

  // Unique units for filtering
  const units = useMemo(() => {
    const set = new Set<string>();
    soldiers.forEach(s => {
      if (s.unit) set.add(s.unit);
    });
    return Array.from(set).sort();
  }, [soldiers]);

  // Filtered soldiers
  const filteredSoldiers = useMemo(() => {
    return soldiers.filter(s => {
      const matchesSearch = 
        s.px_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.unit && s.unit.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesUnit = selectedUnit === 'ALL' || s.unit === selectedUnit;
      return matchesSearch && matchesUnit;
    });
  }, [soldiers, searchQuery, selectedUnit]);

  // Active soldiers count
  const activeSoldiers = useMemo(() => soldiers.filter(s => s.status === 'ACTIVE'), [soldiers]);
  const batchGuard = isBatchOperationAllowed(currentBatch?.start_date, currentBatch?.end_date);

  // Payroll period this top-up belongs to (P1-12: keep top-up logs aligned with monthly accounting)
  const currentMonthPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Toggle selection for a single row
  const toggleRowSelect = (px_code: string) => {
    setGridRows(prev => {
      const current = prev[px_code];
      const nextSelected = !current?.selected;
      return {
        ...prev,
        [px_code]: {
          ...current,
          selected: nextSelected,
          amount: nextSelected && (current?.amount || 0) === 0 ? quickFillAmount || defaultTopupAmount : current?.amount || 0
        }
      };
    });
  };

  // Update a field in a grid row
  const updateGridRow = (px_code: string, field: keyof GridRowState, value: any) => {
    setGridRows(prev => ({
      ...prev,
      [px_code]: {
        ...prev[px_code],
        [field]: value
      }
    }));
  };

  // Select all / Deselect all in filtered list
  const handleSelectAllFiltered = (select: boolean) => {
    setGridRows(prev => {
      const next = { ...prev };
      filteredSoldiers.forEach(s => {
        if (next[s.px_code]) {
          next[s.px_code] = {
            ...next[s.px_code],
            selected: select,
            amount: select && (next[s.px_code].amount || 0) === 0 ? quickFillAmount || defaultTopupAmount : next[s.px_code].amount
          };
        }
      });
      return next;
    });
  };

  // Quick fill applied to all selected rows
  const handleApplyQuickFill = () => {
    setGridRows(prev => {
      const next = { ...prev };
      let count = 0;
      Object.keys(next).forEach(px => {
        if (next[px].selected) {
          next[px] = {
            ...next[px],
            amount: quickFillAmount,
            wallet_target: quickFillWallet,
            note: quickFillNote ? quickFillNote : next[px].note
          };
          count++;
        }
      });
      showToast({
        type: 'success',
        title: 'อัปเดตข้อมูลแล้ว',
        message: `นำค่า ฿${quickFillAmount.toLocaleString()} ไปใส่ให้แถวที่เลือก ${count} นาย เรียบร้อย`
      });
      return next;
    });
  };

  // Reset all rows
  const handleResetGrid = () => {
    const resetMap: Record<string, GridRowState> = {};
    soldiers.forEach(s => {
      resetMap[s.px_code] = {
        px_code: s.px_code,
        selected: s.status === 'ACTIVE',
        amount: s.status === 'ACTIVE' ? (Number(s.credit_limit) || defaultTopupAmount) : 0,
        wallet_target: 'CREDIT_LIMIT',
        note: ''
      };
    });
    setGridRows(resetMap);
    showToast({ type: 'info', title: 'รีเซ็ตข้อมูล', message: 'คืนค่าตารางสเปรดชีตเป็นค่าเริ่มต้นแล้ว' });
  };

  // Calculations for Spreadsheet summary
  const summary = useMemo(() => {
    let selectedCount = 0;
    let totalCreditLimit = 0;
    let totalAllowance = 0;
    let totalCash = 0;
    const activeItems: SalaryTopupItem[] = [];

    Object.values(gridRows).forEach(row => {
      if (row.selected && row.amount > 0) {
        selectedCount++;
        activeItems.push({
          px_code: row.px_code,
          amount: row.amount,
          wallet_target: row.wallet_target,
          note: row.note || undefined
        });

        if (row.wallet_target === 'CREDIT_LIMIT') {
          totalCreditLimit += row.amount;
        } else if (row.wallet_target === 'CREDIT_BALANCE') {
          totalAllowance += row.amount;
        } else {
          totalCash += row.amount;
        }
      }
    });

    const grandTotal = totalCreditLimit + totalAllowance + totalCash;
    return {
      selectedCount,
      totalCreditLimit,
      totalAllowance,
      totalCash,
      grandTotal,
      activeItems
    };
  }, [gridRows]);

  if (!isOpen) return null;

  const isAllFilteredSelected = filteredSoldiers.length > 0 && filteredSoldiers.every(s => gridRows[s.px_code]?.selected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchId) {
      setError('ไม่สามารถทำรายการได้เนื่องจากยังไม่ได้เลือกผลัดทหาร');
      return;
    }

    if (!batchGuard.allowed) {
      setError(batchGuard.reason || 'ไม่อนุญาตให้ดำเนินการเนื่องจากผลัดสิ้นสุดแล้ว');
      return;
    }

    if (!globalNote.trim()) {
      setError('กรุณาระบุหมายเหตุหรือเหตุผลการเติมเงิน (จำเป็นสำหรับระบบ Audit Log)');
      return;
    }

    let payload: SalaryTopupRequest;

    if (topupMode === 'BATCH_ALL') {
      if (!batchAmount || batchAmount <= 0) {
        setError('กรุณาระบุจำนวนเงินที่ต้องการเพิ่ม');
        return;
      }
      payload = {
        batch_id: batchId,
        topup_type: 'BATCH_ALL',
        soldier_px_codes: activeSoldiers.map(s => s.px_code),
        wallet_target: batchWallet,
        amount: Number(batchAmount),
        user_id: currentUser?.id || 'ADMIN',
        user_name: currentUser?.name || 'Administrator',
        note: globalNote.trim(),
        month_period: currentMonthPeriod
      };
    } else {
      if (summary.selectedCount === 0 || summary.activeItems.length === 0) {
        setError('กรุณาเลือกทหารอย่างน้อย 1 นาย และระบุจำนวนเงินที่มากกว่า 0 บาท');
        return;
      }
      payload = {
        batch_id: batchId,
        topup_type: 'CUSTOM_GRID',
        items: summary.activeItems,
        wallet_target: 'CREDIT_LIMIT',
        user_id: currentUser?.id || 'ADMIN',
        user_name: currentUser?.name || 'Administrator',
        note: globalNote.trim(),
        month_period: currentMonthPeriod
      };
    }

    setIsSubmitting(true);
    setError(null);

    const totalToTopup = topupMode === 'BATCH_ALL' ? batchAmount * activeSoldiers.length : summary.grandTotal;
    const soldiersToTopup = topupMode === 'BATCH_ALL' ? activeSoldiers.length : summary.selectedCount;

    const toastId = showToast({
      type: 'loading',
      title: 'กำลังบันทึกการเพิ่มเงิน...',
      message: `กำลังเพิ่มเงิน ฿${totalToTopup.toLocaleString()} สำหรับทหาร ${soldiersToTopup} นาย`
    }, 0);

    try {
      const res = await api.batchSalaryTopup(batchId, payload);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'เพิ่มเงินเดือน/เบี้ยเลี้ยงสำเร็จ!',
          message: `เพิ่มเงิน ฿${totalToTopup.toLocaleString()} ให้ทหาร ${soldiersToTopup} นาย เรียบร้อย (Audit Log บันทึกแล้ว)`
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.error || 'ไม่สามารถเพิ่มเงินได้');
        showToast({ type: 'error', title: 'การทำรายการล้มเหลว', message: res.error });
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 md:p-3 overflow-hidden">
      <div className={`border rounded-none sm:rounded-2xl w-full h-full sm:h-[98vh] max-w-[100vw] sm:max-w-[99vw] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  เติมเงินเดือน / เบี้ยเลี้ยง (Salary Top-up Data Grid)
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  batchId 
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {batchId ? `ผลัด ${currentBatch?.batch_name || batchId}` : 'ยังไม่ได้เลือกผลัด'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {batchId 
                  ? 'กำหนดประเภทกระเป๋าและจำนวนเงินรายบุคคลคล้าย Google Sheet พร้อมเครื่องมือเติมข้อมูลกลุ่ม' 
                  : 'กรุณาเลือกผลัดทหารก่อนเริ่มต้นเติมเงินเดือนหรือเบี้ยเลี้ยง'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            {batchId && (
              <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-semibold ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#161b26] border-[#262A36]'
              }`}>
                <button
                  type="button"
                  onClick={() => setTopupMode('SPREADSHEET')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    topupMode === 'SPREADSHEET'
                      ? isLight ? 'bg-white shadow text-blue-600 font-bold' : 'bg-blue-600 text-white font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ตารางสเปรดชีตรายบุคคล
                </button>
                <button
                  type="button"
                  onClick={() => setTopupMode('BATCH_ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    topupMode === 'BATCH_ALL'
                      ? isLight ? 'bg-white shadow text-blue-600 font-bold' : 'bg-blue-600 text-white font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  เติมเท่ากันทั้งผลัด ({activeSoldiers.length})
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expired Batch Warning */}
        {batchId && !batchGuard.allowed && (
          <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/30 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs shrink-0">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div>
              <strong>คำเตือน:</strong> {batchGuard.reason}
            </div>
          </div>
        )}

        {/* Main Form Body */}
        {!batchId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 mb-4 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className={`text-base sm:text-lg font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              ยังไม่ได้เลือกผลัดทหาร
            </h3>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-6 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ฟีเจอร์ "เติมเงินเดือน / เบี้ยเลี้ยง (Salary Top-up Data Grid)" จำเป็นต้องผูกกับผลัดทหารเพื่อดึงรายชื่อและเพิ่มยอดเงินเข้ากระเป๋า กรุณาเลือกผลัดทหารก่อนดำเนินการ
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer transition active:scale-95 shadow-md"
            >
              เข้าใจแล้ว / ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          
          {error && (
            <div className={`mx-5 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs shrink-0 ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {topupMode === 'SPREADSHEET' ? (
            <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden space-y-3">
              
              {/* Toolbar Row: Search, Filter, Quick Fill Toolbar */}
              <div className={`p-3 rounded-xl border space-y-3 shrink-0 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29]/70 border-[#21262d]'
              }`}>
                {/* Search & Filter Line */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อ, รหัส PX, หรือสังกัด..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none transition-colors ${
                          isLight 
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                            : 'bg-[#181d2a] border-[#2b3a55] text-white focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none transition-colors ${
                        isLight 
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                          : 'bg-[#181d2a] border-[#2b3a55] text-white focus:border-blue-500'
                      }`}
                    >
                      <option value="ALL">ทุกสังกัด / หมวด ({soldiers.length})</option>
                      {units.map(u => (
                        <option key={u} value={u}>
                          {u} ({soldiers.filter(s => s.unit === u).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(!isAllFilteredSelected)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isLight 
                          ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700' 
                          : 'bg-[#1c2438] border-[#2b3a55] hover:bg-[#283550] text-slate-300'
                      }`}
                    >
                      {isAllFilteredSelected ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                          ยกเลิกเลือกทั้งหมด
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          เลือกทั้งหมดในตาราง ({filteredSoldiers.length})
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleResetGrid}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                        isLight 
                          ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600' 
                          : 'bg-[#161b26] border-[#262A36] hover:bg-[#202637] text-slate-400'
                      }`}
                      title="รีเซ็ตค่าทั้งหมด"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      รีเซ็ต
                    </button>
                  </div>
                </div>

                {/* Quick-Fill Batch Helper Toolbar */}
                <div className={`p-2.5 rounded-lg border flex flex-wrap items-center gap-2 text-xs ${
                  isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-950/20 border-blue-900/40'
                }`}>
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ ใส่ค่าด่วนให้แถวที่เลือก:</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">กระเป๋า:</label>
                    <select
                      value={quickFillWallet}
                      onChange={(e) => setQuickFillWallet(e.target.value as any)}
                      className={`px-2 py-1 rounded-md border text-xs font-semibold focus:outline-none ${
                        isLight ? 'bg-white border-blue-300 text-slate-900' : 'bg-[#181d2a] border-blue-800 text-white'
                      }`}
                    >
                      <option value="CREDIT_LIMIT">💳 ปรับวงเงิน (Credit Limit)</option>
                      <option value="CREDIT_BALANCE">➕ เบี้ยเลี้ยง (Allowance)</option>
                      <option value="CASH_WALLET">💵 เงินสด (Cash Wallet)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">จำนวน (฿):</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={quickFillAmount}
                      onChange={(e) => setQuickFillAmount(Number(e.target.value) || 0)}
                      className={`w-24 px-2 py-1 rounded-md border font-mono font-bold text-xs text-right focus:outline-none ${
                        isLight ? 'bg-white border-blue-300 text-slate-900' : 'bg-[#181d2a] border-blue-800 text-white'
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
                    <input
                      type="text"
                      placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
                      value={quickFillNote}
                      onChange={(e) => setQuickFillNote(e.target.value)}
                      className={`w-full px-2 py-1 rounded-md border text-xs focus:outline-none ${
                        isLight ? 'bg-white border-blue-300 text-slate-900' : 'bg-[#181d2a] border-blue-800 text-white'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyQuickFill}
                    className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    ใส่ข้อมูลให้ {summary.selectedCount} แถว
                  </button>
                </div>
              </div>

              {/* Spreadsheet Grid Table */}
              <div className={`flex-1 min-h-0 border rounded-xl overflow-hidden flex flex-col ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#121724] border-[#21262d]'
              }`}>
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 divide-y divide-slate-200 dark:divide-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`sticky top-0 z-10 select-none font-bold text-[11px] uppercase tracking-wider ${
                      isLight ? 'bg-slate-100 text-slate-700 border-b border-slate-200' : 'bg-[#181e2d] text-slate-300 border-b border-[#21262d]'
                    }`}>
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                            className="rounded cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5 w-28">รหัสทหาร</th>
                        <th className="p-2.5 min-w-[150px]">ชื่อ-สกุล</th>
                        <th className="p-2.5 w-28">สังกัด</th>
                        <th className="p-2.5 w-36">ยอดปัจจุบัน (วงเงิน/เบี้ยเลี้ยง/สด)</th>
                        <th className="p-2.5 w-44">กระเป๋าที่จะเพิ่ม</th>
                        <th className="p-2.5 w-32 text-right">จำนวนที่จะเพิ่ม (฿)</th>
                        <th className="p-2.5 min-w-[130px]">หมายเหตุเฉพาะคน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {filteredSoldiers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            ไม่พบรายชื่อทหารที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        filteredSoldiers.map((soldier, idx) => {
                          const row = gridRows[soldier.px_code] || {
                            px_code: soldier.px_code,
                            selected: false,
                            amount: 0,
                            wallet_target: 'CREDIT_LIMIT',
                            note: ''
                          };

                          const isSelected = row.selected;

                          return (
                            <tr
                              key={soldier.px_code}
                              className={`transition-colors ${
                                isSelected
                                  ? isLight 
                                    ? 'bg-blue-50/60 hover:bg-blue-50' 
                                    : 'bg-blue-950/20 hover:bg-blue-950/30'
                                  : isLight 
                                    ? 'hover:bg-slate-50' 
                                    : 'hover:bg-[#161c2b]/50'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRowSelect(soldier.px_code)}
                                  className="rounded cursor-pointer"
                                />
                              </td>

                              {/* Index */}
                              <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                                {idx + 1}
                              </td>

                              {/* PX Code */}
                              <td className="p-2 font-mono font-bold text-blue-500">
                                {soldier.px_code}
                              </td>

                              {/* Name & Status */}
                              <td className="p-2">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {soldier.full_name}
                                </div>
                                {soldier.status !== 'ACTIVE' && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-mono">
                                    {soldier.status}
                                  </span>
                                )}
                              </td>

                              {/* Unit */}
                              <td className="p-2 text-slate-500 dark:text-slate-400">
                                {soldier.unit || '-'}
                              </td>

                              {/* Current Balances */}
                              <td className="p-2 font-mono text-[11px]">
                                <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400">
                                  <div className="flex justify-between">
                                    <span>วงเงิน:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">฿{(soldier.credit_limit || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>เบี้ยเลี้ยง:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">฿{(soldier.credit_allowance_balance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>เงินสด:</span>
                                    <span className="text-amber-600 dark:text-amber-400">฿{(soldier.cash_wallet_balance || 0).toLocaleString()}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Target Wallet Dropdown */}
                              <td className="p-2">
                                <select
                                  disabled={!isSelected}
                                  value={row.wallet_target}
                                  onChange={(e) => updateGridRow(soldier.px_code, 'wallet_target', e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none transition-colors ${
                                    !isSelected 
                                      ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
                                      : isLight 
                                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 shadow-xs' 
                                        : 'bg-[#181d2a] border-[#2b3a55] text-white focus:border-blue-500'
                                  }`}
                                >
                                  <option value="CREDIT_LIMIT">💳 ปรับวงเงิน (Limit)</option>
                                  <option value="CREDIT_BALANCE">➕ เบี้ยเลี้ยง (Allowance)</option>
                                  <option value="CASH_WALLET">💵 เงินสด (Cash)</option>
                                </select>
                              </td>

                              {/* Amount Input */}
                              <td className="p-2 text-right">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    disabled={!isSelected}
                                    value={row.amount}
                                    onChange={(e) => updateGridRow(soldier.px_code, 'amount', Number(e.target.value) || 0)}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-right focus:outline-none transition-colors ${
                                      !isSelected 
                                        ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
                                        : (row.amount > 0)
                                          ? isLight
                                            ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800 focus:border-emerald-500 shadow-xs'
                                            : 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300 focus:border-emerald-500'
                                          : isLight
                                            ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                                            : 'bg-[#181d2a] border-[#2b3a55] text-white focus:border-blue-500'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Row Note */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  disabled={!isSelected}
                                  placeholder="เฉพาะคนนี้..."
                                  value={row.note}
                                  onChange={(e) => updateGridRow(soldier.px_code, 'note', e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none transition-colors ${
                                    !isSelected 
                                      ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
                                      : isLight 
                                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                                        : 'bg-[#181d2a] border-[#2b3a55] text-white focus:border-blue-500'
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Helper */}
                <div className={`px-4 py-2 border-t flex items-center justify-between text-[11px] text-slate-400 font-mono ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
                }`}>
                  <div>
                    แสดง {filteredSoldiers.length} จากทั้งหมด {soldiers.length} นาย (เลือกใช้งาน {summary.selectedCount} นาย)
                  </div>
                  <div>
                    ทิป: กด <strong className="text-blue-500">เลือกทั้งหมด</strong> หรือใช้ <strong className="text-blue-500">⚡ ใส่ค่าด่วน</strong> เพื่อเติมข้อมูลเป็นกลุ่มได้อย่างรวดเร็ว
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Quick Batch Mode Form */
            <div className="p-6 space-y-4 text-xs max-w-xl mx-auto w-full">
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                isLight ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-blue-950/20 border-blue-900/40 text-blue-300'
              }`}>
                <Users className="w-6 h-6 text-blue-500 shrink-0" />
                <div>
                  <div className="font-bold text-sm">เติมเงินเท่ากันทั้งผลัด</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    จะทำการเพิ่มเงินให้ทหารที่มีสถานะ ACTIVE ทุกนายในผลัด {batchId} จำนวน <strong>{activeSoldiers.length} นาย</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ประเภทกระเป๋าที่เพิ่ม
                  </label>
                  <select
                    value={batchWallet}
                    onChange={(e) => setBatchWallet(e.target.value as any)}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600' 
                        : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  >
                    <option value="CREDIT_LIMIT">💳 ปรับวงเงินสวัสดิการ (Credit Limit)</option>
                    <option value="CREDIT_BALANCE">➕ เติมยอดคงเหลือสวัสดิการ (Allowance)</option>
                    <option value="CASH_WALLET">💵 เติมกระเป๋าเงินสด (Cash Wallet)</option>
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    จำนวนเงินที่เพิ่มต่อคน (฿) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    required
                    value={batchAmount}
                    onChange={(e) => setBatchAmount(Number(e.target.value) || 0)}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2.5 rounded-xl border font-mono font-bold text-xs focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600' 
                        : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
              }`}>
                <div>
                  <div className="font-semibold text-xs">ยอดรวมที่จะทำการเพิ่ม:</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {activeSoldiers.length} นาย × ฿{batchAmount.toLocaleString()}
                  </div>
                </div>
                <strong className="font-mono text-xl text-emerald-600 dark:text-emerald-400">
                  ฿{(activeSoldiers.length * batchAmount).toLocaleString()}
                </strong>
              </div>
            </div>
          )}

          {/* Bottom Audit & Summary Footer */}
          <div className={`p-4 border-t shrink-0 space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
          }`}>
            {/* Global Note & Audit Info */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    หมายเหตุ / เหตุผลการทำรายการ (บันทึกลง Audit Log) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    ผู้ดำเนินการ: <strong className="text-blue-500">{currentUser?.id || 'ADMIN'} ({currentUser?.name || 'Admin'})</strong>
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="เช่น เงินเดือนประจำเดือน ต.ค. 2569, เบี้ยเลี้ยงพิเศษฝึกภาคสนาม, เงินตกเบิก"
                  value={globalNote}
                  onChange={(e) => setGlobalNote(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Summary Stats Chips */}
              <div className="flex items-center gap-2 font-mono text-xs">
                {topupMode === 'SPREADSHEET' ? (
                  <div className={`p-2.5 rounded-xl border flex items-center gap-3 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#181e2d] border-[#262e40]'
                  }`}>
                    <div className="text-center px-1">
                      <div className="text-[10px] text-slate-400">ทหารเป้าหมาย</div>
                      <div className="font-bold text-blue-500">{summary.selectedCount} นาย</div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center px-1">
                      <div className="text-[10px] text-slate-400">รวมวงเงิน</div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">฿{summary.totalCreditLimit.toLocaleString()}</div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center px-1">
                      <div className="text-[10px] text-slate-400">รวมเบี้ยเลี้ยง</div>
                      <div className="font-bold text-emerald-500">฿{summary.totalAllowance.toLocaleString()}</div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center px-1">
                      <div className="text-[10px] text-slate-400">รวมเงินสด</div>
                      <div className="font-bold text-amber-500">฿{summary.totalCash.toLocaleString()}</div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center px-1">
                      <div className="text-[10px] text-slate-400">ยอดรวมทั้งสิ้น</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">฿{summary.grandTotal.toLocaleString()}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-400 font-mono">
                Audit Trail: Credit_Logs_{batchId}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
                  }`}
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting || 
                    !batchGuard.allowed || 
                    !globalNote.trim() || 
                    (topupMode === 'SPREADSHEET' && (summary.selectedCount === 0 || summary.grandTotal <= 0)) ||
                    (topupMode === 'BATCH_ALL' && batchAmount <= 0)
                  }
                  className="px-5 py-2 text-white text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {topupMode === 'SPREADSHEET' 
                        ? `ยืนยันการเติมเงิน (${summary.selectedCount} นาย / ฿${summary.grandTotal.toLocaleString()})`
                        : `ยืนยันการเติมเงินทั้งผลัด (฿${(activeSoldiers.length * batchAmount).toLocaleString()})`
                      }
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </form>
        )}
      </div>
    </div>
  );
};

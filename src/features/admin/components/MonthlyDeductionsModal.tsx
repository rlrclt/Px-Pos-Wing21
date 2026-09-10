import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  X, Scissors, Shirt, PiggyBank, HeartHandshake, Package, Plus, Trash2, 
  RefreshCw, Calculator, CheckCircle2, ShieldAlert,
  UtensilsCrossed, Zap, Stethoscope, Shield, AlertTriangle, Calendar,
  History, Search
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { isBatchOperationAllowed, generateBatchMonths, formatMonthKeyDisplay, formatBatchDateDisplay } from '../../../core/dateUtils.ts';
import { PayrollCalendarModal, fetchPayrollSchedules, buildDefaultPayrollSchedules, computeScheduleStatus } from './PayrollCalendarModal.tsx';
import type { Soldier, DeductionConfigItem, DeductionCategory, DeductionScheduleType, MonthlyPayrollSchedule, CompletedDeductionRecord } from '../../../types/schema.ts';
import type { BatchItem } from './BatchesTab.tsx';

interface MonthlyDeductionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  currentBatch?: BatchItem;
  soldiers: Soldier[];
  currentUser?: { id?: string; name: string; role: string } | null;
  onSuccess?: () => void;
  onOpenPayrollCalendar?: () => void;
}

export type { CompletedDeductionRecord };

const CATEGORY_METADATA: Record<DeductionCategory, { label: string; icon: React.ReactNode; color: string; defaultAmount: number }> = {
  HAIRCUT: { label: 'ตัดผม', icon: <Scissors className="w-4 h-4" />, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', defaultAmount: 80 },
  LAUNDRY: { label: 'ซักรีด', icon: <Shirt className="w-4 h-4" />, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', defaultAmount: 150 },
  MESS_HALL: { label: 'อาหารโรงเลี้ยง', icon: <UtensilsCrossed className="w-4 h-4" />, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', defaultAmount: 600 },
  SAVINGS: { label: 'เงินออม/สะสม', icon: <PiggyBank className="w-4 h-4" />, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', defaultAmount: 500 },
  WELFARE: { label: 'สวัสดิการกองร้อย', icon: <HeartHandshake className="w-4 h-4" />, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', defaultAmount: 100 },
  UTILITY: { label: 'สาธารณูปโภค', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', defaultAmount: 50 },
  MEDICAL: { label: 'พยาบาล/ยา', icon: <Stethoscope className="w-4 h-4" />, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', defaultAmount: 50 },
  GEAR: { label: 'เครื่องแบบ/อุปกรณ์', icon: <Shield className="w-4 h-4" />, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', defaultAmount: 200 },
  OTHER: { label: 'อื่นๆ', icon: <Package className="w-4 h-4" />, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20', defaultAmount: 100 }
};

const DEFAULT_DEDUCTION_TEMPLATES: DeductionConfigItem[] = [
  { id: 'ded_haircut', name: 'ค่าตัดผมประจำเดือน', amount: 80, category: 'HAIRCUT', schedule_type: 'MONTHLY_RECURRING', target_wallet: 'SALARY', is_enabled: true },
  { id: 'ded_laundry', name: 'ค่าจ้างซักรีดเครื่องแบบ', amount: 150, category: 'LAUNDRY', schedule_type: 'MONTHLY_RECURRING', target_wallet: 'SALARY', is_enabled: true },
  { id: 'ded_mess', name: 'ค่าอาหารโรงเลี้ยงภาคสนาม', amount: 600, category: 'MESS_HALL', schedule_type: 'DATE_RANGE', target_wallet: 'SALARY', is_enabled: true, start_date: '', end_date: '' },
  { id: 'ded_savings', name: 'เงินออม / เงินสะสมพิเศษ', amount: 500, category: 'SAVINGS', schedule_type: 'MONTHLY_RECURRING', target_wallet: 'SALARY', is_enabled: true },
  { id: 'ded_welfare', name: 'กองทุนสวัสดิการกองร้อย', amount: 100, category: 'WELFARE', schedule_type: 'MONTHLY_RECURRING', target_wallet: 'SALARY', is_enabled: false },
  { id: 'ded_gear', name: 'ค่าเครื่องแบบแรกเข้าประจำการ', amount: 350, category: 'GEAR', schedule_type: 'ONE_TIME', target_wallet: 'SALARY', is_enabled: false }
];

export const MonthlyDeductionsModal: React.FC<MonthlyDeductionsModalProps> = ({
  isOpen,
  onClose,
  batchId,
  currentBatch,
  soldiers,
  currentUser,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  // Legacy localStorage keys — used only for one-time migration to the server
  const storageKey = `px_batch_deductions_${batchId}`;
  const historyStorageKey = `px_batch_deduction_history_${batchId}`;

  const [activeTab, setActiveTab] = useState<'SETUP' | 'HISTORY'>('SETUP');

  const batchMonths = useMemo(() => {
    return generateBatchMonths(currentBatch?.start_date, currentBatch?.end_date);
  }, [currentBatch?.start_date, currentBatch?.end_date]);

  const [items, setItems] = useState<DeductionConfigItem[]>(DEFAULT_DEDUCTION_TEMPLATES);
  const [history, setHistory] = useState<CompletedDeductionRecord[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const hasLoadedRef = useRef(false);

  /**
   * Load deduction configs + execution history from the backend so every device
   * sees the same data. Legacy localStorage values are migrated once (P0-2 fix).
   */
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !batchId) return;

    (async () => {
      const [cfgRes, histRes] = await Promise.all([
        api.getDeductionConfigs(batchId),
        api.getDeductionHistory(batchId)
      ]);
      if (cancelled) return;

      if (Array.isArray(cfgRes.data) && cfgRes.data.length > 0) {
        setItems(cfgRes.data);
      } else {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
              api.saveDeductionConfigs(batchId, parsed).catch(() => {});
            }
          }
        } catch (e) {}
      }

      if (Array.isArray(histRes.data) && histRes.data.length > 0) {
        setHistory(histRes.data);
      } else {
        try {
          const rawHistory = localStorage.getItem(historyStorageKey);
          if (rawHistory) {
            const parsedHistory = JSON.parse(rawHistory);
            if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
              setHistory(parsedHistory);
              parsedHistory.forEach((rec: CompletedDeductionRecord) => {
                api.saveDeductionHistory(batchId, rec).catch(() => {});
              });
            }
          }
        } catch (e) {}
      }

      hasLoadedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [isOpen, batchId, storageKey, historyStorageKey]);

  // Persist deduction config changes to the backend (shared across all devices)
  useEffect(() => {
    if (!isOpen || !batchId || !hasLoadedRef.current) return;
    api.saveDeductionConfigs(batchId, items).catch(() => {});
  }, [items, isOpen, batchId]);

  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  
  const [monthPeriod, setMonthPeriod] = useState<string>(() => {
    if (batchMonths.length > 0) {
      const active = batchMonths.find(m => m.isCurrent);
      if (active) return active.key;
      return batchMonths[0].key;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (batchMonths.length > 0) {
      const active = batchMonths.find(m => m.isCurrent);
      if (active) {
        setMonthPeriod(active.key);
      } else if (!batchMonths.some(m => m.key === monthPeriod)) {
        setMonthPeriod(batchMonths[0].key);
      }
    }
  }, [batchMonths]);

  const [payrollSchedules, setPayrollSchedules] = useState<MonthlyPayrollSchedule[]>(() =>
    buildDefaultPayrollSchedules(currentBatch)
  );
  const [isPayrollCalendarOpen, setIsPayrollCalendarOpen] = useState(false);

  const refreshSchedules = useCallback(async () => {
    if (!batchId) return;
    const list = await fetchPayrollSchedules(batchId, currentBatch);
    setPayrollSchedules(list);
  }, [batchId, currentBatch]);

  // Always pull the latest payroll calendar from the backend when the modal opens
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !batchId) return;
    fetchPayrollSchedules(batchId, currentBatch).then(list => {
      if (!cancelled) setPayrollSchedules(list);
    });
    return () => { cancelled = true; };
  }, [isOpen, batchId, currentBatch]);

  const activeSchedule = useMemo(() => {
    const found = payrollSchedules.find(s => s.month_key === monthPeriod);
    if (found) return found;

    // Fallback aligned with the PayrollCalendar defaults (P1-8 fix):
    // cutoff = 25th of the work month, payday = 5th of the NEXT month
    const defaults = buildDefaultPayrollSchedules(currentBatch);
    const match = defaults.find(s => s.month_key === monthPeriod);
    if (match) return match;

    const y = parseInt(monthPeriod.split('-')[0], 10);
    const m = parseInt(monthPeriod.split('-')[1], 10);
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const cutoff = `${monthPeriod}-25`;
    const payday = `${nextY}-${String(nextM).padStart(2, '0')}-05`;
    return {
      month_key: monthPeriod,
      month_label: formatMonthKeyDisplay(monthPeriod),
      payday_date: payday,
      cutoff_date: cutoff,
      salary_base: 10000,
      auto_deduct_enabled: true,
      status: computeScheduleStatus(cutoff, payday)
    };
  }, [payrollSchedules, monthPeriod, currentBatch]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState<number>(100);
  const [newItemCategory, setNewItemCategory] = useState<DeductionCategory>('HAIRCUT');
  const [newItemTargetWallet, setNewItemTargetWallet] = useState<'ALLOWANCE' | 'CASH' | 'SALARY'>('SALARY');

  const [deletingItem, setDeletingItem] = useState<DeductionConfigItem | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmSummary, setShowConfirmSummary] = useState(false);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    soldiers.forEach(s => {
      if (s.unit && s.unit.trim()) set.add(s.unit.trim());
    });
    return Array.from(set).sort();
  }, [soldiers]);

  const targetSoldiers = useMemo(() => {
    return soldiers.filter(s => {
      if (s.status !== 'ACTIVE') return false;
      if (selectedUnit !== 'ALL' && s.unit !== selectedUnit) return false;
      return true;
    });
  }, [soldiers, selectedUnit]);

  const enabledItems = useMemo(() => items.filter(i => i.is_enabled && i.amount > 0), [items]);
  
  const salaryDeductions = useMemo(() => 
    enabledItems.filter(i => (i.target_wallet || 'SALARY') === 'SALARY').reduce((sum, i) => sum + i.amount, 0),
    [enabledItems]
  );
  const allowanceDeductions = useMemo(() => 
    enabledItems.filter(i => i.target_wallet === 'ALLOWANCE').reduce((sum, i) => sum + i.amount, 0),
    [enabledItems]
  );
  const cashDeductions = useMemo(() => 
    enabledItems.filter(i => i.target_wallet === 'CASH').reduce((sum, i) => sum + i.amount, 0),
    [enabledItems]
  );
  
  const deductionPerSoldier = useMemo(() => salaryDeductions + allowanceDeductions + cashDeductions, [salaryDeductions, allowanceDeductions, cashDeductions]);
  const grandTotalDeductions = useMemo(() => deductionPerSoldier * targetSoldiers.length, [deductionPerSoldier, targetSoldiers]);

  const baseSalary = activeSchedule.salary_base || 10000;
  const netEstimatedSalaryPerSoldier = Math.max(0, baseSalary - salaryDeductions);
  const grandTotalNetSalary = netEstimatedSalaryPerSoldier * targetSoldiers.length;

  const batchGuard = isBatchOperationAllowed(currentBatch?.start_date, currentBatch?.end_date);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const query = historySearch.toLowerCase();
    return history.filter(h => 
      h.month_label.toLowerCase().includes(query) ||
      h.month_period.toLowerCase().includes(query) ||
      h.executed_by_name.toLowerCase().includes(query) ||
      h.executed_by_id.toLowerCase().includes(query)
    );
  }, [history, historySearch]);

  if (!isOpen) return null;

  const handleToggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_enabled: !i.is_enabled } : i));
  };

  const handleUpdateAmount = (id: string, amount: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, amount: Math.max(0, amount) } : i));
  };

  const handleUpdateScheduleType = (id: string, schedule_type: DeductionScheduleType) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, schedule_type } : i));
  };

  const handleUpdateTargetWallet = (id: string, target_wallet: 'ALLOWANCE' | 'CASH' | 'SALARY') => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, target_wallet } : i));
  };

  const handleUpdateDates = (id: string, start_date?: string, end_date?: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, start_date: start_date !== undefined ? start_date : i.start_date, end_date: end_date !== undefined ? end_date : i.end_date } : i));
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    setItems(prev => prev.filter(i => i.id !== deletingItem.id));
    setDeletingItem(null);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: DeductionConfigItem = {
      id: `ded_${Date.now()}`,
      name: newItemName.trim(),
      amount: Math.max(0, newItemAmount),
      category: newItemCategory,
      schedule_type: 'MONTHLY_RECURRING',
      target_wallet: newItemTargetWallet,
      is_enabled: true
    };

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    showToast({ type: 'success', title: 'เพิ่มรายการแล้ว', message: `${newItem.name}` });
  };

  const handleExecute = async () => {
    if (!batchId) {
      showToast({ type: 'error', title: 'ไม่อนุญาต', message: 'กรุณาเลือกผลัดทหารก่อนดำเนินการ' });
      return;
    }

    if (!batchGuard.allowed) {
      showToast({ type: 'error', title: 'ไม่อนุญาต', message: batchGuard.reason });
      return;
    }

    setIsExecuting(true);
    setShowConfirmSummary(false);

    try {
      const res = await api.executeBatchDeductions(batchId, {
        batch_id: batchId,
        month_period: monthPeriod,
        deduction_items: enabledItems,
        target_soldier_ids: targetSoldiers.map(s => s.px_code),
        admin_user_id: currentUser?.id || 'ADMIN',
        admin_name: currentUser?.name || 'Administrator'
      });

      if (res.success) {
        const newRecord: CompletedDeductionRecord = {
          id: `DED-REC-${Date.now()}`,
          month_period: monthPeriod,
          month_label: activeSchedule.month_label,
          executed_at: new Date().toISOString(),
          executed_by_id: currentUser?.id || 'ADMIN',
          executed_by_name: currentUser?.name || 'Administrator',
          target_soldier_count: targetSoldiers.length,
          total_deduction_amount: grandTotalDeductions,
          per_soldier_amount: deductionPerSoldier,
          salary_deductions: salaryDeductions,
          allowance_deductions: allowanceDeductions,
          cash_deductions: cashDeductions,
          items_snapshot: [...enabledItems],
          status: 'COMPLETED'
        };

        setHistory(prev => [newRecord, ...prev]);

        // ONE_TIME items are switched off after a successful run so they never double-charge,
        // then both the history record and the updated config are persisted on the backend.
        const nextItems = items.map(it => it.schedule_type === 'ONE_TIME' ? { ...it, is_enabled: false } : it);
        setItems(nextItems);
        await api.saveDeductionHistory(batchId, newRecord).catch(() => {});
        await api.saveDeductionConfigs(batchId, nextItems).catch(() => {});

        showToast({ type: 'success', title: 'สำเร็จ', message: 'บันทึกการตัดยอดเรียบร้อย' });
        if (onSuccess) onSuccess();
        setActiveTab('HISTORY');
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearHistoryItem = (id: string) => {
    if (!window.confirm('ยืนยันลบประวัติ?')) return;
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 md:p-3 overflow-hidden">
      <div className={`border rounded-none sm:rounded-2xl w-full h-full sm:h-[98vh] max-w-[100vw] sm:max-w-[99vw] overflow-hidden shadow-2xl flex flex-col ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  จัดการหักค่าใช้จ่ายประจำเดือน (Monthly Deductions)
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
                  ? 'กำหนดรายการหัก, ช่วงเวลา, รูปแบบความถี่ พร้อมดูประวัติการตัดยอดที่สำเร็จแล้ว' 
                  : 'กรุณาเลือกผลัดทหารก่อนเริ่มต้นตั้งค่ารายการหักประจำเดือน'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            {batchId && (
              <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-semibold ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#161b26] border-[#262A36]'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('SETUP')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'SETUP'
                      ? isLight ? 'bg-white shadow text-amber-600 font-bold' : 'bg-amber-600 text-white font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  ตั้งค่ารายการหัก & ตัดยอด
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'HISTORY'
                      ? isLight ? 'bg-white shadow text-amber-600 font-bold' : 'bg-amber-600 text-white font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  ประวัติที่ตัดยอดสำเร็จแล้ว ({history.length})
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              disabled={isExecuting}
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

        {/* Main Content Body */}
        {!batchId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 mb-4 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className={`text-base sm:text-lg font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              ยังไม่ได้เลือกผลัดทหาร
            </h3>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-6 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ฟีเจอร์ "จัดการหักค่าใช้จ่ายประจำเดือน (Monthly Deductions)" ต้องทำงานภายใต้ผลัดทหารเพื่อคำนวณและตัดยอดเงินรายบุคคล กรุณาเลือกผลัดทหารก่อนดำเนินการ
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer transition active:scale-95 shadow-md"
            >
              เข้าใจแล้ว / ปิดหน้าต่าง
            </button>
          </div>
        ) : activeTab === 'SETUP' ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:grid lg:grid-cols-12 lg:gap-0">
            
            {/* Left Column: Setup Forms & Deduction Items (Col 7 / 12) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#21262d]">
              
              {/* Month Selector Bar */}
              <div className="space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <label className={`block font-semibold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> เลือกรอบเดือนที่หัก (Batch Lifecycle Months)
                  </label>
                  {batchMonths.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      ทั้งหมด {batchMonths.length} เดือนในผลัด
                    </span>
                  )}
                </div>

                {batchMonths.length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {batchMonths.map((m) => {
                      const isSelected = monthPeriod === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setMonthPeriod(m.key)}
                          disabled={isExecuting}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? isLight 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                : 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/20'
                              : m.isCurrent
                              ? isLight 
                                ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 font-bold' 
                                : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50 font-bold'
                              : isLight 
                                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                                : 'bg-[#161b26] border-[#2b3a55] text-slate-300 hover:bg-[#202738]'
                          }`}
                        >
                          <span>{m.shortLabel}</span>
                          {m.isCurrent && (
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-blue-500'} animate-pulse`} title="เดือนปัจจุบัน" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="month"
                    value={monthPeriod}
                    onChange={(e) => setMonthPeriod(e.target.value)}
                    disabled={isExecuting}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600' 
                        : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  />
                )}
              </div>

              {/* Payday & Cutoff Schedule Notice Bar for Selected Month */}
              <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
                isLight ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-amber-950/20 border-amber-900/40 text-slate-200'
              }`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>รอบ {activeSchedule.month_label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>✂️ วันตัดยอด:</span>
                    <strong className="text-amber-600 dark:text-amber-400">{formatBatchDateDisplay(activeSchedule.cutoff_date)}</strong>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>💰 วันเงินเดือนเข้า:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{formatBatchDateDisplay(activeSchedule.payday_date)}</strong>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">(เดือนถัดไป)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>💵 ฐานเงินเดือน:</span>
                    <strong className="text-blue-600 dark:text-blue-400">฿{activeSchedule.salary_base.toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPayrollCalendarOpen(true)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isLight 
                      ? 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50' 
                      : 'bg-[#181d2a] border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
                  }`}
                >
                  <Calendar className="w-3 h-3 text-amber-500" />
                  ปรับปฏิทิน
                </button>
              </div>

              {/* Unit Filter */}
              <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 flex-1">
                  <label className={`text-xs font-semibold shrink-0 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    กรองสังกัดเป้าหมาย:
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    disabled={isExecuting}
                    className={`w-full max-w-xs px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600' 
                        : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL">ทุกสังกัด / หมวด ({soldiers.filter(s => s.status === 'ACTIVE').length} นาย)</option>
                    {availableUnits.map(unit => (
                      <option key={unit} value={unit}>
                        {unit} ({soldiers.filter(s => s.status === 'ACTIVE' && s.unit === unit).length} นาย)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-slate-400 font-mono shrink-0">
                  พลทหารที่จะถูกหัก: <strong className="text-blue-500">{targetSoldiers.length} นาย</strong>
                </div>
              </div>

              {/* Deduction Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`font-semibold text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    รายการหักประจำเดือน ({enabledItems.length}/{items.length} รายการที่เปิดใช้งาน)
                  </label>
                </div>

                <div className="space-y-2.5">
                  {items.map((item) => {
                    const meta = CATEGORY_METADATA[item.category] || CATEGORY_METADATA.OTHER;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                          item.is_enabled
                            ? isLight 
                              ? 'bg-white border-slate-300 shadow-xs' 
                              : 'bg-[#141a29] border-[#2b3a55]'
                            : isLight 
                              ? 'bg-slate-50/70 border-slate-200 opacity-60' 
                              : 'bg-[#111520]/60 border-[#1c2438] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.is_enabled}
                              onChange={() => handleToggleItem(item.id)}
                              disabled={isExecuting}
                              className="rounded cursor-pointer w-4 h-4 text-blue-600"
                            />
                            
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${meta.color}`}>
                              {meta.icon}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {item.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Controls: Amount, Wallet, Schedule Type, Delete */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold text-xs">฿</span>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                disabled={!item.is_enabled || isExecuting}
                                value={item.amount}
                                onChange={(e) => handleUpdateAmount(item.id, Number(e.target.value) || 0)}
                                className={`w-20 px-2 py-1 rounded-lg border font-mono font-bold text-xs text-right focus:outline-none transition-colors ${
                                  isLight 
                                    ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' 
                                    : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-blue-500'
                                }`}
                              />
                            </div>

                            {/* Target Wallet Dropdown */}
                            <select
                              disabled={!item.is_enabled || isExecuting}
                              value={item.target_wallet || 'SALARY'}
                              onChange={(e) => handleUpdateTargetWallet(item.id, e.target.value as any)}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold focus:outline-none ${
                                (item.target_wallet || 'SALARY') === 'SALARY'
                                  ? isLight ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-blue-950/40 border-blue-800/40 text-blue-300'
                                  : (item.target_wallet === 'ALLOWANCE')
                                  ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                                  : isLight ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                              }`}
                            >
                              <option value="SALARY">💵 ตัดจากเงินเดือน (Salary)</option>
                              <option value="ALLOWANCE">💳 ตัดจากวงเงิน (Allowance)</option>
                              <option value="CASH">💰 ตัดจากเงินสด (Cash)</option>
                            </select>

                            {/* Schedule Type */}
                            <select
                              disabled={!item.is_enabled || isExecuting}
                              value={item.schedule_type}
                              onChange={(e) => handleUpdateScheduleType(item.id, e.target.value as any)}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold focus:outline-none ${
                                isLight 
                                  ? 'bg-white border-slate-300 text-slate-800' 
                                  : 'bg-[#161b26] border-[#2b3a55] text-slate-200'
                              }`}
                            >
                              <option value="MONTHLY_RECURRING">ทุกเดือน</option>
                              <option value="DATE_RANGE">ตามช่วงวัน</option>
                              <option value="ONE_TIME">ครั้งเดียว</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              disabled={isExecuting}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Date Range Inputs if DATE_RANGE */}
                        {item.schedule_type === 'DATE_RANGE' && item.is_enabled && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-[11px]">
                            <span className="text-slate-400">ช่วงเวลาที่หัก:</span>
                            <input
                              type="date"
                              value={item.start_date || ''}
                              onChange={(e) => handleUpdateDates(item.id, e.target.value, undefined)}
                              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
                            />
                            <span className="text-slate-400">ถึง</span>
                            <input
                              type="date"
                              value={item.end_date || ''}
                              onChange={(e) => handleUpdateDates(item.id, undefined, e.target.value)}
                              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Deduction Form */}
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29]/60 border-[#21262d]'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-xs mb-2">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>เพิ่มรายการหักใหม่:</span>
                </div>

                <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="ชื่อรายการ เช่น ค่าซักรองเท้า, ค่าของใช้..."
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161b26] border-[#2b3a55] text-white'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      value={newItemCategory}
                      onChange={(e) => {
                        const cat = e.target.value as DeductionCategory;
                        setNewItemCategory(cat);
                        setNewItemAmount(CATEGORY_METADATA[cat]?.defaultAmount || 100);
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161b26] border-[#2b3a55] text-white'
                      }`}
                    >
                      {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="10"
                      required
                      placeholder="จำนวน (฿)"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(Number(e.target.value) || 0)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-right focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161b26] border-[#2b3a55] text-white'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      value={newItemTargetWallet}
                      onChange={(e) => setNewItemTargetWallet(e.target.value as any)}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161b26] border-[#2b3a55] text-white'
                      }`}
                    >
                      <option value="SALARY">💵 เงินเดือน</option>
                      <option value="ALLOWANCE">💳 วงเงิน</option>
                      <option value="CASH">💰 เงินสด</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <button
                      type="submit"
                      className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Right Column: Sticky Calculation Summary & Execution Panel (Col 5 / 12) */}
            <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      สรุปการคำนวณยอดเงิน
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      รอบ {activeSchedule.month_label} ({targetSoldiers.length} นาย)
                    </p>
                  </div>
                </div>

                {/* Calculation Cards */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
                }`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">ฐานเงินเดือนมาตรฐาน:</span>
                    <strong className="font-mono text-sm">฿{baseSalary.toLocaleString()} / คน</strong>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-rose-600 dark:text-rose-400">
                      <span>ยอดหักรวมต่อคน ({enabledItems.length} รายการ):</span>
                      <span className="font-mono text-base">-฿{deductionPerSoldier.toLocaleString()}</span>
                    </div>

                    <div className="text-[11px] space-y-1 pl-2 border-l-2 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                      {salaryDeductions > 0 && (
                        <div className="flex justify-between">
                          <span>• ตัดจากเงินเดือน (Salary):</span>
                          <strong className="text-blue-500">฿{salaryDeductions.toLocaleString()}</strong>
                        </div>
                      )}
                      {allowanceDeductions > 0 && (
                        <div className="flex justify-between">
                          <span>• ตัดจากวงเงิน (Allowance):</span>
                          <strong className="text-emerald-500">฿{allowanceDeductions.toLocaleString()}</strong>
                        </div>
                      )}
                      {cashDeductions > 0 && (
                        <div className="flex justify-between">
                          <span>• ตัดจากเงินสด (Cash):</span>
                          <strong className="text-amber-500">฿{cashDeductions.toLocaleString()}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>ประมาณการเงินเดือนคงเหลือสุทธิ:</span>
                    <span className="font-mono text-lg">฿{netEstimatedSalaryPerSoldier.toLocaleString()} / คน</span>
                  </div>
                </div>

                {/* Grand Total Execution Card */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-amber-50/70 border-amber-300 text-amber-950' : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                }`}>
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>ยอดหักรวมทั้งผลัด ({targetSoldiers.length} นาย):</span>
                    <span className="font-mono text-xl text-rose-600 dark:text-rose-400">
                      ฿{grandTotalDeductions.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ยอดเงินเดือนสุทธิที่ต้องจ่ายจริงทั้งผลัด: <strong>฿{grandTotalNetSalary.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Safety Guide Notice */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>คำแนะนำความปลอดภัย:</strong> เมื่อกดยืนยัน ระบบจะบันทึก Log ลง <code>Credit_Logs_{batchId}</code> และปรับยอดของทหารแต่ละคนตามกระเป๋าที่ตั้งค่าไว้ทันที
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#21262d] flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExecuting}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
                  }`}
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmSummary(true)}
                  disabled={isExecuting || !batchGuard.allowed || enabledItems.length === 0 || targetSoldiers.length === 0}
                  className="flex-2 py-2.5 text-white rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Scissors className="w-4 h-4" />
                  ดำเนินการตัดยอดรอบเดือนนี้
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* Tab 2: Completed Deductions History (ประวัติรายการหักที่สำเร็จแล้ว) */
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4">
            
            {/* Search & Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ประวัติรายการหักประจำเดือนที่ตัดยอดแล้ว
                  </h4>
                  <p className="text-xs text-slate-400">
                    บันทึกประวัติการตัดยอดหักเงินทั้งหมดในผลัด {batchId}
                  </p>
                </div>
              </div>

              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหารอบเดือน, ผู้ดำเนินการ..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161b26] border-[#2b3a55] text-white'
                  }`}
                />
              </div>
            </div>

            {/* History Records List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
              {filteredHistory.length === 0 ? (
                <div className={`p-12 text-center rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#141a29]/40 border-[#21262d] text-slate-400'
                }`}>
                  <History className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
                  <div className="font-bold text-sm">ยังไม่มีประวัติการตัดยอดในผลัดนี้</div>
                  <p className="text-xs mt-1 text-slate-400">
                    เมื่อคุณกดยืนยันการตัดยอดในแท็บ &quot;ตั้งค่ารายการหัก & ตัดยอด&quot; ข้อมูลจะถูกบันทึกมาแสดงที่นี่โดยอัตโนมัติ
                  </p>
                </div>
              ) : (
                filteredHistory.map((rec) => {
                  const execDate = new Date(rec.executed_at);
                  const formattedDate = !isNaN(execDate.getTime()) 
                    ? execDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : rec.executed_at;

                  return (
                    <div
                      key={rec.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#141a29] border-[#21262d]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-xs font-mono">
                            {rec.month_label} ({rec.month_period})
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ตัดยอดสำเร็จ
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400 font-mono">
                            ผู้ดำเนินการ: <strong className="text-blue-500">{rec.executed_by_id} ({rec.executed_by_name})</strong>
                          </span>
                          <span className="text-slate-400 font-mono">
                            {formattedDate}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClearHistoryItem(rec.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Summary Data Line */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 font-mono text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">จำนวนทหารที่หัก</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{rec.target_soldier_count} นาย</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">หักเฉลี่ยต่อคน</div>
                          <div className="font-bold text-rose-500">฿{rec.per_soldier_amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">แยกตัดกระเป๋า</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            เงินเดือน ฿{rec.salary_deductions} | วงเงิน ฿{rec.allowance_deductions} | สด ฿{rec.cash_deductions}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">ยอดตัดรวมทั้งสิ้น</div>
                          <div className="font-bold text-base text-rose-600 dark:text-rose-400">฿{rec.total_deduction_amount.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Items Snapshot Badges */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400">รายการที่หัก:</span>
                        {rec.items_snapshot.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1"
                          >
                            <span>{it.name}</span>
                            <span className="font-mono text-rose-500 font-bold">฿{it.amount}</span>
                            <span className="text-[9px] text-slate-400">({it.target_wallet === 'SALARY' ? 'เงินเดือน' : it.target_wallet === 'CASH' ? 'เงินสด' : 'วงเงิน'})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deletingItem && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
            }`}>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">ยืนยันการลบรายการหักเงิน</h3>
                <p className="text-xs text-slate-400">
                  คุณต้องการลบรายการ <strong>&quot;{deletingItem.name}&quot;</strong> (฿{deletingItem.amount}) ออกจากระบบใช่หรือไม่?
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ยืนยันลบ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pre-Execution Confirmation Modal */}
        {showConfirmSummary && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
            }`}>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                  <Calculator className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">ยืนยันการตัดยอดหักค่าใช้จ่าย</h3>
                <p className="text-xs text-slate-400">
                  ระบบจะทำการหักเงินทหาร <strong>{targetSoldiers.length} นาย</strong> ในผลัด <strong>{batchId}</strong> และบันทึกลงชีต <code>Credit_Logs_{batchId}</code>
                </p>
              </div>

              <div className={`p-4 rounded-xl border space-y-2 font-mono text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-500">รอบประจำเดือน:</span>
                  <span className="font-bold text-blue-500">{activeSchedule.month_label} ({monthPeriod})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สังกัด:</span>
                  <span className="font-bold">{selectedUnit === 'ALL' ? 'ทุกสังกัด' : selectedUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รายการที่หัก ({enabledItems.length} รายการ):</span>
                  <span className="font-bold">฿{deductionPerSoldier.toLocaleString()} / คน</span>
                </div>
                <div className="border-t border-slate-200 dark:border-[#262A36] pt-1 space-y-1">
                  {salaryDeductions > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>• ตัดจากเงินเดือน (Salary):</span>
                      <span className="font-bold">฿{salaryDeductions.toLocaleString()} / คน</span>
                    </div>
                  )}
                  {allowanceDeductions > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>• ตัดจากวงเงิน (Allowance):</span>
                      <span className="font-bold">฿{allowanceDeductions.toLocaleString()} / คน</span>
                    </div>
                  )}
                  {cashDeductions > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>• ตัดจากเงินสด (Cash):</span>
                      <span className="font-bold">฿{cashDeductions.toLocaleString()} / คน</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-[#262A36] pt-2 text-rose-600 dark:text-rose-400 font-bold">
                  <span>ยอดตัดรวมทั้งหมด:</span>
                  <span>฿{grandTotalDeductions.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSummary(false)}
                  disabled={isExecuting}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                  }`}
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  ยืนยันตัดยอดเงิน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nested Payroll Calendar Modal */}
        <PayrollCalendarModal
          isOpen={isPayrollCalendarOpen}
          onClose={() => setIsPayrollCalendarOpen(false)}
          batchId={batchId}
          currentBatch={currentBatch}
          onSchedulesUpdated={() => { refreshSchedules(); }}
          onSave={refreshSchedules}
        />
      </div>
    </div>
  );
};

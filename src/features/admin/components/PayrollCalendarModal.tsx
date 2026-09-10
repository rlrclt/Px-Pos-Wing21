import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, ShieldAlert, Save, HelpCircle, ChevronDown, ChevronUp,
  Scissors, AlertTriangle, RefreshCw
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { generateBatchMonths, parseBatchDate, formatBatchDateRange, formatBatchDateDisplay, isBatchOperationAllowed } from '../../../core/dateUtils.ts';
import type { MonthlyPayrollSchedule } from '../../../types/schema.ts';
import type { BatchItem } from './BatchesTab.tsx';

interface PayrollCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  currentBatch?: BatchItem;
  onSchedulesUpdated?: (schedules: MonthlyPayrollSchedule[]) => void;
  onSave?: () => void;
}

/**
 * Compute the real calendar status from cutoff / payday dates (P2-13 fix).
 */
export function computeScheduleStatus(cutoffDate: string, paydayDate: string): MonthlyPayrollSchedule['status'] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payday = parseBatchDate(paydayDate);
  if (payday) {
    const p = new Date(payday);
    p.setHours(23, 59, 59, 999);
    if (today > p) return 'PAST';
  }

  const cutoff = parseBatchDate(cutoffDate);
  if (cutoff) {
    const c = new Date(cutoff);
    c.setHours(23, 59, 59, 999);
    if (today > c) return 'CUTOFF_REACHED';
  }

  return 'SCHEDULED';
}

export const SCHEDULE_STATUS_LABEL: Record<MonthlyPayrollSchedule['status'], string> = {
  SCHEDULED: 'รอกำหนด',
  CUTOFF_REACHED: 'ถึงวันตัดยอด',
  PROCESSED: 'ประมวลผลแล้ว',
  PAST: 'ผ่านไปแล้ว'
};

export const SCHEDULE_STATUS_STYLE: Record<MonthlyPayrollSchedule['status'], string> = {
  SCHEDULED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  CUTOFF_REACHED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  PROCESSED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  PAST: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
};

/**
 * Default payroll cycle for every month of the batch:
 *  - Work & deduction period: 1st .. end of month `y-m`
 *  - Cutoff: 25th of `y-m` (สรุปยอดหักสวัสดิการและ PX)
 *  - Payday: 5th of NEXT month (เงินเดือนโอนเข้าบัญชีต้นเดือนถัดไป)
 */
export function buildDefaultPayrollSchedules(currentBatch?: BatchItem): MonthlyPayrollSchedule[] {
  const validMonths = generateBatchMonths(currentBatch?.start_date, currentBatch?.end_date);

  return validMonths.map(bm => {
    const y = parseInt(bm.key.split('-')[0], 10);
    const m = parseInt(bm.key.split('-')[1], 10);

    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY = y + 1;
    }

    const payday = `${nextY}-${String(nextM).padStart(2, '0')}-05`;
    const cutoff = `${y}-${String(m).padStart(2, '0')}-25`;

    return {
      month_key: bm.key,
      month_label: bm.label,
      payday_date: payday,
      cutoff_date: cutoff,
      salary_base: 10000,
      auto_deduct_enabled: true,
      status: computeScheduleStatus(cutoff, payday)
    };
  });
}

/**
 * Load payroll schedules from the backend (single source of truth for every device)
 * and merge with defaults so all months of the batch always have a row.
 * Also performs a one-time migration of legacy localStorage-only data.
 */
export async function fetchPayrollSchedules(batchId: string, currentBatch?: BatchItem): Promise<MonthlyPayrollSchedule[]> {
  const defaults = buildDefaultPayrollSchedules(currentBatch);
  if (!batchId) return defaults;

  let saved: MonthlyPayrollSchedule[] = [];
  try {
    const res = await api.getPayrollSchedules(batchId);
    if (Array.isArray(res.data)) saved = res.data;
  } catch (e) {
    saved = [];
  }

  if (saved.length === 0) {
    try {
      const raw = localStorage.getItem(`px_payroll_schedules_${batchId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          saved = parsed;
          api.savePayrollSchedules(batchId, parsed).catch(() => {});
        }
      }
    } catch (e) {}
  }

  return defaults.map(d => {
    const found = saved.find(s => s.month_key === d.month_key);
    if (!found) return d;

    const payday = found.payday_date || d.payday_date;
    const cutoff = found.cutoff_date || d.cutoff_date;
    const salaryBase = Number(found.salary_base);

    return {
      ...d,
      ...found,
      salary_base: salaryBase > 0 ? salaryBase : d.salary_base,
      payday_date: payday,
      cutoff_date: cutoff,
      auto_deduct_enabled: found.auto_deduct_enabled !== false,
      status: found.status === 'PROCESSED' ? 'PROCESSED' : computeScheduleStatus(cutoff, payday)
    };
  });
}

export const PayrollCalendarModal: React.FC<PayrollCalendarModalProps> = ({
  isOpen,
  onClose,
  batchId,
  currentBatch,
  onSchedulesUpdated,
  onSave
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState<MonthlyPayrollSchedule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (isOpen && batchId) {
      setIsLoading(true);
      fetchPayrollSchedules(batchId, currentBatch)
        .then(list => {
          if (!cancelled) setSchedules(list);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }
    return () => { cancelled = true; };
  }, [isOpen, batchId, currentBatch]);

  if (!isOpen) return null;

  const batchGuard = isBatchOperationAllowed(currentBatch?.start_date, currentBatch?.end_date);

  const handleUpdateSchedule = (monthKey: string, field: keyof MonthlyPayrollSchedule, value: any) => {
    setSchedules(prev => prev.map(s => s.month_key === monthKey ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!batchId) {
      showToast({ type: 'error', title: 'ไม่อนุญาต', message: 'กรุณาเลือกผลัดทหารก่อนดำเนินการ' });
      return;
    }

    if (!batchGuard.allowed) {
      showToast({ type: 'error', title: 'ไม่อนุญาตให้แก้ไข', message: batchGuard.reason });
      return;
    }

    // Basic date validation
    for (const s of schedules) {
      if (!s.payday_date || !s.cutoff_date) {
        showToast({ type: 'warning', title: 'กรุณากรอกวันที่ให้ครบถ้วน', message: `กรุณาใส่วันที่ของรอบ ${s.month_label}` });
        return;
      }
    }

    setIsSaving(true);
    try {
      const withStatus = schedules.map(s => ({ ...s, status: computeScheduleStatus(s.cutoff_date, s.payday_date) }));
      const res = await api.savePayrollSchedules(batchId, withStatus);
      if (!res.success) {
        showToast({ type: 'error', title: 'บันทึกล้มเหลว', message: res.error || 'ไม่สามารถบันทึกปฏิทินเงินเดือนได้' });
        setIsSaving(false);
        return;
      }
      setSchedules(withStatus);
      showToast({
        type: 'success',
        title: 'บันทึกปฏิทินเงินเดือนสำเร็จ',
        message: `อัปเดตกำหนดการเงินเดือนและวันตัดยอดทั้ง ${schedules.length} รอบเดือนเรียบร้อย`
      });
      if (onSchedulesUpdated) onSchedulesUpdated(withStatus);
      if (onSave) onSave();
      onClose();
    } catch (e: any) {
      showToast({ type: 'error', title: 'บันทึกล้มเหลว', message: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ปฏิทินวันเงินเดือนเข้า & วันตัดยอดหักเงิน (Payroll Calendar)
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
                {batchId && currentBatch
                  ? `กำหนดวันที่เงินเดือนเข้าและวันตัดยอดแต่ละเดือนตามช่วงเวลาผลัด (${formatBatchDateRange(currentBatch.start_date, currentBatch.end_date)})`
                  : 'กรุณาเลือกผลัดทหารก่อนตั้งค่าปฏิทินเงินเดือน'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expired Batch Alert */}
        {batchId && !batchGuard.allowed && (
          <div className="p-3.5 bg-rose-500/10 border-b border-rose-500/30 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs shrink-0">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span><strong>คำเตือน:</strong> ผลัดนี้สิ้นสุดระยะเวลาแล้ว การเปลี่ยนแปลงจะมีผลเฉพาะการดูรายงานย้อนหลัง</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-emerald-500" />
              <p className="text-xs">กำลังโหลดปฏิทินเงินเดือนจากฐานข้อมูลกลาง (Google Sheets)...</p>
            </div>
          ) : !batchId ? (
            <div className="py-16 text-center px-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className={`text-base font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                ยังไม่ได้เลือกผลัดทหาร
              </h3>
              <p className={`text-xs max-w-md mx-auto mb-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ฟีเจอร์ "ปฏิทินวันเงินเดือนเข้า & วันตัดยอดหักเงิน" จำเป็นต้องผูกกับผลัดทหารที่มีช่วงเวลาเริ่มต้นและสิ้นสุด กรุณาเลือกผลัดทหารก่อนเริ่มใช้งาน
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer transition active:scale-95 shadow-md"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          ) : (
            <>
              {/* Detailed Explanation / Guide Box */}
          <div className={`p-4 rounded-xl border space-y-3 transition-all ${
            isLight ? 'bg-blue-50/70 border-blue-200 text-slate-800' : 'bg-blue-950/30 border-blue-900/50 text-slate-200'
          }`}>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
              <div className="flex items-center gap-2 font-bold text-xs text-blue-600 dark:text-blue-400">
                <HelpCircle className="w-4 h-4" />
                <span>คำอธิบายวงรอบเงินเดือน & วันตัดยอด (Payroll Cycle Guide)</span>
              </div>
              <button 
                type="button" 
                className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
              >
                <span>{showGuide ? 'ย่อคำอธิบาย' : 'ดูคำอธิบายอย่างละเอียด'}</span>
                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showGuide && (
              <div className="space-y-2.5 text-[11px] pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-blue-100' : 'bg-[#141a29] border-[#262A36]'
                  }`}>
                    <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
                      <Clock className="w-3.5 h-3.5" /> 1. รอบทำงาน (Work Period)
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      นับตั้งแต่วันที่ 1 ถึงสิ้นเดือนของรอบนั้น (ระบบคำนวณวันในเดือนให้อัตโนมัติตามช่วงเวลาผลัด)
                    </p>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-blue-100' : 'bg-[#141a29] border-[#262A36]'
                  }`}>
                    <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                      <Scissors className="w-3.5 h-3.5" /> 2. วันตัดยอด (Cutoff Date)
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      วันปิดรอบบิลสรุปยอดหักสวัสดิการ & ยอดซื้อ PX เพื่อนำไปคิดเงินเดือน (ยอดหลังวันนี้จะยกไปหักเดือนถัดไป)
                    </p>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-blue-100' : 'bg-[#141a29] border-[#262A36]'
                  }`}>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
                      <Calendar className="w-3.5 h-3.5" /> 3. วันเงินเดือนเข้า (Payday)
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      วันโอนเงินเดือนสุทธิเข้าบัญชีทหารจริง (จ่ายต้นเดือนถัดไป สามารถปรับเลี่ยงวันหยุดราชการได้)
                    </p>
                  </div>
                </div>

                <div className={`p-2 rounded-lg font-mono flex items-center justify-between text-[11px] border ${
                  isLight ? 'bg-blue-100/50 border-blue-200 text-blue-900' : 'bg-blue-900/20 border-blue-800/40 text-blue-300'
                }`}>
                  <span className="font-sans font-semibold">สูตรคิดเงินเดือนสุทธิ:</span>
                  <span>ฐานเงินเดือน - ยอดหักสวัสดิการ - ยอดซื้อ PX = <strong>เงินเดือนสุทธิโอนเข้าบัญชี</strong></span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              กำหนดการเงินเดือน {schedules.length} รอบเดือนในผลัดนี้:
            </span>
            <span className="text-[11px] text-slate-400">แก้ไขวันเงินเดือนเข้าตามวันหยุดราชการได้อิสระ</span>
          </div>

          <div className="space-y-3">
            {schedules.map((s, idx) => (
              <div 
                key={s.month_key}
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#141a29] border-[#262A36]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs font-mono">
                      {idx + 1}
                    </span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      รอบเดือน {s.month_label}
                    </strong>
                    <span className="text-[10px] font-mono text-slate-400">({s.month_key})</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${SCHEDULE_STATUS_STYLE[computeScheduleStatus(s.cutoff_date, s.payday_date)]}`}>
                      {SCHEDULE_STATUS_LABEL[computeScheduleStatus(s.cutoff_date, s.payday_date)]}
                    </span>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={s.auto_deduct_enabled}
                      onChange={(e) => handleUpdateSchedule(s.month_key, 'auto_deduct_enabled', e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>เปิดหักเงินอัตโนมัติ</span>
                  </label>
                </div>

                {/* Timeline flow indicator */}
                <div className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between border ${
                  isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#181B22] border-[#262A36] text-slate-300'
                }`}>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <strong>รอบทำงาน:</strong> 1 - สิ้นเดือน {s.month_label}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <strong>ตัดยอด:</strong> {formatBatchDateDisplay(s.cutoff_date)}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <strong>เงินเดือนเข้า:</strong> {formatBatchDateDisplay(s.payday_date)} (เดือนถัดไป)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      ✂️ วันตัดยอดหักเงิน (Cutoff)
                    </label>
                    <input
                      type="date"
                      value={s.cutoff_date}
                      onChange={(e) => handleUpdateSchedule(s.month_key, 'cutoff_date', e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#181B22] border-[#2b3a55] text-white focus:border-blue-500'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">วันสรุปยอดหักสวัสดิการและ PX</span>
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      🗓️ วันเงินเดือนเข้า (Payday)
                    </label>
                    <input
                      type="date"
                      value={s.payday_date}
                      onChange={(e) => handleUpdateSchedule(s.month_key, 'payday_date', e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#181B22] border-[#2b3a55] text-white focus:border-blue-500'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">วันโอนเงินเดือนสุทธิเข้าบัญชี (เดือนถัดไป)</span>
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      💵 ฐานเงินเดือนต่อคน (฿)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={s.salary_base}
                      onChange={(e) => handleUpdateSchedule(s.month_key, 'salary_base', Number(e.target.value) || 0)}
                      className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs font-bold text-right focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#181B22] border-[#2b3a55] text-white focus:border-blue-500'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">ยอดเงินเดือนพื้นฐานประจำรอบ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
            }`}
          >
            {batchId ? 'ยกเลิก' : 'ปิด'}
          </button>

          {batchId && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !batchGuard.allowed}
              className="px-5 py-2 text-white rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              บันทึกปฏิทินเงินเดือน
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

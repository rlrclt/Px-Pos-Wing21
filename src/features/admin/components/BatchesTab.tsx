import React, { useState } from 'react';
import { 
  FolderPlus, Plus, ExternalLink, Trash2, Copy, Check, Calendar, Edit3
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';
import { formatBatchDateRange, getBatchLifecycleStatus } from '../../../core/dateUtils.ts';

export interface BatchItem {
  batch_id: string;
  batch_name: string;
  spreadsheet_id?: string;
  start_date?: string;
  end_date?: string;
  default_credit_limit?: number;
  is_active_batch?: boolean;
  is_active?: boolean;
}

interface BatchesTabProps {
  batches: BatchItem[];
  selectedBatchId: string;
  onSelectBatch: (batchId: string) => void;
  onOpenCreateBatch: () => void;
  onEditBatch?: (batch: BatchItem) => void;
  onDeleteBatch: (batch: BatchItem) => void;
  onOpenMonthlyDeductions?: () => void;
  onOpenPayrollCalendar?: () => void;
  onOpenSalaryTopup?: () => void;
}

export const BatchesTab: React.FC<BatchesTabProps> = ({
  batches,
  selectedBatchId,
  onSelectBatch,
  onOpenCreateBatch,
  onEditBatch,
  onDeleteBatch,
  onOpenMonthlyDeductions,
  onOpenPayrollCalendar,
  onOpenSalaryTopup
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    showToast({ type: 'success', title: 'คัดลอกเรียบร้อย', message: text });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <AdminSectionHeader
          title="จัดการฐานข้อมูลผลัดทหาร (Batch Sharding)"
          description="ดึงข้อมูลจากตาราง Batch_Config พร้อมระบบ Provision Sheet ผลัดอัตโนมัติ"
          icon={FolderPlus}
          badge={`${batches.length} ผลัด`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {onOpenSalaryTopup && (
                <button
                  onClick={onOpenSalaryTopup}
                  className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 select-none active:scale-[0.98] min-h-[40px]"
                >
                  <Plus className="w-4 h-4" /> เติมเงินเดือน
                </button>
              )}
              {onOpenMonthlyDeductions && (
                <button
                  onClick={onOpenMonthlyDeductions}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] ${
                    isLight ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/40 text-amber-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-amber-500" /> หักประจำเดือน
                </button>
              )}
              {onOpenPayrollCalendar && (
                <button
                  onClick={onOpenPayrollCalendar}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] ${
                    isLight ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900' : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-800/40 text-blue-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-blue-500" /> ปฏิทินเงินเดือน
                </button>
              )}
              <button
                onClick={onOpenCreateBatch}
                className="px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 select-none active:scale-[0.98] min-h-[40px]"
              >
                <Plus className="w-4 h-4" /> สร้างผลัดใหม่
              </button>
            </div>
          }
        />

        {/* Batches Table */}
        <div className="overflow-x-auto mt-5 rounded-xl border border-slate-200 dark:border-[#262A36]">
          <table className="w-full text-left text-xs">
            <thead className={`text-[11px] uppercase tracking-wider border-b ${
              isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#181B22] text-slate-400 border-[#262A36]'
            }`}>
              <tr>
                <th className="py-3 px-3.5">รหัสผลัด (Batch ID)</th>
                <th className="py-3 px-3.5">ชื่อผลัด</th>
                <th className="py-3 px-3.5 text-right">วงเงินเริ่มต้น</th>
                <th className="py-3 px-3.5">ช่วงเวลา</th>
                <th className="py-3 px-3.5">Spreadsheet ID</th>
                <th className="py-3 px-3.5 text-center">สถานะ</th>
                <th className="py-3 px-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                    ยังไม่มีผลัดในระบบ กดปุ่ม <strong>&quot;สร้างผลัดใหม่ (Auto Provision)&quot;</strong> เพื่อเริ่มต้นใช้งาน
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const isSelected = b.batch_id === selectedBatchId;
                  const sheetUrl = b.spreadsheet_id ? `https://docs.google.com/spreadsheets/d/${b.spreadsheet_id}/edit` : '#';
                  return (
                    <tr key={b.batch_id} className={`transition-colors ${
                      isSelected 
                        ? isLight ? 'bg-blue-50/50 font-medium' : 'bg-blue-950/20 font-medium' 
                        : isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181B22]/60'
                    }`}>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : isLight ? 'text-slate-900' : 'text-white'}`}>
                            {b.batch_id}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                              CURRENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-3.5 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {b.batch_name}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        ฿{(Number(b.default_credit_limit) || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatBatchDateRange(b.start_date, b.end_date)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-blue-500">
                        {b.spreadsheet_id ? (
                          <div className="flex items-center gap-1.5">
                            <code className="text-slate-500 select-all">{b.spreadsheet_id.slice(0, 14)}...</code>
                            <button
                              onClick={() => copyToClipboard(b.spreadsheet_id!, `sheet_${b.batch_id}`)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-[#283550] rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                              title="คัดลอก Sheet ID"
                            >
                              {copiedField === `sheet_${b.batch_id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {(() => {
                          const status = getBatchLifecycleStatus(b.start_date, b.end_date);
                          if (status === 'EXPIRED') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                🔴 สิ้นสุดผลัด (EXPIRED)
                              </span>
                            );
                          }
                          if (status === 'UPCOMING') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                🟡 ยังไม่เริ่ม (UPCOMING)
                              </span>
                            );
                          }
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              🟢 ประจำการ (ACTIVE)
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isSelected && (
                            <button
                              onClick={() => onSelectBatch(b.batch_id)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[32px] select-none active:scale-[0.95] ${
                                isLight ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              เลือกใช้ผลัดนี้
                            </button>
                          )}
                          {onEditBatch && (
                            <button
                              onClick={() => onEditBatch(b)}
                              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all min-h-[32px] min-w-[32px] select-none active:scale-[0.95] cursor-pointer ${
                                isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                              }`}
                              title="แก้ไขข้อมูลผลัดและช่วงเวลา"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {b.spreadsheet_id && (
                            <a
                              href={sheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all min-h-[32px] min-w-[32px] select-none active:scale-[0.95] ${
                                isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-blue-400'
                              }`}
                              title="เปิดดู Google Sheet ผลัดนี้"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => onDeleteBatch(b)}
                            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center select-none active:scale-[0.95] ${
                              isLight ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                            }`}
                            title="ลบข้อมูลผลัดนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
};

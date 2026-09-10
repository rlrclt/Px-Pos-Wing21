import React, { useState } from 'react';
import { 
  Users, Search, Download, Upload, RefreshCw, CreditCard, DollarSign, Wallet,
  Plus, Edit2, Trash2, UserX, UserCheck, User, X, ZoomIn, Image as ImageIcon,
  Calculator, ShieldAlert, Calendar, AlertTriangle
} from 'lucide-react';
import type { Soldier, SoldierStatus } from '../../../types/schema.ts';
import { normalizeDriveImageUrl } from '../../../core/api.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { AdminStatCard } from './ui/AdminStatCard.tsx';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';
import { isBatchOperationAllowed, formatBatchDateRange } from '../../../core/dateUtils.ts';
import type { BatchItem } from './BatchesTab.tsx';

interface WelfareTabProps {
  selectedBatchId: string;
  setSelectedBatchId?: (id: string) => void;
  availableBatches?: BatchItem[];
  currentBatch?: BatchItem;
  soldiers: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number; soldier_id?: string })[];
  isLoading: boolean;
  onNavigateToBatches?: () => void;
  onOpenUploadSoldiers: () => void;
  onOpenDownloadTemplate: () => void;
  onOpenCreateSoldier?: () => void;
  onOpenEditSoldier?: (soldier: Soldier) => void;
  onOpenDeleteSoldier?: (soldier: Soldier) => void;
  onToggleStatus?: (soldier: Soldier, newStatus: SoldierStatus) => void;
  onOpenBatchUploadPhotos?: () => void;
  onOpenMonthlyDeductions?: () => void;
  onOpenPayrollCalendar?: () => void;
  onOpenSalaryTopup?: (soldier?: Soldier) => void;
}

const SoldierAvatar: React.FC<{
  photoUrl?: string;
  name: string;
  isLight: boolean;
  onPreview?: () => void;
}> = ({ photoUrl, name, isLight, onPreview }) => {
  const [hasError, setHasError] = useState(false);
  const normalizedUrl = photoUrl ? normalizeDriveImageUrl(photoUrl) : '';

  if (!normalizedUrl || hasError) {
    return (
      <div 
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border select-none ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-[#181B22] border-[#262A36] text-slate-500'
        }`}
        title={name}
      >
        <User className="w-4 h-4" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPreview}
      className="group relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer block"
      title={`คลิกดูรูปโปรไฟล์ ${name}`}
    >
      <img
        src={normalizedUrl}
        alt={name}
        className="w-full h-full object-cover transition-transform group-hover:scale-110"
        onError={() => setHasError(true)}
      />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <ZoomIn className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};

export const WelfareTab: React.FC<WelfareTabProps> = ({
  selectedBatchId,
  setSelectedBatchId,
  availableBatches = [],
  currentBatch,
  soldiers,
  isLoading,
  onNavigateToBatches,
  onOpenUploadSoldiers,
  onOpenDownloadTemplate,
  onOpenCreateSoldier,
  onOpenEditSoldier,
  onOpenDeleteSoldier,
  onToggleStatus,
  onOpenBatchUploadPhotos,
  onOpenMonthlyDeductions,
  onOpenPayrollCalendar,
  onOpenSalaryTopup
}) => {
  const { isLight } = useTheme();
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DISCHARGED'>('ALL');
  const [previewSoldier, setPreviewSoldier] = useState<Soldier | null>(null);

  const batchGuard = isBatchOperationAllowed(currentBatch?.start_date, currentBatch?.end_date);

  const totalSoldiers = soldiers.length;
  const totalCreditLimit = soldiers.reduce((acc, s) => acc + (Number(s.credit_limit) || 0), 0);
  const totalRemainingCredit = soldiers.reduce((acc, s) => acc + (Number(s.credit_allowance_balance !== undefined ? s.credit_allowance_balance : s.remaining_credit) || 0), 0);
  const totalCreditUsed = soldiers.reduce((acc, s) => {
    const limit = Number(s.credit_limit) || 0;
    const remaining = Number(s.credit_allowance_balance !== undefined ? s.credit_allowance_balance : s.remaining_credit) || 0;
    return acc + Math.max(0, limit - remaining);
  }, 0);
  const totalDeductions = soldiers.reduce((acc, s) => acc + (Number(s.deductions) || 0), 0);
  const totalAllowanceDeductions = soldiers.reduce((acc, s) => acc + (Number(s.allowance_deductions_total) || 0), 0);
  const totalCashDeductions = soldiers.reduce((acc, s) => acc + (Number(s.cash_deductions_total) || 0), 0);
  const totalOtherDeductions = totalAllowanceDeductions + totalCashDeductions;
  const totalNetDeductible = totalCreditUsed + totalDeductions;
  const totalCashBalance = soldiers.reduce((acc, s) => acc + (Number(s.cash_wallet_balance || s.cash_balance) || 0), 0);

  const filteredSoldiers = soldiers.filter(s => {
    if (statusFilter !== 'ALL' && (s.status || 'ACTIVE') !== statusFilter) {
      return false;
    }
    if (!adminSearch.trim()) return true;
    const q = adminSearch.toLowerCase();
    return (
      (s.px_code && s.px_code.toLowerCase().includes(q)) ||
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.national_id && s.national_id.toLowerCase().includes(q)) ||
      (s.unit && s.unit.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Batch Warning Banner (when no batch is selected or available) */}
      {!selectedBatchId && (
        <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-sm ${
          isLight ? 'bg-amber-50/90 border-amber-300/80 text-amber-900' : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 md:mt-0 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                ⚠️ ยังไม่ได้เลือกผลัด หรือยังไม่ได้เชื่อมต่อผลัดทหาร
              </h4>
              <p className="text-xs sm:text-sm text-amber-700/90 dark:text-amber-300/80 mt-1">
                {availableBatches.length > 0 
                  ? 'กรุณาเลือกผลัดที่ต้องการจัดการจากเมนูด้านล่างหรือปุ่มเลือกผลัด เพื่อดูรายชื่อพลทหารและจัดการสิทธิ'
                  : 'ระบบยังไม่มีข้อมูลผลัดทหาร กรุณาไปที่แท็บ "จัดการผลัดทหาร (Batches)" เพื่อสร้างผลัดใหม่ก่อนเริ่มต้นใช้งาน'}
              </p>
            </div>
          </div>
          {availableBatches.length > 0 && setSelectedBatchId ? (
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer shadow-xs ${
                  isLight ? 'bg-white border-amber-400 text-slate-900' : 'bg-[#181B22] border-amber-500/50 text-amber-200'
                }`}
              >
                <option value="">-- คลิกเพื่อเลือกผลัดทหาร --</option>
                {availableBatches.map(b => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_name || b.batch_id} {(b.is_active_batch || b.is_active) ? '(🟢 กำลังใช้งาน)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : onNavigateToBatches ? (
            <button
              onClick={onNavigateToBatches}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer active:scale-95 transition-all shrink-0"
            >
              ไปที่จัดการผลัดทหาร
            </button>
          ) : null}
        </div>
      )}

      {/* Batch Lifecycle Status Notice (when selected batch has expired) */}
      {selectedBatchId && !batchGuard.allowed && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div>
              <strong className="block text-sm">ผลัดสิ้นสุดระยะเวลาแล้ว ({formatBatchDateRange(currentBatch?.start_date, currentBatch?.end_date)})</strong>
              <span>ระบบล็อคการหักค่าใช้จ่ายและเติมเงินอัตโนมัติ เพื่อป้องกันเงินเดือนเพิ่มขึ้นเรื่อยๆ หลังหมดผลัด</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white shrink-0">
            EXPIRED
          </span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="จำนวนทหารในรุ่น"
          value={selectedBatchId ? `${totalSoldiers.toLocaleString()} นาย` : '-'}
          subtitle={selectedBatchId ? `วงเงินรวม ฿${totalCreditLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'ยังไม่ได้เลือกผลัด'}
          icon={Users}
          accentColor="#3B82F6"
        />
        <AdminStatCard
          title="ยอดใช้สวัสดิการ PX"
          value={selectedBatchId ? `฿${totalCreditUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          subtitle={selectedBatchId ? `คงเหลือสิทธิ ฿${totalRemainingCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'ยังไม่ได้เลือกผลัด'}
          icon={CreditCard}
          accentColor="#0EA5E9"
        />
        <AdminStatCard
          title="ยอดตัดเงินเดือนสุทธิรวม"
          value={selectedBatchId ? `฿${totalNetDeductible.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          subtitle={selectedBatchId ? `หักเงินเดือน ฿${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}${totalOtherDeductions > 0 ? ` • ตัดวงเงิน/เงินสด ฿${totalOtherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}` : 'ยังไม่ได้เลือกผลัด'}
          icon={DollarSign}
          accentColor="#F43F5E"
        />
        <AdminStatCard
          title="ยอดเงินสดในกระเป๋า (Cash)"
          value={selectedBatchId ? `฿${totalCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          subtitle={selectedBatchId ? 'เงินเติมสด ไม่ผูกกับเงินเดือน' : 'ยังไม่ได้เลือกผลัด'}
          icon={Wallet}
          accentColor="#10B981"
        />
      </div>

      {/* Soldiers Table Section */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <AdminSectionHeader
          title={
            currentBatch 
              ? `ทะเบียนพลทหาร & จัดการสิทธิ (ผลัด ${currentBatch.batch_name || selectedBatchId})` 
              : selectedBatchId 
                ? `ทะเบียนพลทหาร & จัดการสิทธิ (ผลัด ${selectedBatchId})` 
                : "ทะเบียนพลทหาร & จัดการสิทธิ (ยังไม่ได้เลือกผลัด)"
          }
          description={
            currentBatch 
              ? `ช่วงเวลา: ${formatBatchDateRange(currentBatch.start_date, currentBatch.end_date)} • จัดการข้อมูลรายคนและตัดยอดเงินเดือน` 
              : selectedBatchId 
                ? "ระบบจัดการข้อมูลรายคน (CRUD) และคำนวณตัดยอดเงินเดือน" 
                : "กรุณาเลือกผลัดทหารเพื่อดูและจัดการข้อมูลทะเบียนพลทหาร"
          }
          icon={Users}
          badge={selectedBatchId ? `${soldiers.length} นาย` : 'ยังไม่ได้เลือกผลัด'}
          actions={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Batch Selector Switcher */}
              {availableBatches.length > 0 && setSelectedBatchId && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border min-h-[40px] ${
                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#181B22] border-[#262A36]'
                }`}>
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ผลัด:
                  </span>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className={`bg-transparent text-xs sm:text-sm font-black focus:outline-none cursor-pointer ${
                      isLight ? 'text-blue-700' : 'text-blue-400'
                    }`}
                  >
                    <option value="" disabled>-- เลือกผลัด --</option>
                    {availableBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#111622] text-white'}>
                        {b.batch_name || b.batch_id} {(b.is_active_batch || b.is_active) ? '(🟢 ปัจจุบัน)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={`relative flex-1 sm:w-52 rounded-xl border flex items-center px-3 py-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
              }`}>
                <Search className={`w-4 h-4 mr-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัส, เลข ปชช..."
                  disabled={!selectedBatchId}
                  className={`w-full text-xs bg-transparent border-none outline-none disabled:opacity-50 ${
                    isLight ? 'text-slate-800 placeholder-slate-400' : 'text-slate-200 placeholder-slate-500'
                  }`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                disabled={!selectedBatchId}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-hidden min-h-[40px] disabled:opacity-50 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-slate-200'
                }`}
              >
                <option value="ALL">สถานะ: ทั้งหมด</option>
                <option value="ACTIVE">🟢 พร้อมใช้งาน</option>
                <option value="SUSPENDED">🟡 ระงับสิทธิ</option>
                <option value="DISCHARGED">🔴 ปลดประจำการ</option>
              </select>

              {onOpenSalaryTopup && (
                <button
                  onClick={() => onOpenSalaryTopup()}
                  disabled={!selectedBatchId || !batchGuard.allowed}
                  className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="เติมเงินเดือน/เบี้ยเลี้ยง (ทั้งผลัด หรือรายบุคคล)"
                >
                  <DollarSign className="w-4 h-4" /> เติมเงินเดือน
                </button>
              )}

              {onOpenMonthlyDeductions && (
                <button
                  onClick={onOpenMonthlyDeductions}
                  disabled={!selectedBatchId || !batchGuard.allowed}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight 
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs' 
                      : 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/40 text-amber-300'
                  }`}
                  title="จัดการหักค่าใช้จ่ายประจำเดือน (ตัดผม, ซักรีด, เงินออม ฯลฯ)"
                >
                  <Calculator className="w-4 h-4 text-amber-500" /> หักประจำเดือน
                </button>
              )}

              {onOpenPayrollCalendar && (
                <button
                  onClick={onOpenPayrollCalendar}
                  disabled={!selectedBatchId || !batchGuard.allowed}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight 
                      ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900 shadow-xs' 
                      : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-800/40 text-blue-300'
                  }`}
                  title="ปฏิทินวันเงินเดือนเข้า & วันตัดยอดหักเงินประจำผลัด"
                >
                  <Calendar className="w-4 h-4 text-blue-500" /> ปฏิทินเงินเดือน
                </button>
              )}

              {onOpenCreateSoldier && (
                <button
                  onClick={onOpenCreateSoldier}
                  disabled={!selectedBatchId}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                  }`}
                  title="เพิ่มพลทหารใหม่รายคน"
                >
                  <Plus className="w-4 h-4 text-blue-500" /> เพิ่มคน
                </button>
              )}

              {onOpenDownloadTemplate && (
                <button
                  onClick={onOpenDownloadTemplate}
                  disabled={!selectedBatchId}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight 
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                      : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                  }`}
                  title="ดาวน์โหลดไฟล์แม่แบบ CSV / Excel"
                >
                  <Download className="w-3.5 h-3.5" /> เทมเพลต
                </button>
              )}

              {onOpenBatchUploadPhotos && (
                <button
                  onClick={onOpenBatchUploadPhotos}
                  disabled={!selectedBatchId}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight 
                      ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700' 
                      : 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-800/40 text-purple-300'
                  }`}
                  title="อัปโหลดรูปประจำตัวทหารแบบกลุ่ม (Bulk Photos & Auto-Match)"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> อัปโหลดรูปกลุ่ม
                </button>
              )}

              <button
                onClick={onOpenUploadSoldiers}
                disabled={!selectedBatchId}
                className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                title="นำเข้าไฟล์ข้อมูลทหารแบบกลุ่ม"
              >
                <Upload className="w-3.5 h-3.5" /> นำเข้า (Upload)
              </button>
            </div>
          }
        />

        {!selectedBatchId ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className={`text-base font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              ยังไม่ได้เลือกผลัดทหาร
            </h3>
            <p className={`text-xs max-w-md mx-auto mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              กรุณาเลือกผลัดทหารจากเมนูตัวเลือกด้านบน หรือสร้างผลัดทหารใหม่ที่แท็บ "จัดการผลัดทหาร (Batches)" เพื่อเริ่มต้นใช้งาน
            </p>
            {onNavigateToBatches && (
              <button
                onClick={onNavigateToBatches}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition active:scale-95"
              >
                ไปที่จัดการผลัดทหาร (Batches)
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-500" />
            <p className="text-xs">กำลังดึงข้อมูลทะเบียนทหารจาก Google Sheets ผลัด {selectedBatchId}...</p>
          </div>
        ) : filteredSoldiers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className={`w-10 h-10 mx-auto mb-2 ${isLight ? 'text-slate-300' : 'text-slate-600'}`} />
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              {soldiers.length === 0 
                ? `ไม่พบข้อมูลทหารในผลัด ${currentBatch?.batch_name || selectedBatchId}` 
                : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
            </p>
            {onOpenCreateSoldier && soldiers.length === 0 && (
              <button
                onClick={onOpenCreateSoldier}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มทหารคนแรกในผลัดนี้
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto mt-4 rounded-xl border border-slate-200 dark:border-[#262A36]">
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] uppercase tracking-wider border-b ${
                isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#181B22] text-slate-400 border-[#262A36]'
              }`}>
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3 text-center">รูปถ่าย</th>
                  <th className="py-3 px-3">รหัส PX</th>
                  <th className="py-3 px-3">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-3">สังกัด</th>
                  <th className="py-3 px-3">เลขบัตร ปชช.</th>
                  <th className="py-3 px-3 text-right">วงเงินสวัสดิการ</th>
                  <th className="py-3 px-3 text-right">คงเหลือ</th>
                  <th className="py-3 px-3 text-right text-blue-600 dark:text-blue-400">ใช้ไป</th>
                  <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">หักอื่น</th>
                  <th className={`py-3 px-3 text-right font-bold ${isLight ? 'text-slate-900 bg-blue-50/50' : 'text-blue-300 bg-blue-950/20'}`}>ยอดตัดเงินเดือน</th>
                  <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">เงินสด</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
                {filteredSoldiers.map((soldier, idx) => {
                  const limit = Number(soldier.credit_limit) || 0;
                  const remaining = Number(soldier.credit_allowance_balance !== undefined ? soldier.credit_allowance_balance : soldier.remaining_credit) || 0;
                  const used = Math.max(0, limit - remaining);
                  const deduct = Number(soldier.deductions) || 0;
                  const allowanceDeduct = Number(soldier.allowance_deductions_total) || 0;
                  const cashDeduct = Number(soldier.cash_deductions_total) || 0;
                  const otherDeduct = deduct + allowanceDeduct + cashDeduct;
                  const netDeduct = used + deduct;
                  const cash = Number(soldier.cash_wallet_balance || soldier.cash_balance) || 0;

                  return (
                    <tr key={soldier.soldier_id || soldier.px_code || idx} className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181B22]/60'
                    }`}>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center">
                          <SoldierAvatar
                            photoUrl={soldier.photo_url}
                            name={soldier.full_name}
                            isLight={isLight}
                            onPreview={() => soldier.photo_url && setPreviewSoldier(soldier)}
                          />
                        </div>
                      </td>
                      <td className={`py-3 px-3 font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {soldier.px_code}
                      </td>
                      <td className={`py-3 px-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <span>{soldier.full_name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {soldier.unit || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {soldier.national_id || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ฿{limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        ฿{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        ฿{used.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        <div>฿{otherDeduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        {(allowanceDeduct > 0 || cashDeduct > 0) && (
                          <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                            {allowanceDeduct > 0 && <span>วงเงิน ฿{allowanceDeduct.toLocaleString()}</span>}
                            {allowanceDeduct > 0 && cashDeduct > 0 && <span> • </span>}
                            {cashDeduct > 0 && <span>เงินสด ฿{cashDeduct.toLocaleString()}</span>}
                          </div>
                        )}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        isLight ? 'text-slate-900 bg-blue-50/30' : 'text-blue-300 bg-blue-950/20'
                      }`}>
                        ฿{netDeduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ฿{cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          soldier.status === 'ACTIVE' 
                            ? isLight 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                            : soldier.status === 'SUSPENDED'
                              ? isLight
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              : isLight 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        }`}>
                          {soldier.status === 'ACTIVE' ? 'พร้อม' : soldier.status === 'SUSPENDED' ? 'ระงับ' : 'ปลด'}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenSalaryTopup && (
                            <button
                              type="button"
                              onClick={() => onOpenSalaryTopup(soldier)}
                              disabled={!batchGuard.allowed}
                              className={`p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-40 ${
                                isLight 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                                  : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/40 text-emerald-400'
                              }`}
                              title={`เติมเงินเดือน/เบี้ยเลี้ยงให้ ${soldier.full_name}`}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenEditSoldier && (
                            <button
                              type="button"
                              onClick={() => onOpenEditSoldier(soldier)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isLight 
                                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' 
                                  : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                              }`}
                              title="แก้ไขข้อมูลทหาร"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                          )}

                          {onToggleStatus && (
                            <button
                              type="button"
                              onClick={() => onToggleStatus(soldier, soldier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                soldier.status === 'ACTIVE'
                                  ? isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                                  : isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                              }`}
                              title={soldier.status === 'ACTIVE' ? 'คลิกเพื่อระงับสิทธิการใช้จ่าย' : 'คลิกเพื่อเปิดใช้งาน'}
                            >
                              {soldier.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {onOpenDeleteSoldier && (
                            <button
                              type="button"
                              onClick={() => onOpenDeleteSoldier(soldier)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isLight 
                                  ? 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-rose-600' 
                                  : 'bg-[#181B22] hover:bg-rose-950/40 border-[#262A36] hover:border-rose-800/40 text-rose-400'
                              }`}
                              title="ลบข้อมูลทหาร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Preview Soldier Photo Modal */}
      {previewSoldier && previewSoldier.photo_url && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPreviewSoldier(null)}
        >
          <div 
            className={`relative max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={normalizeDriveImageUrl(previewSoldier.photo_url)}
                alt={previewSoldier.full_name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPreviewSoldier(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-1 text-center">
              <div className="font-bold text-sm">{previewSoldier.full_name}</div>
              <div className="text-xs text-slate-400 font-mono">
                {previewSoldier.px_code} {previewSoldier.unit ? `• ${previewSoldier.unit}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

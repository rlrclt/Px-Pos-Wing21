import React from 'react';
import { 
  Plus, RefreshCw, Bug, Calculator, UserPlus, FileSpreadsheet, ExternalLink, Activity, Users, ShieldAlert, Layers,
  Calendar, DollarSign, Scissors
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme.ts';
import type { BatchItem } from './BatchesTab.tsx';
import { AdminStatCard } from './ui/AdminStatCard.tsx';
import { AdminActionCard } from './ui/AdminActionCard.tsx';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';

interface DashboardTabProps {
  selectedBatchId: string;
  setSelectedBatchId: (id: string) => void;
  availableBatches: BatchItem[];
  isLoadingBatches: boolean;
  isLoadingAdmin: boolean;
  loadAdminData: (batchId: string) => void;
  adminSoldiersCount: number;
  onOpenCreateBatch: () => void;
  onRunTestPing: () => void;
  onExportPayroll: () => void;
  isExportingPayroll: boolean;
  navigateToUsers: () => void;
  onOpenMonthlyDeductions?: () => void;
  onOpenPayrollCalendar?: () => void;
  onOpenSalaryTopup?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  selectedBatchId,
  setSelectedBatchId,
  availableBatches,
  isLoadingBatches,
  isLoadingAdmin,
  loadAdminData,
  adminSoldiersCount,
  onOpenCreateBatch,
  onRunTestPing,
  onExportPayroll,
  isExportingPayroll,
  navigateToUsers,
  onOpenMonthlyDeductions,
  onOpenPayrollCalendar,
  onOpenSalaryTopup
}) => {
  const { isLight } = useTheme();
  const currentBatch = availableBatches.find(b => b.batch_id === selectedBatchId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner & Batch Switcher Card */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <AdminSectionHeader
          title="แผงควบคุมระบบ (HQ Dashboard)"
          description="เลือกผลัดการทำงานและจัดการธุรกรรมภาพรวม"
          icon={Activity}
          badge="LIVE"
          actions={
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#181B22] border-[#262A36]'
              }`}>
                <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ผลัดปัจจุบัน:
                </span>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    loadAdminData(e.target.value);
                  }}
                  disabled={isLoadingBatches}
                  className={`bg-transparent text-xs sm:text-sm font-black focus:outline-none cursor-pointer ${
                    isLight ? 'text-blue-700' : 'text-blue-400'
                  }`}
                >
                  {availableBatches.length > 0 ? (
                    availableBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#111622] text-white'}>
                        {b.batch_name || b.batch_id}
                      </option>
                    ))
                  ) : (
                    <option value="">{isLoadingBatches ? 'กำลังโหลด...' : 'ยังไม่มีผลัด'}</option>
                  )}
                </select>
              </div>

              <button
                onClick={onOpenCreateBatch}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 active:scale-[0.98] min-h-[40px]"
              >
                <Plus className="w-4 h-4" /> สร้างผลัดใหม่
              </button>
            </div>
          }
        />

        {/* Quick KPI Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <AdminStatCard
            title="จำนวนทหารในผลัด"
            value={adminSoldiersCount.toLocaleString()}
            subtitle={`ผลัด ${selectedBatchId || '-'}`}
            icon={Users}
            accentColor="#3B82F6"
          />
          <AdminStatCard
            title="สถานะผลัดทหาร"
            value={currentBatch ? 'เปิดใช้งาน' : 'ไม่ได้เลือก'}
            subtitle={currentBatch?.batch_name || 'พร้อมทำรายการ'}
            icon={Layers}
            trend={{ text: 'ACTIVE', isPositive: true }}
            accentColor="#10B981"
          />
          <AdminStatCard
            title="ระบบความปลอดภัย"
            value="PASS"
            subtitle="Cloud Sync & Validation"
            icon={ShieldAlert}
            trend={{ text: 'SECURED', isPositive: true }}
            accentColor="#8B5CF6"
          />
        </div>

        {/* Quick Action Tiles */}
        <div className="mt-6">
          <p className={`text-xs uppercase font-bold tracking-wider mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            คำสั่งด่วนที่ใช้บ่อย
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {onOpenSalaryTopup && (
              <AdminActionCard
                title="เติมเงินเดือน (Data Grid)"
                description={selectedBatchId ? "เพิ่มวงเงิน/เบี้ยเลี้ยง/เงินสด คล้ายชีต" : "กรุณาเลือกผลัดก่อนใช้งาน"}
                icon={DollarSign}
                onClick={onOpenSalaryTopup}
                variant="primary"
                badge="ยอดนิยม"
                disabled={!selectedBatchId}
              />
            )}
            {onOpenMonthlyDeductions && (
              <AdminActionCard
                title="รายการหักประจำเดือน"
                description={selectedBatchId ? "ตัดผม, ซักรีด, โรงเลี้ยง, เงินออม ฯลฯ" : "กรุณาเลือกผลัดก่อนใช้งาน"}
                icon={Scissors}
                onClick={onOpenMonthlyDeductions}
                variant="primary"
                badge="ตัดยอด"
                disabled={!selectedBatchId}
              />
            )}
            {onOpenPayrollCalendar && (
              <AdminActionCard
                title="ปฏิทินวันเงินเดือนเข้า"
                description={selectedBatchId ? "กำหนดวันตัดยอด Cutoff & Payday" : "กรุณาเลือกผลัดก่อนใช้งาน"}
                icon={Calendar}
                onClick={onOpenPayrollCalendar}
                variant="secondary"
                disabled={!selectedBatchId}
              />
            )}
            <AdminActionCard
              title="รีเฟรชข้อมูล"
              description={selectedBatchId ? `ดึงข้อมูลผลัด ${selectedBatchId} ล่าสุด` : "ยังไม่ได้เลือกผลัด"}
              icon={RefreshCw}
              onClick={() => loadAdminData(selectedBatchId)}
              isLoading={isLoadingAdmin}
              variant="secondary"
              disabled={!selectedBatchId}
            />
            <AdminActionCard
              title="ตัดยอดหนี้สิ้นเดือน"
              description={selectedBatchId ? "สรุปยอดหนี้สิ้นเดือนส่ง Payroll" : "กรุณาเลือกผลัดก่อนใช้งาน"}
              icon={Calculator}
              onClick={onExportPayroll}
              isLoading={isExportingPayroll}
              badge="สิ้นเดือน"
              variant="secondary"
              disabled={!selectedBatchId}
            />
            <AdminActionCard
              title="จัดการผู้ใช้"
              description="กำหนดสิทธิ์ผู้ใช้งานและแคชเชียร์"
              icon={UserPlus}
              onClick={navigateToUsers}
              variant="secondary"
            />
            <AdminActionCard
              title="ตรวจสถานะ (Ping)"
              description="ทดสอบการเชื่อมต่อ Apps Script & API"
              icon={Bug}
              onClick={onRunTestPing}
              variant="warning"
            />
          </div>
        </div>
      </div>

      {/* Google Sheets Connections Card */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              ฐานข้อมูลคลาวด์ (Google Sheets)
            </h3>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ลิงก์เปิดดูสเปรดชีตจริงบน Google Drive
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <a 
            href="https://docs.google.com/spreadsheets/d/1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4/edit" 
            target="_blank" 
            rel="noreferrer"
            className={`p-4 rounded-xl border flex items-center justify-between group transition-all duration-150 select-none active:scale-[0.98] ${
              isLight ? 'bg-slate-50 hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-200' : 'bg-[#181B22] hover:bg-[#13221c] border-[#262A36] hover:border-[#1e3d30]'
            }`}
          >
            <div>
              <div className={`font-bold text-xs sm:text-sm ${isLight ? 'text-slate-800 group-hover:text-emerald-700' : 'text-slate-200 group-hover:text-emerald-400'}`}>
                Master Database Sheet
              </div>
              <div className={`text-[10px] mt-0.5 font-mono truncate max-w-[200px] sm:max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4
              </div>
            </div>
            <ExternalLink className={`w-4 h-4 ${isLight ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-400 group-hover:text-emerald-400'}`} />
          </a>

          {(() => {
            if (!currentBatch?.spreadsheet_id) return null;
            return (
              <a 
                href={`https://docs.google.com/spreadsheets/d/${currentBatch.spreadsheet_id}/edit`} 
                target="_blank" 
                rel="noreferrer"
                className={`p-4 rounded-xl border flex items-center justify-between group transition-all duration-150 select-none active:scale-[0.98] ${
                  isLight ? 'bg-slate-50 hover:bg-blue-50/70 border-slate-200 hover:border-blue-200' : 'bg-[#181B22] hover:bg-[#152233] border-[#262A36] hover:border-[#223955]'
                }`}
              >
                <div>
                  <div className={`font-bold text-xs sm:text-sm ${isLight ? 'text-slate-800 group-hover:text-blue-700' : 'text-slate-200 group-hover:text-blue-400'}`}>
                    Batch Sheet ({currentBatch.batch_name || currentBatch.batch_id})
                  </div>
                  <div className={`text-[10px] mt-0.5 font-mono truncate max-w-[200px] sm:max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {currentBatch.spreadsheet_id}
                  </div>
                </div>
                <ExternalLink className={`w-4 h-4 ${isLight ? 'text-slate-400 group-hover:text-blue-600' : 'text-slate-400 group-hover:text-blue-400'}`} />
              </a>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

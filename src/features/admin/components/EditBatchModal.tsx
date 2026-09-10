import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { parseBatchDate, getBatchLifecycleStatus } from '../../../core/dateUtils.ts';
import type { BatchItem } from './BatchesTab.tsx';

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchItem | null;
  onSuccess: (updatedBatchId: string) => void;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  isOpen,
  onClose,
  batch,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    batch_name: '',
    start_date: '',
    end_date: '',
    default_credit_limit: 1000
  });

  useEffect(() => {
    if (batch) {
      const s = parseBatchDate(batch.start_date);
      const e = parseBatchDate(batch.end_date);
      setForm({
        batch_name: batch.batch_name || `ผลัด ${batch.batch_id}`,
        start_date: s ? s.toISOString().split('T')[0] : '',
        end_date: e ? e.toISOString().split('T')[0] : '',
        default_credit_limit: batch.default_credit_limit || 1000
      });
      setError(null);
    }
  }, [batch]);

  if (!isOpen || !batch) return null;

  const lifecycleStatus = getBatchLifecycleStatus(form.start_date, form.end_date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      setError('วันที่สิ้นสุดผลัดต้องไม่เกิดขึ้นก่อนวันที่เริ่มต้นผลัด');
      return;
    }

    setIsUpdating(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'กำลังอัปเดตข้อมูลผลัด...',
      message: `กำลังบันทึกข้อมูลผลัด ${batch.batch_id} ลงชีต Batch_Config`
    }, 0);

    try {
      const res = await api.updateBatchConfig({
        batch_id: batch.batch_id,
        batch_name: form.batch_name,
        start_date: form.start_date,
        end_date: form.end_date,
        default_credit_limit: form.default_credit_limit
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'อัปเดตข้อมูลผลัดสำเร็จ',
          message: `แก้ไขผลัด ${batch.batch_id} เรียบร้อยแล้ว`
        });
        onSuccess(batch.batch_id);
        onClose();
      } else {
        setError(res.error || 'ไม่สามารถอัปเดตข้อมูลผลัดได้');
        showToast({
          type: 'error',
          title: 'อัปเดตล้มเหลว',
          message: res.error || 'เกิดข้อผิดพลาดในการบันทึก'
        });
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message
      });
    } finally {
      dismissToast(toastId);
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}>
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  แก้ไขข้อมูลและช่วงเวลาผลัด
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {batch.batch_id}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                กำหนดวันที่เริ่มต้น-สิ้นสุดผลัด เพื่อควบคุมสิทธิ์การหักเงินและเติมเงินเดือนอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lifecycle Status Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            lifecycleStatus === 'ACTIVE'
              ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : lifecycleStatus === 'EXPIRED'
              ? isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              : isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#181B22] border-[#262A36] text-slate-300'
          }`}>
            <div className="flex items-center gap-2 font-semibold text-xs">
              <Calendar className="w-4 h-4" />
              <span>สถานะผลัดคำนวณจากวันที่:</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              lifecycleStatus === 'ACTIVE' 
                ? 'bg-emerald-500 text-white' 
                : lifecycleStatus === 'EXPIRED' 
                ? 'bg-rose-500 text-white' 
                : 'bg-slate-500 text-white'
            }`}>
              {lifecycleStatus === 'ACTIVE' && '🟢 กำลังประจำการ (Active)'}
              {lifecycleStatus === 'EXPIRED' && '🔴 ปลดประจำการ/สิ้นสุดแล้ว (Expired)'}
              {lifecycleStatus === 'UPCOMING' && '🟡 ยังไม่เริ่มผลัด (Upcoming)'}
              {lifecycleStatus === 'UNKNOWN' && '⚪ ไม่ระบุวันที่'}
            </span>
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              ชื่อผลัด (Batch Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.batch_name}
              onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
              disabled={isUpdating}
              className={`w-full px-3 py-2 rounded-xl border focus:outline-none transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                  : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                วันที่เริ่มต้นผลัด
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                disabled={isUpdating}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                    : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                วันที่สิ้นสุดผลัด
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                disabled={isUpdating}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                    : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              วงเงินสวัสดิการเริ่มต้น (฿)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={form.default_credit_limit}
              onChange={(e) => setForm({ ...form, default_credit_limit: Number(e.target.value) || 0 })}
              disabled={isUpdating}
              className={`w-full px-3 py-2 rounded-xl border font-mono font-semibold focus:outline-none transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                  : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
              }`}
            />
          </div>

          <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
            isLight ? 'border-slate-200' : 'border-[#21262d]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
              }`}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isUpdating}
              className={`px-5 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                isLight 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

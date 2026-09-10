import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Trash2, RefreshCw, User, ShieldAlert
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import type { Soldier } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface SoldierDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  soldier: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number; soldier_id?: string }) | null;
  batchId: string;
  onSuccess?: () => void;
}

export const SoldierDeleteModal: React.FC<SoldierDeleteModalProps> = ({
  isOpen,
  onClose,
  soldier,
  batchId,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !soldier) return null;

  const limit = Number(soldier.credit_limit) || 0;
  const remaining = Number(soldier.credit_allowance_balance !== undefined ? soldier.credit_allowance_balance : soldier.remaining_credit) || 0;
  const used = Math.max(0, limit - remaining);
  const cash = Number(soldier.cash_wallet_balance || soldier.cash_balance) || 0;

  const hasOutstandingBalance = used > 0 || cash > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await api.deleteSoldier(batchId, soldier.px_code);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'ลบข้อมูลพลทหารสำเร็จ',
          message: res.message || `ลบ ${soldier.full_name} (${soldier.px_code}) ออกจากผลัด ${batchId} เรียบร้อย`
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'ลบข้อมูลไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาดในการลบ'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden my-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
          }`}
        >
          {/* Header */}
          <div className="p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold tracking-tight text-rose-500">
                ยืนยันการลบข้อมูลพลทหาร
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ผลัดทหาร: <span className="font-semibold text-blue-500">{batchId}</span>
              </p>
            </div>
          </div>

          {/* Soldier Card Details */}
          <div className="px-5 space-y-3">
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">{soldier.full_name}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {soldier.px_code} {soldier.unit ? `• ${soldier.unit}` : ''}
                  </div>
                </div>
              </div>

              {/* Outstanding balance warning */}
              {hasOutstandingBalance && (
                <div className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                  isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>แจ้งเตือน: มียอดเงินในระบบค้างอยู่</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div>ยอดใช้สวัสดิการ: <span className="font-bold text-rose-500">฿{used.toFixed(2)}</span></div>
                    <div>กระเป๋าเงินสด: <span className="font-bold text-emerald-500">฿{cash.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <p className={`text-[11px] text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              การลบจะนำรายชื่อออกจากตาราง Soldiers ในชีตของผลัดนี้อย่างถาวร
            </p>
          </div>

          {/* Buttons */}
          <div className="p-5 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' : 'bg-[#181B22] border-[#262A36] hover:bg-[#202738] text-slate-300'
              }`}
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> ยืนยันลบข้อมูล
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

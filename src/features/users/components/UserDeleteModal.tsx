import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Trash2,
  RefreshCw,
  User as UserIcon,
  Shield,
  UserCheck,
  Store,
  Lock
} from 'lucide-react';
import type { User } from '../../../types/schema.ts';
import { normalizeDriveImageUrl } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

export interface UserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (userId: string) => Promise<boolean>;
  user: User | null;
}

export const UserDeleteModal: React.FC<UserDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  user
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !user) return null;

  const isMasterAdmin =
    user.user_id === 'USR-01' ||
    user.username?.toLowerCase() === 'admin';

  const handleDelete = async () => {
    if (isMasterAdmin) {
      showToast({
        type: 'error',
        title: 'ไม่อนุญาตให้ลบ',
        message: 'ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (Master Admin) ได้'
      });
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onConfirmDelete(user.user_id);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถลบข้อมูลผู้ใช้งานได้'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
            <Shield className="w-3 h-3" /> ผู้ดูแลระบบ (ADMIN)
          </span>
        );
      case 'SELLER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <Store className="w-3 h-3" /> ผู้ฝากขาย (SELLER)
          </span>
        );
      case 'STAFF':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
            <UserCheck className="w-3 h-3" /> แคชเชียร์/คลัง (STAFF)
          </span>
        );
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
              isMasterAdmin
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
            }`}>
              {isMasterAdmin ? <Lock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>

            <div>
              <h3 className={`text-base font-bold tracking-tight ${isMasterAdmin ? 'text-amber-500' : 'text-rose-500'}`}>
                {isMasterAdmin ? 'บัญชีผู้ดูแลระบบหลัก (Master Admin)' : 'ยืนยันการลบบัญชีผู้ใช้งาน'}
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isMasterAdmin
                  ? 'ระบบไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบหลักเพื่อความปลอดภัย'
                  : 'การดำเนินการนี้จะถอนสิทธิ์การเข้าใช้งานระบบของผู้ใช้นี้'}
              </p>
            </div>
          </div>

          {/* User Card Details */}
          <div className="px-5 pb-4">
            <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#2A303F]'
              }`}>
                {user.avatar_url ? (
                  <img
                    src={normalizeDriveImageUrl(user.avatar_url)}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Photo';
                    }}
                  />
                ) : (
                  <UserIcon className={`w-6 h-6 opacity-30 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getRoleBadge()}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 font-bold">
                    {user.user_id}
                  </span>
                </div>
                <div className="text-sm font-bold truncate">{user.full_name}</div>
                <div className={`text-xs font-mono truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  @{user.username} {user.email ? `• ${user.email}` : ''}
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className={`mt-3.5 p-3 rounded-xl border text-xs space-y-1.5 ${
              isMasterAdmin
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}>
              {isMasterAdmin ? (
                <p className="font-semibold leading-relaxed">
                  ⚠️ บัญชี <strong>{user.username}</strong> ({user.user_id}) เป็นบัญชี Master Admin ประจำระบบ ไม่สามารถลบออกจากฐานข้อมูลได้
                </p>
              ) : (
                <>
                  <p className="font-semibold">⚠️ คำเตือนผลกระทบ:</p>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90 text-[11px] leading-relaxed">
                    <li>ผู้ใช้งานจะไม่สามารถลงชื่อเข้าใช้ระบบหรือขายสินค้าได้อีกต่อไป</li>
                    <li>ประวัติการขายและประวัติการทำรายการในอดีต (Audit Logs) จะยังคงอยู่</li>
                    <li>หากต้องการระงับใช้งานชั่วคราว สามารถปิดสวิตช์สถานะในหน้าแก้ไขแทนได้</li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
            isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/50 border-[#262A36]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                  : 'bg-[#181B22] border-[#262A36] hover:bg-[#202738] text-slate-300'
              }`}
            >
              {isMasterAdmin ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
            </button>

            {!isMasterAdmin && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> ยืนยันลบผู้ใช้งาน
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

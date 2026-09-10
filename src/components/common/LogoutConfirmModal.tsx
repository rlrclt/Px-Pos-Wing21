import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.ts';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  userRole?: string;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userRole
}) => {
  const { isLight } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-900' 
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            {/* Top Close Button */}
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isLight 
                    ? 'hover:bg-slate-100 border-slate-200 text-slate-500' 
                    : 'hover:bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-black tracking-tight">ยืนยันการออกจากระบบ?</h3>
            <p className={`text-sm mt-1 mb-5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              คุณกำลังจะออกจากบัญชีผู้ใช้{' '}
              <span className="font-semibold text-rose-400">
                {userName || 'ผู้ใช้งาน'} ({userRole || 'USER'})
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" />
                ออกจากระบบ
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

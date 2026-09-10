import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, UserCheck, AlertTriangle, CreditCard, 
  Wallet, CheckCircle2, User as UserIcon
} from 'lucide-react';
import type { Soldier } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface SoldierSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  soldiers: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number })[];
  onSelectSoldier: (soldier: Soldier & { remaining_credit?: number; cash_balance?: number }) => void;
  selectedSoldier?: (Soldier & { remaining_credit?: number; cash_balance?: number }) | null;
  disabledPxCodes?: string[];
  disabledBadgeText?: string;
  title?: string;
  allowInactive?: boolean;
}

export const SoldierSelectorModal: React.FC<SoldierSelectorModalProps> = ({
  isOpen,
  onClose,
  soldiers,
  onSelectSoldier,
  selectedSoldier,
  disabledPxCodes = [],
  disabledBadgeText = 'อยู่ในปาร์ตี้แล้ว',
  title = 'เลือกลูกค้า / ทหารผู้ซื้อ (Select Customer)',
  allowInactive = false
}) => {
  const { isLight } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSoldiers = useMemo(() => {
    if (!searchTerm.trim()) return soldiers;
    const q = searchTerm.trim().toLowerCase();
    return soldiers.filter(s => {
      const matchPx = s.px_code?.toLowerCase().includes(q);
      const matchName = s.full_name?.toLowerCase().includes(q);
      const matchNational = s.national_id?.toLowerCase().includes(q);
      const matchUnit = s.unit?.toLowerCase().includes(q);
      return matchPx || matchName || matchNational || matchUnit;
    });
  }, [soldiers, searchTerm]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
          }`}
        >
          {/* Header */}
          <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {title}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ค้นหาด้วย <strong>รหัส PX</strong>, <strong>ชื่อ-นามสกุล</strong> หรือ <strong>เลขบัตรประชาชน 13 หลัก</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-slate-200 dark:border-[#21262d]">
            <div className={`flex items-center px-3.5 py-2.5 rounded-xl border focus-within:ring-2 focus-within:ring-blue-500/40 transition-all ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#151c2e] border-[#28374f]'
            }`}>
              <Search className={`w-4 h-4 mr-2.5 flex-shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="สแกนบาร์โค้ดบัตร หรือพิมพ์ค้นหา: เช่น 691042, สมชาย, 14099..."
                className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm ${
                  isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-500'
                }`}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 text-xs"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Soldier List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-[#1d273a] space-y-1">
            {filteredSoldiers.length > 0 ? (
              filteredSoldiers.map((soldier) => {
                const isSelected = selectedSoldier?.px_code === soldier.px_code;
                const isAlreadyInList = disabledPxCodes.includes(soldier.px_code);
                const creditRemaining = soldier.remaining_credit !== undefined 
                  ? soldier.remaining_credit 
                  : (soldier.credit_limit - (soldier.credit_allowance_balance || 0));
                const cashBal = soldier.cash_balance !== undefined ? soldier.cash_balance : (soldier.cash_wallet_balance || 0);
                const isSuspended = soldier.status !== 'ACTIVE';
                const isBlocked = isAlreadyInList || (!allowInactive && isSuspended);

                return (
                  <div
                    key={soldier.px_code}
                    onClick={() => {
                      if (isBlocked) return;
                      onSelectSoldier(soldier);
                      onClose();
                    }}
                    className={`p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isBlocked
                        ? 'opacity-40 cursor-not-allowed bg-slate-500/5 select-none'
                        : isSelected
                        ? isLight ? 'bg-blue-50/80 border border-blue-300 cursor-pointer' : 'bg-blue-500/15 border border-blue-500/30 cursor-pointer'
                        : isLight ? 'hover:bg-slate-50 border border-transparent cursor-pointer' : 'hover:bg-[#161f33] border border-transparent cursor-pointer'
                    }`}
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                        {soldier.photo_url ? (
                          <img src={soldier.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-slate-400" />
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs sm:text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {soldier.full_name}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            {soldier.px_code}
                          </span>
                          {isAlreadyInList && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                              ✓ {disabledBadgeText}
                            </span>
                          )}
                          {isSuspended && !isAlreadyInList && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                              {soldier.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>สังกัด: <strong>{soldier.unit || '-'}</strong></span>
                          {soldier.national_id && (
                            <span>เลข ปชช: <strong className="font-mono">{soldier.national_id}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Credit & Cash Balances */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>เครดิต: ฿{creditRemaining.toFixed(2)}</span>
                      </div>
                      {cashBal > 0 && (
                        <div className="flex items-center justify-end gap-1 text-[11px] text-amber-500 mt-0.5">
                          <Wallet className="w-3 h-3" />
                          <span>เงินสด: ฿{cashBal.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="text-xs font-semibold">ไม่พบข้อมูลทหารที่ตรงกับ &quot;{searchTerm}&quot;</p>
                <p className="text-[10px] mt-0.5">กรุณาตรวจสอบรหัส PX หรือพิมพ์ค้นหาด้วยชื่อ</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-3.5 border-t text-xs flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#141a29] border-[#21262d] text-slate-400'
          }`}>
            <span>แสดง {filteredSoldiers.length} รายการ</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

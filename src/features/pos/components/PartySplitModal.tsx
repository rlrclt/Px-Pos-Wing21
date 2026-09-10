import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, X, Trash2, CheckCircle2, AlertCircle, 
  ArrowRight, ShieldCheck, AlertTriangle, Crown, Info
} from 'lucide-react';
import type { Soldier, PaymentMethod } from '../../../types/schema.ts';
import type { PartyParticipant } from '../../../store/usePosStore.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { SoldierSelectorModal } from './SoldierSelectorModal.tsx';

interface PartySplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  netPayable: number;
  soldiers: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number })[];
  partyParticipants: PartyParticipant[];
  splitMode: 'EQUAL' | 'FIXED' | 'PERCENT';
  onSetSplitMode: (mode: 'EQUAL' | 'FIXED' | 'PERCENT') => void;
  onAddParticipant: (soldier: Soldier) => void;
  onRemoveParticipant: (pxCode: string) => void;
  onSetHost?: (pxCode: string) => void;
  onUpdateAmount: (pxCode: string, amount: number) => void;
  onUpdatePercentage: (pxCode: string, pct: number) => void;
  onUpdatePayment: (pxCode: string, method: PaymentMethod, transferConfirmed?: boolean, cashReceived?: number) => void;
  onConfirmOrder: () => void;
  isProcessing?: boolean;
}

export const PartySplitModal: React.FC<PartySplitModalProps> = ({
  isOpen,
  onClose,
  netPayable,
  soldiers,
  partyParticipants,
  splitMode,
  onSetSplitMode,
  onAddParticipant,
  onRemoveParticipant,
  onSetHost,
  onUpdateAmount,
  onUpdatePercentage,
  onUpdatePayment,
  onConfirmOrder,
  isProcessing = false
}) => {
  const { isLight } = useTheme();
  const [showHostInfo, setShowHostInfo] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Calculate sum assigned and check validation
  const totalAssigned = useMemo(() => {
    return Number(partyParticipants.reduce((sum, p) => sum + (Number(p.amountAssigned) || 0), 0).toFixed(2));
  }, [partyParticipants]);

  const diff = Number((netPayable - totalAssigned).toFixed(2));
  const isExactMatch = Math.abs(diff) < 0.01 && partyParticipants.length > 0;

  // Check if all participants' payment methods are valid
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (partyParticipants.length === 0) {
      errors.push('กรุณาเพิ่มเพื่อนร่วมบิลอย่างน้อย 1 คน');
    }
    if (!isExactMatch) {
      errors.push(`ยอดเงินรวมยังไม่ตรงกับยอดบิล (คงเหลือ ${diff > 0 ? '+' : ''}${diff.toFixed(2)} บาท)`);
    }

    partyParticipants.forEach((p) => {
      const creditBal = p.soldier.credit_allowance_balance !== undefined 
        ? p.soldier.credit_limit - p.soldier.credit_allowance_balance
        : (p.soldier.credit_limit || 0);

      if (p.paymentMethod === 'CREDIT' && p.amountAssigned > creditBal) {
        errors.push(`${p.soldier.full_name}: วงเงินเครดิตไม่เพียงพอ (ต้องการ ${p.amountAssigned}฿ แต่มี ${creditBal}฿)`);
      }
      if (p.paymentMethod === 'CASH' && (p.cashReceived || 0) < p.amountAssigned) {
        errors.push(`${p.soldier.full_name}: รับเงินสดไม่ครบตามยอดที่ต้องจ่าย`);
      }
      if (p.paymentMethod === 'TRANSFER' && !p.transferConfirmed) {
        errors.push(`${p.soldier.full_name}: แคชเชียร์ยังไม่ได้กดยืนยันยอดเงินโอนเข้าบัญชี`);
      }
      if (p.amountAssigned < 0) {
        errors.push(`${p.soldier.full_name}: ยอดเงินต้องไม่ติดลบ`);
      }
    });

    return errors;
  }, [partyParticipants, isExactMatch, diff]);

  const canSubmit = validationErrors.length === 0 && !isProcessing;

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
            }`}
          >
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isLight ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-slate-200' : 'bg-gradient-to-r from-[#141b2e] to-[#161f36] border-[#21262d]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        🎉 จัดการหารบิลปาร์ตี้ (Party Split Bill Mode)
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {partyParticipants.length} คน
                      </span>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      ยอดรวมสุทธิที่ต้องหารชำระ: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">฿{netPayable.toFixed(2)} บาท</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Host Info Box */}
              {showHostInfo && (
                <div className={`p-3 text-xs border-b flex items-start gap-2 ${
                  isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                }`}>
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong>คำอธิบายสถานะ Host (ผู้เปิดบิลหลัก):</strong>
                    <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-300">
                      Host คือตัวแทนทหารที่ถูกใช้บันทึกหัวบิลในระบบ และกรณีหารเท่ากันแล้วมีเศษสตางค์ไม่ลงตัว เศษส่วนต่างจะถูกปัดเข้า Host คนนี้ (สามารถกดปุ่ม <strong>&quot;ตั้งเป็น Host&quot;</strong> เพื่อเปลี่ยนตัวแทนได้ตลอดเวลา)
                    </p>
                  </div>
                  <button onClick={() => setShowHostInfo(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Split Mode Selector & Add Member Bar */}
              <div className={`p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121827] border-[#1d273a]'
              }`}>
                {/* Radio Modes */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>รูปแบบการหาร:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="split_mode"
                      checked={splitMode === 'EQUAL'}
                      onChange={() => onSetSplitMode('EQUAL')}
                      className="text-blue-600"
                    />
                    <span>หารเท่าทุกคน (Equal)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="split_mode"
                      checked={splitMode === 'FIXED'}
                      onChange={() => onSetSplitMode('FIXED')}
                      className="text-blue-600"
                    />
                    <span>กำหนดจำนวนเงินเอง (บาท)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="split_mode"
                      checked={splitMode === 'PERCENT'}
                      onChange={() => onSetSplitMode('PERCENT')}
                      className="text-blue-600"
                    />
                    <span>ระบุสัดส่วน (%)</span>
                  </label>
                </div>

                {/* Add Member Button */}
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + เพิ่มเพื่อนร่วมบิล
                </button>
              </div>

              {/* Participants Table */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {partyParticipants.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#222e47]">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[11px] uppercase font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#151c2e] text-slate-300 border-[#222e47]'
                      }`}>
                        <tr>
                          <th className="py-2.5 px-3">ผู้ร่วมบิล</th>
                          <th className="py-2.5 px-3 text-center">เครดิตคงเหลือ</th>
                          <th className="py-2.5 px-3 text-right">ยอดที่ต้องจ่าย (฿)</th>
                          <th className="py-2.5 px-3">วิธีชำระเงิน</th>
                          <th className="py-2.5 px-3">การตรวจสอบ / ชำระ</th>
                          <th className="py-2.5 px-2 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-[#1e293f] text-slate-200'}`}>
                        {partyParticipants.map((p, idx) => {
                          const isHost = idx === 0;
                          const creditRemaining = p.soldier.credit_allowance_balance !== undefined
                            ? p.soldier.credit_limit - p.soldier.credit_allowance_balance
                            : (p.soldier.credit_limit || 0);
                          const isCreditLow = creditRemaining < p.amountAssigned;

                          return (
                            <tr key={p.soldier.px_code} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-[#151d2f]'}>
                              {/* Member Info */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-slate-400 font-bold text-xs">
                                    {p.soldier.photo_url ? (
                                      <img src={p.soldier.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      p.soldier.px_code.slice(-3)
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold flex items-center gap-1.5">
                                      <span>{p.soldier.full_name}</span>
                                      {isHost ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                                          <Crown className="w-2.5 h-2.5" />
                                          <span>Host</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowHostInfo(prev => !prev);
                                            }}
                                            className="text-amber-500 hover:text-amber-300 ml-0.5 cursor-pointer p-0.5"
                                            title="คลิกดูคำอธิบายสถานะ Host"
                                          >
                                            <Info className="w-2.5 h-2.5" />
                                          </button>
                                        </span>
                                      ) : onSetHost ? (
                                        <button
                                          type="button"
                                          onClick={() => onSetHost(p.soldier.px_code)}
                                          className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-500/15 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-transparent hover:border-amber-500/30 flex items-center gap-0.5 transition-colors cursor-pointer"
                                          title="สลับคนนี้ให้เป็น Host"
                                        >
                                          <Crown className="w-2.5 h-2.5" /> ตั้งเป็น Host
                                        </button>
                                      ) : null}
                                    </div>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {p.soldier.px_code} • {p.soldier.unit}
                                    </span>
                                  </div>
                                </div>
                              </td>

                            {/* Credit Balance */}
                            <td className="py-3 px-3 text-center">
                              <span className={`font-mono font-bold ${
                                isCreditLow ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                ฿{creditRemaining.toFixed(2)}
                              </span>
                              {isCreditLow && (
                                <span className="block text-[9px] text-rose-500 font-semibold">เครดิตไม่พอ</span>
                              )}
                            </td>

                            {/* Amount Assigned */}
                            <td className="py-3 px-3 text-right">
                              {splitMode === 'FIXED' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={p.amountAssigned}
                                  onChange={(e) => onUpdateAmount(p.soldier.px_code, Number(e.target.value) || 0)}
                                  className={`w-24 text-right px-2 py-1 rounded-lg border font-mono font-bold text-xs ${
                                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0f1422] border-[#2b3a55] text-white'
                                  }`}
                                />
                              ) : splitMode === 'PERCENT' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={p.percentage}
                                    onChange={(e) => onUpdatePercentage(p.soldier.px_code, Number(e.target.value) || 0)}
                                    className={`w-16 text-right px-1.5 py-1 rounded-lg border font-mono font-bold text-xs ${
                                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0f1422] border-[#2b3a55] text-white'
                                    }`}
                                  />
                                  <span className="text-[10px] text-slate-400">%</span>
                                  <span className="font-mono font-bold ml-1 text-emerald-600 dark:text-emerald-400">
                                    ฿{p.amountAssigned.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                                  ฿{p.amountAssigned.toFixed(2)}
                                </span>
                              )}
                            </td>

                            {/* Payment Method Selector */}
                            <td className="py-3 px-3">
                              <select
                                value={p.paymentMethod}
                                onChange={(e) => onUpdatePayment(p.soldier.px_code, e.target.value as PaymentMethod, p.transferConfirmed, p.cashReceived)}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#101726] border-[#28374f] text-slate-200'
                                }`}
                              >
                                <option value="CREDIT">💳 ตัดเครดิตสวัสดิการ</option>
                                <option value="CASH">💵 ชำระเงินสด</option>
                                <option value="TRANSFER">📱 สแกนโอน QR</option>
                              </select>
                            </td>

                            {/* Payment Details & Confirmations */}
                            <td className="py-3 px-3">
                              {p.paymentMethod === 'CREDIT' ? (
                                <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                                  !isCreditLow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                                }`}>
                                  {!isCreditLow ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                  {!isCreditLow ? 'เครดิตพอ (ตัดอัตโนมัติ)' : 'เครดิตไม่พอ'}
                                </span>
                              ) : p.paymentMethod === 'CASH' ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    placeholder="รับเงินสด"
                                    value={p.cashReceived || ''}
                                    onChange={(e) => onUpdatePayment(p.soldier.px_code, 'CASH', true, Number(e.target.value) || 0)}
                                    className={`w-20 px-2 py-1 rounded border text-xs font-mono ${
                                      isLight ? 'bg-white border-slate-300' : 'bg-[#0c101a] border-[#28374f] text-white'
                                    }`}
                                  />
                                  <span className="text-[10px] text-slate-400">
                                    ทอน ฿{p.cashChange > 0 ? p.cashChange.toFixed(2) : '0.00'}
                                  </span>
                                </div>
                              ) : (
                                /* TRANSFER */
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-500">
                                  <input
                                    type="checkbox"
                                    checked={p.transferConfirmed}
                                    onChange={(e) => onUpdatePayment(p.soldier.px_code, 'TRANSFER', e.target.checked, p.cashReceived)}
                                    className="rounded text-emerald-600"
                                  />
                                  <span>แคชเชียร์ตรวจยอดโอนแล้ว</span>
                                </label>
                              )}
                            </td>

                            {/* Remove button */}
                            <td className="py-3 px-2 text-right">
                              {!isHost && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveParticipant(p.soldier.px_code)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  title="ลบออกจากกลุ่ม"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">ยังไม่มีเพื่อนร่วมหารบิล กรุณากดปุ่ม &quot;+ เพิ่มเพื่อนร่วมบิล&quot; ด้านบน</p>
                </div>
              )}

              {/* Validation Summary Bar */}
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                isExactMatch
                  ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  {isExactMatch ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                  <span>
                    ยอดบิล: <strong>฿{netPayable.toFixed(2)}</strong> | จัดสรรแล้ว: <strong>฿{totalAssigned.toFixed(2)}</strong> (ผลต่าง: <strong>{diff.toFixed(2)}฿</strong>)
                  </span>
                </div>
                <div className="font-bold text-xs">
                  {isExactMatch ? '✓ จัดสรรยอดเงินครบถ้วน 100%' : '⚠️ ยอดเงินยังไม่ลงตัว กรุณาปรับยอดให้เท่ากับยอดบิล'}
                </div>
              </div>

              {/* Error list display if any */}
              {validationErrors.length > 0 && (
                <div className="space-y-1">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-rose-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{err}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121827] border-[#21262d]'
            }`}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ยกเลิก Party
              </button>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={onConfirmOrder}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                  canSubmit
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                    : 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                <span>บันทึกรายการ & ออก E-Slip (Enter)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Select Member Sub-Modal */}
      <SoldierSelectorModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        soldiers={soldiers}
        disabledPxCodes={partyParticipants.map(p => p.soldier.px_code)}
        disabledBadgeText="อยู่ในปาร์ตี้แล้ว"
        title="เพิ่มเพื่อนร่วมบิล (Add Party Member)"
        onSelectSoldier={(s) => {
          onAddParticipant(s);
          setIsAddMemberOpen(false);
        }}
      />
    </>
  );
};

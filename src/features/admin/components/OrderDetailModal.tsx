import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Receipt,
  User,
  Users,
  CreditCard,
  Banknote,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Ban,
  Clock,
  Package
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import type { Order, OrderItem, OrderSplit, Soldier } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  batchId?: string;
  onOrderVoided?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  batchId = '2569_1',
  onOrderVoided
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<(OrderItem & { product_name?: string; unit_name?: string })[]>([]);
  const [splits, setSplits] = useState<(OrderSplit & { soldier_name?: string; rank?: string; unit?: string })[]>([]);
  const [primaryBuyer, setPrimaryBuyer] = useState<Soldier | null>(null);

  // Void order state
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderDetails(orderId);
      setShowVoidConfirm(false);
      setVoidReason('');
    }
  }, [isOpen, orderId, batchId]);

  const loadOrderDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.getOrderDetails(batchId, id);
      if (res.success && res.data) {
        setOrder(res.data.order);
        setItems(res.data.items || []);
        setSplits(res.data.splits || []);
        setPrimaryBuyer(res.data.primary_buyer || null);
      } else {
        showToast({
          type: 'error',
          title: 'โหลดข้อมูลบิลไม่สำเร็จ',
          message: res.error || 'ไม่พบข้อมูล'
        });
      }
    } catch (e: any) {
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoidOrder = async () => {
    if (!orderId) return;
    if (!voidReason.trim()) {
      showToast({
        type: 'warning',
        title: 'กรุณาระบุเหตุผล',
        message: 'ต้องระบุเหตุผลในการยกเลิกบิล'
      });
      return;
    }

    setIsVoiding(true);
    try {
      const res = await api.voidOrder(batchId, {
        order_id: orderId,
        void_reason: voidReason,
        voided_by: 'ADMIN',
        authorized_by: 'ADMIN'
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'ยกเลิกบิลสำเร็จ',
          message: 'ระบบคืนยอดเงินเข้ากระเป๋าและปรับสต็อกเรียบร้อยแล้ว'
        });
        if (order) {
          setOrder({ ...order, status: 'VOIDED' });
        }
        setShowVoidConfirm(false);
        if (onOrderVoided) onOrderVoided();
      } else {
        showToast({
          type: 'error',
          title: 'ยกเลิกบิลไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาด'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'ข้อผิดพลาดระบบ',
        message: err.message
      });
    } finally {
      setIsVoiding(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#222734] text-slate-100'
          }`}
        >
          {/* Top Bar Header */}
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#181B22]/90 border-[#262A36]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight">
                    รายละเอียดบิล: {orderId}
                  </h3>
                  {order?.status === 'VOIDED' ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      ยกเลิกแล้ว (VOIDED)
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      สำเร็จ (COMPLETED)
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {order?.order_datetime ? new Date(order.order_datetime).toLocaleString('th-TH') : '-'}
                  <span className="opacity-40">•</span>
                  <span>แคชเชียร์: {order?.cashier_id || '-'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition ${
                isLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600' : 'bg-[#1E222D] border-[#2E3444] hover:bg-[#282D3D] text-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  กำลังโหลดข้อมูลบิล...
                </p>
              </div>
            ) : order ? (
              <>
                {/* Primary Buyer / Host Card */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {order.is_party_split ? '👑 ตัวแทนเปิดบิล (Host)' : 'ผู้ซื้อหลัก (Customer)'}:
                        </span>
                        <span className="font-bold text-sm">
                          {primaryBuyer ? primaryBuyer.full_name : order.primary_buyer_code}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        รหัส PX: <span className="font-mono font-medium">{order.primary_buyer_code}</span>
                        {primaryBuyer?.unit && <span> • สังกัด: {primaryBuyer.unit}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      วิธีชำระหลัก
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-1">
                      {order.payment_method === 'CREDIT' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                      {order.payment_method === 'CREDIT' ? 'เครดิตสวัสดิการ' : order.payment_method}
                    </span>
                  </div>
                </div>

                {/* Party Split Section (If party split is enabled) */}
                {order.is_party_split && (
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-[#181D2B]/70 border-[#2D374D]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          รายการหารจ่าย (Party Split Bill • {splits.length} คน)
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        หารเฉลี่ย ฿{(order.net_amount / (splits.length || 1)).toFixed(2)}/คน
                      </span>
                    </div>

                    <div className="space-y-2">
                      {splits.map((split, idx) => (
                        <div
                          key={split.split_id || idx}
                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                            isLight ? 'bg-white border-indigo-100' : 'bg-[#13161F] border-[#222734]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{split.rank ? `${split.rank} ` : ''}{split.soldier_name || split.participant_code}</span>
                                {split.participant_code === order.primary_buyer_code && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> Host
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {split.participant_code} {split.unit ? `• ${split.unit}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-bold text-indigo-400 font-mono text-sm">
                                ฿{Number(split.amount_assigned).toFixed(2)}
                              </div>
                              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                {split.payment_method === 'CREDIT' ? 'เครดิต' : 'เงินสด'}
                              </span>
                            </div>

                            {split.is_paid ? (
                              <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center" title="ชำระแล้ว">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center" title="ค้างชำระ">
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items Breakdown Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      <Package className="w-3.5 h-3.5" /> รายการสินค้าในบิล ({items.length} รายการ)
                    </span>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#181B22] border-[#262A36]'
                  }`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b ${isLight ? 'bg-slate-50/80 border-slate-200 text-slate-600' : 'bg-[#12151B] border-[#262A36] text-slate-400'}`}>
                          <th className="py-2.5 px-3 font-semibold">สินค้า</th>
                          <th className="py-2.5 px-3 text-center font-semibold">จำนวน</th>
                          <th className="py-2.5 px-3 text-right font-semibold">ราคา/หน่วย</th>
                          <th className="py-2.5 px-3 text-right font-semibold">รวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#21262d]">
                        {items.map((item, idx) => (
                          <tr key={item.item_id || idx} className={item.is_voided ? 'opacity-40 line-through' : ''}>
                            <td className="py-2.5 px-3">
                              <div className="font-bold">{item.product_name || item.barcode}</div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                <span>{item.barcode}</span>
                                {item.seller_id && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                    {item.seller_id}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium">
                              {item.actual_qty} {item.unit_name || 'ชิ้น'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              ฿{Number(item.unit_price).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono">
                              ฿{Number(item.subtotal).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Calculation */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
                }`}>
                  <div className="flex justify-between text-xs">
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>ยอดรวมสินค้า (Gross)</span>
                    <span className="font-mono">฿{Number(order.total_amount).toFixed(2)}</span>
                  </div>
                  {order.discount_total > 0 && (
                    <div className="flex justify-between text-xs text-rose-500">
                      <span>ส่วนลดโปรโมชั่น</span>
                      <span className="font-mono">-฿{Number(order.discount_total).toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`pt-2 border-t flex justify-between items-center text-sm font-bold ${
                    isLight ? 'border-slate-200 text-slate-900' : 'border-[#262A36] text-white'
                  }`}>
                    <span>ยอดสุทธิที่ชำระ (Net Payable)</span>
                    <span className="text-base text-blue-500 font-mono">฿{Number(order.net_amount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Void Order Section */}
                {order.status !== 'VOIDED' && (
                  <div className="pt-2">
                    {showVoidConfirm ? (
                      <div className={`p-3.5 rounded-xl border border-rose-500/30 space-y-3 ${
                        isLight ? 'bg-rose-50/60' : 'bg-rose-950/20'
                      }`}>
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>ยืนยันการยกเลิกบิล (Void Order)</span>
                        </div>
                        <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          การยกเลิกบิลจะทำการคืนเงินเข้ากระเป๋าของทหารทุกคน และปรับสต็อกสินค้ากลับเข้าคลังอัตโนมัติ
                        </p>
                        <input
                          type="text"
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder="ระบุเหตุผล เช่น ลูกค้าคืนสินค้า / คิดเงินผิด..."
                          className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-hidden focus:ring-1 focus:ring-rose-500 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                          }`}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowVoidConfirm(false)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            disabled={isVoiding}
                            onClick={handleVoidOrder}
                            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isVoiding ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกบิล'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => setShowVoidConfirm(true)}
                          className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-rose-500/20"
                        >
                          <Ban className="w-3.5 h-3.5" /> ยกเลิกบิลนี้ (Void Order)
                        </button>

                        <button
                          type="button"
                          onClick={handlePrint}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> พิมพ์สลิป
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

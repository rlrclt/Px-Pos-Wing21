import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Printer, ArrowRight } from 'lucide-react';
import type { CartItem, PartyParticipant } from '../../../store/usePosStore.ts';

interface ESlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  cartItems: CartItem[];
  netPayable: number;
  discountTotal?: number;
  cashierName?: string;
  isParty: boolean;
  partyParticipants?: PartyParticipant[];
  singleBuyerName?: string;
  singleBuyerPxCode?: string;
  singlePaymentMethod?: string;
  onNextOrder: () => void;
}

export const ESlipModal: React.FC<ESlipModalProps> = ({
  isOpen,
  onClose,
  orderId,
  cartItems,
  netPayable,
  discountTotal = 0,
  cashierName = 'จ่าเวร แคชเชียร์',
  isParty,
  partyParticipants = [],
  singleBuyerName,
  singleBuyerPxCode,
  singlePaymentMethod = 'CREDIT',
  onNextOrder
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.actual_qty, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="w-full max-w-md rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl flex flex-col overflow-hidden font-sans"
        >
          {/* Slip Header Banner */}
          <div className="p-4 bg-emerald-600 text-white text-center relative">
            <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-1">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-black text-base tracking-tight">ชำระเงินสำเร็จ (Payment Completed)</h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">ออกใบเสร็จอิเล็กทรอนิกส์ E-Slip เรียบร้อย</p>
          </div>

          {/* Slip Content (Receipt Paper Style) */}
          <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3.5 text-xs text-slate-700 bg-white">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-sm text-slate-900">PX หน่วยฝึกทหารใหม่ พัน.อย.บน.21</h2>
              <p className="text-[10px] text-slate-500">AIR COMBAT COMMAND WING 21 POS</p>
              <div className="mt-2 text-[11px] font-mono text-slate-600 flex justify-between">
                <span>TxID: <strong>{orderId}</strong></span>
                <span>{dateStr} {timeStr}</span>
              </div>
              <div className="text-[10px] text-slate-500 text-left mt-0.5">
                แคชเชียร์: <strong>{cashierName}</strong>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase mb-1.5 pb-1 border-b">
                <span>รายการสินค้า</span>
                <span>จำนวน</span>
                <span>รวม (฿)</span>
              </div>

              <div className="divide-y divide-slate-100 space-y-1">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="pt-1.5 flex justify-between items-start text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-slate-900 flex items-center gap-1 flex-wrap">
                        <span>{item.product_name}</span>
                        {item.discount_amount > 0 && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                            ลด ฿{item.discount_amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.barcode} {item.seller_name ? `(${item.seller_name})` : ''}
                      </div>
                    </div>
                    <div className="w-12 text-center font-mono font-semibold">
                      {item.actual_qty} {item.unit_name || 'ชิ้น'}
                    </div>
                    <div className="w-16 text-right font-mono font-bold text-slate-900">
                      ฿{item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Totals */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>ยอดรวมสินค้าปกติ (Gross) ({totalItemsCount} ชิ้น)</span>
                <span className="font-mono font-semibold">฿{(netPayable + discountTotal).toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 text-[11px]">
                  <span>ส่วนลดโปรโมชั่น (Promotion Discount)</span>
                  <span className="font-mono font-bold">-฿{discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t">
                <span>ยอดสุทธิที่ต้องชำระ (Net Total)</span>
                <span className="font-mono text-emerald-600">฿{netPayable.toFixed(2)} บาท</span>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="pt-2.5 border-t border-dashed border-slate-300">
              <div className="font-bold text-[11px] text-slate-900 mb-1.5 uppercase tracking-wide">
                {isParty ? 'รายละเอียดการชำระ (Party Split)' : 'รายละเอียดการชำระเงิน'}
              </div>

              {isParty ? (
                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                  {partyParticipants.map((p, i) => (
                    <div key={i} className="flex justify-between items-center pb-1.5 border-b last:border-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-800">
                          {i + 1}. {p.soldier.full_name} ({p.soldier.px_code})
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ชำระผ่าน: {p.paymentMethod === 'CREDIT' ? '💳 เครดิต' : p.paymentMethod === 'CASH' ? '💵 เงินสด' : '📱 สแกนโอน'}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-right text-emerald-700">
                        ฿{p.amountAssigned.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">{singleBuyerName} ({singleBuyerPxCode})</div>
                    <div className="text-[10px] text-slate-500">
                      ช่องทาง: {singlePaymentMethod === 'CREDIT' ? '💳 ตัดเครดิตสวัสดิการ' : singlePaymentMethod === 'CASH' ? '💵 เงินสด' : '📱 โอนเงิน'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-600 text-sm">
                    ฿{netPayable.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Slip message */}
            <div className="text-center pt-2 text-[10px] text-slate-400">
              *** ขอบคุณที่ใช้บริการ PX WING21 ***
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์สลิป
            </button>

            <button
              onClick={() => {
                onClose();
                onNextOrder();
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>เสร็จสิ้น / รับคิวถัดไป</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, ShoppingCart, UserCheck, Users, Trash2, Plus, Minus, 
  CreditCard, Wallet, QrCode, RefreshCw, ArrowLeft, ArrowRight,
  CheckCircle2, X, Crown, Info, AlertTriangle, ShieldAlert, Lock
} from 'lucide-react';
import type { 
  Soldier, ProductCatalog, Seller, ProductUOMConversion, 
  PaymentMethod, Promotion 
} from '../../types/schema.ts';
import { 
  evaluateCartPromotions, 
  getTodayDateString, 
  type CartPromotionSummary,
  type ItemPromotionResult
} from '../promotions/promotionEngine.ts';
import type { RoutePath } from '../../types/ui.ts';
import { api } from '../../core/api.ts';
import { useTheme } from '../../hooks/useTheme.ts';
import { useToast } from '../../hooks/useToast.ts';
import { usePosStore } from '../../store/usePosStore.ts';
import { isBatchOperationAllowed, formatBatchDateRange } from '../../core/dateUtils.ts';
import type { BatchItem } from '../admin/components/BatchesTab.tsx';

import { SoldierSelectorModal } from './components/SoldierSelectorModal.tsx';
import { CategorySlider } from './components/CategorySlider.tsx';
import { ProductGrid } from './components/ProductGrid.tsx';
import { PartySplitModal } from './components/PartySplitModal.tsx';
import { ESlipModal } from './components/ESlipModal.tsx';

interface PosViewProps {
  soldiers: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number })[];
  products: ProductCatalog[];
  liveUOMs: ProductUOMConversion[];
  sellers: Seller[];
  promotions?: Promotion[];
  selectedBatchId: string;
  setSelectedBatchId?: (id: string) => void;
  availableBatches?: BatchItem[];
  currentBatch?: BatchItem;
  onNavigate: (path: RoutePath) => void;
  onRefreshData?: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  soldiers,
  products,
  liveUOMs = [],
  sellers = [],
  promotions = [],
  selectedBatchId,
  setSelectedBatchId,
  availableBatches = [],
  currentBatch,
  onNavigate,
  onRefreshData
}) => {
  const { isLight, toggleTheme } = useTheme();
  const { showToast, dismissToast } = useToast();

  const batchGuard = isBatchOperationAllowed(currentBatch?.start_date, currentBatch?.end_date);

  const {
    cart,
    primaryBuyer,
    setPrimaryBuyer,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isPartyMode,
    partySplitMode,
    partyParticipants,
    togglePartyMode,
    setPartySplitMode,
    addPartyParticipant,
    removePartyParticipant,
    setPartyHost,
    updateParticipantAmount,
    updateParticipantPercentage,
    updateParticipantPayment
  } = usePosStore();

  // Local View States
  const [productSearch, setProductSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isAddPartyMemberOpen, setIsAddPartyMemberOpen] = useState(false);
  const [showHostInfo, setShowHostInfo] = useState(false);
  const [isESlipOpen, setIsESlipOpen] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<PaymentMethod>('CREDIT');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [transferConfirmed, setTransferConfirmed] = useState(false);

  // Promotions State & Dynamic Evaluation
  const [localPromotions, setLocalPromotions] = useState<Promotion[]>(promotions || []);

  React.useEffect(() => {
    if (promotions && promotions.length > 0) {
      setLocalPromotions(promotions);
    } else {
      api.getPromotions().then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          setLocalPromotions(res.data);
        }
      }).catch(err => console.error('Failed to load promotions in POS:', err));
    }
  }, [promotions]);

  // Dynamic Promotion Engine Calculation on current cart
  const promoSummary: CartPromotionSummary = useMemo(() => {
    const cartItemsForPromo = cart.map(item => ({
      barcode: item.barcode,
      selling_price: item.unit_price,
      quantity: item.actual_qty,
      seller_id: item.seller_id,
      product_name: item.product_name
    }));
    return evaluateCartPromotions(cartItemsForPromo, localPromotions, getTodayDateString());
  }, [cart, localPromotions]);

  const promoItemMap = useMemo(() => {
    const map = new Map<string, ItemPromotionResult>();
    promoSummary.items.forEach(it => {
      map.set(it.barcode, it);
    });
    return map;
  }, [promoSummary]);

  const effectiveTotalGross = promoSummary.total_gross;
  const effectiveDiscountTotal = promoSummary.total_discount;
  const effectiveNetPayable = promoSummary.net_total;

  // Sync Party Splits when promotional net payable updates
  React.useEffect(() => {
    if (isPartyMode && partyParticipants.length > 0) {
      usePosStore.getState().recalculatePartySplits(effectiveNetPayable);
    }
  }, [effectiveNetPayable, isPartyMode, partyParticipants.length]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Category list and counts
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  }, [products]);

  const categoryCounts = useMemo(() => {
    const activeProds = products.filter(p => {
      if (p.is_active === false) return false;
      if (p.seller_id) {
        const seller = sellers.find(s => s.seller_id === p.seller_id);
        if (seller && seller.is_active === false) return false;
      }
      return true;
    });
    const counts: Record<string, number> = { ALL: activeProds.length };
    activeProds.forEach(p => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products, sellers]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.is_active === false) return false;
      if (p.seller_id) {
        const seller = sellers.find(s => s.seller_id === p.seller_id);
        if (seller && seller.is_active === false) return false;
      }
      const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
      const q = productSearch.trim().toLowerCase();
      const matchSearch = !q || p.product_name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, sellers, activeCategory, productSearch]);

  // Barcode Scanner Listener
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) {
      showToast({ type: 'warning', title: 'POS ถูกล็อค', message: 'กรุณาเลือกผลัดทหารก่อนยิงบาร์โค้ด' });
      return;
    }
    const barcode = productSearch.trim();
    if (!barcode) return;

    // Check UOM Pack first
    const matchedUom = liveUOMs.find(u => u.barcode === barcode && u.is_active !== false);
    if (matchedUom) {
      const baseProduct = products.find(p => p.barcode === matchedUom.base_barcode);
      if (baseProduct) {
        if (baseProduct.is_active === false) {
          showToast({ type: 'warning', title: 'สินค้าถูกระงับการขาย', message: `${baseProduct.product_name} ถูกปิดการขายอยู่` });
          setProductSearch('');
          return;
        }
        if (baseProduct.seller_id) {
          const seller = sellers.find(s => s.seller_id === baseProduct.seller_id);
          if (seller && seller.is_active === false) {
            showToast({ type: 'warning', title: 'สินค้าถูกระงับการขาย', message: `ร้านค้าผู้ฝากขาย (${seller.seller_name}) ถูกปิดใช้งานอยู่` });
            setProductSearch('');
            return;
          }
        }
        addToCart({
          ...baseProduct,
          barcode: matchedUom.barcode,
          product_name: `${baseProduct.product_name} (${matchedUom.unit_name})`,
          selling_price: matchedUom.selling_price,
          unit_name: matchedUom.unit_name,
          conversion_factor: matchedUom.conversion_factor,
          parent_barcode: baseProduct.barcode
        });
        showToast({ type: 'success', title: `เพิ่ม ${matchedUom.unit_name} ลงตะกร้า`, message: baseProduct.product_name });
        setProductSearch('');
        return;
      }
    }

    // Check direct product
    const matchedProduct = products.find(p => p.barcode === barcode);
    if (matchedProduct) {
      if (matchedProduct.is_active === false) {
        showToast({ type: 'warning', title: 'สินค้าถูกระงับการขาย', message: `${matchedProduct.product_name} ถูกปิดการขายอยู่` });
        setProductSearch('');
        return;
      }
      if (matchedProduct.seller_id) {
        const seller = sellers.find(s => s.seller_id === matchedProduct.seller_id);
        if (seller && seller.is_active === false) {
          showToast({ type: 'warning', title: 'สินค้าถูกระงับการขาย', message: `ร้านค้าผู้ฝากขาย (${seller.seller_name}) ถูกปิดใช้งานอยู่` });
          setProductSearch('');
          return;
        }
      }
      if (Number(matchedProduct.stock_qty) <= 0) {
        showToast({ type: 'warning', title: 'สินค้าหมด', message: `${matchedProduct.product_name} ไม่มีสต็อกคงเหลือ` });
      } else {
        addToCart(matchedProduct);
        showToast({ type: 'success', title: 'เพิ่มสินค้าลงตะกร้า', message: matchedProduct.product_name });
      }
      setProductSearch('');
      return;
    }

    showToast({ type: 'warning', title: 'ไม่พบสินค้า', message: `ไม่พบสินค้ารหัส ${barcode}` });
  };

  // Process Single / Party Order
  const handleProcessOrder = async () => {
    if (!selectedBatchId) {
      showToast({ type: 'error', title: 'ยังไม่ได้เลือกผลัด', message: 'กรุณาเลือกผลัดทหารก่อนดำเนินการชำระเงิน' });
      return;
    }

    if (!batchGuard.allowed) {
      showToast({ type: 'error', title: 'ไม่อนุญาตให้ทำรายการ', message: batchGuard.reason });
      return;
    }

    if (!primaryBuyer) {
      showToast({ type: 'warning', title: 'กรุณาเลือกลูกค้า', message: 'ต้องระบุทหารผู้ซื้อหลักก่อนชำระเงิน' });
      setIsBuyerModalOpen(true);
      return;
    }

    if (cart.length === 0) {
      showToast({ type: 'warning', title: 'ตะกร้าว่างเปล่า', message: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' });
      return;
    }

    // Single order validations
    if (!isPartyMode) {
      const creditRemaining = primaryBuyer.remaining_credit !== undefined 
        ? primaryBuyer.remaining_credit 
        : (primaryBuyer.credit_limit - (primaryBuyer.credit_allowance_balance || 0));

      if (singlePaymentMethod === 'CREDIT' && creditRemaining < effectiveNetPayable) {
        showToast({
          type: 'error',
          title: 'วงเงินสวัสดิการไม่เพียงพอ',
          message: `ยอดซื้อ ฿${effectiveNetPayable.toFixed(2)} เกินยอดคงเหลือ ฿${creditRemaining.toFixed(2)} กรุณาเลือกชำระเงินสดหรือโอนเงิน`
        });
        return;
      }

      if (singlePaymentMethod === 'CASH' && Number(cashReceived) < effectiveNetPayable) {
        showToast({ type: 'warning', title: 'รับเงินสดไม่ครบ', message: 'กรุณากรอกยอดเงินสดที่ได้รับให้มากกว่าหรือเท่ากับยอดบิล' });
        return;
      }

      if (singlePaymentMethod === 'TRANSFER' && !transferConfirmed) {
        showToast({ type: 'warning', title: 'ยังไม่ได้ยืนยันยอดโอน', message: 'กรุณาตรวจสอบยอดเงินโอนเข้าบัญชีก่อนยืนยัน' });
        return;
      }
    }

    setIsSubmittingOrder(true);
    const toastId = showToast({
      type: 'loading',
      title: 'กำลังบันทึกบิลการขาย...',
      message: 'กำลังตัดสต็อกและบันทึกข้อมูลลงระบบ'
    }, 0);

    const now = new Date();
    const orderId = `ORD-${selectedBatchId}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const orderPayload = {
      order: {
        order_id: orderId,
        order_datetime: now.toISOString(),
        cashier_id: 'CASHIER-01',
        shift_id: 'SHIFT-01',
        primary_buyer_code: primaryBuyer.px_code,
        total_amount: effectiveTotalGross,
        discount_total: effectiveDiscountTotal,
        net_amount: effectiveNetPayable,
        payment_method: isPartyMode ? 'PARTY' : singlePaymentMethod,
        is_party_split: isPartyMode,
        status: 'COMPLETED'
      },
      items: cart.map((item, idx) => {
        const promoRes = promoItemMap.get(item.barcode);
        const actual_qty = promoRes ? promoRes.actual_qty : item.actual_qty;
        const charged_qty = promoRes ? promoRes.charged_qty : item.charged_qty;
        const discount_amount = promoRes ? promoRes.discount_amount : (item.discount_amount || 0);
        const subtotal = promoRes ? promoRes.net_subtotal : item.subtotal;

        return {
          item_id: `ITEM-${orderId}-${idx + 1}`,
          order_id: orderId,
          barcode: item.barcode,
          actual_qty,
          charged_qty,
          cost_price_at_sale: item.cost_price_at_sale || 0,
          unit_price: item.unit_price,
          discount_amount,
          subtotal,
          seller_id: item.seller_id || 'S01'
        };
      }),
      splits: isPartyMode ? partyParticipants.map((p, idx) => ({
        split_id: `SPLIT-${orderId}-${idx + 1}`,
        order_id: orderId,
        participant_code: p.soldier.px_code,
        split_type: p.splitType,
        amount_assigned: p.amountAssigned,
        payment_method: p.paymentMethod,
        is_paid: true,
        paid_at: now.toISOString()
      })) : []
    };

    try {
      const res = await api.createOrder(orderPayload, selectedBatchId);
      dismissToast(toastId);

      if (res.success) {
        setCompletedOrderId(orderId);
        setIsPartyModalOpen(false);
        setIsESlipOpen(true);
        if (onRefreshData) onRefreshData();
      } else {
        showToast({
          type: 'error',
          title: 'บันทึกบิลไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาดในการบันทึกบิล'
        });
      }
    } catch (err: any) {
      dismissToast(toastId);
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        message: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const primaryCreditRemaining = primaryBuyer ? (
    primaryBuyer.remaining_credit !== undefined 
      ? primaryBuyer.remaining_credit 
      : (primaryBuyer.credit_limit - (primaryBuyer.credit_allowance_balance || 0))
  ) : 0;

  const primaryCashBal = primaryBuyer ? (
    primaryBuyer.cash_balance !== undefined 
      ? primaryBuyer.cash_balance 
      : (primaryBuyer.cash_wallet_balance || 0)
  ) : 0;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0d14] text-slate-100'
    }`}>
      {/* POS Top Bar */}
      <header className={`h-14 px-4 border-b flex items-center justify-between shrink-0 ${
        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0f1422] border-[#1d273a]'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/admin')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-[#182030] hover:bg-[#232f48] border-[#293854] text-slate-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้า Admin</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${selectedBatchId ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-bold text-xs sm:text-sm">PX POS WING 21</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
              selectedBatchId 
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}>
              {selectedBatchId ? `ผลัด ${currentBatch?.batch_name || selectedBatchId}` : '⚠️ ยังไม่ได้เลือกผลัด'}
            </span>
          </div>
        </div>

        {/* Right Header Status & Batch Switcher */}
        <div className="flex items-center gap-2.5">
          {availableBatches.length > 0 && setSelectedBatchId && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#182030] border-[#293854]'
            }`}>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ผลัด:
              </span>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  clearCart();
                  setPrimaryBuyer(null);
                }}
                className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
                  isLight ? 'text-blue-700' : 'text-blue-400'
                }`}
              >
                <option value="">-- เลือกผลัด --</option>
                {availableBatches.map((b) => (
                  <option key={b.batch_id} value={b.batch_id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#111622] text-white'}>
                    {b.batch_name || b.batch_id} {(b.is_active_batch || b.is_active) ? '(🟢 ปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border text-xs cursor-pointer ${
              isLight ? 'bg-slate-100 border-slate-300 hover:bg-slate-200' : 'bg-[#182030] border-[#293854] hover:bg-[#222d44]'
            }`}
            title="สลับธีม"
          >
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* No Batch Warning Banner */}
      {!selectedBatchId && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>⚠️ ยังไม่ได้เชื่อมต่อผลัดทหาร:</strong> กรุณาเลือกผลัดทหารจากเมนูด้านบนก่อนทำรายการขาย เพื่อให้ระบบสามารถดึงรายชื่อและตัดยอดสวัสดิการได้ถูกต้อง
            </span>
          </div>
        </div>
      )}

      {/* Expired Batch Warning Banner */}
      {selectedBatchId && !batchGuard.allowed && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              <strong>ผลัดสิ้นสุดระยะเวลาแล้ว ({formatBatchDateRange(currentBatch?.start_date, currentBatch?.end_date)}):</strong> ระบบล็อคการทำรายการขายเพื่อป้องกันการตัดยอดเกินกำหนด
            </span>
          </div>
        </div>
      )}

      {/* Main Split Layout: Left (Catalog) + Right (Cart & Customer) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Full Lock Screen Overlay when No Batch Selected */}
        {!selectedBatchId && (
          <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border text-center space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#111726] border-[#253552] text-white'
            }`}>
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto ring-8 ring-amber-500/10 shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black tracking-tight">ระบบขายหน้าร้านถูกล็อค (POS Locked)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ยังไม่ได้เลือกหรือเชื่อมต่อผลัดทหาร กรุณาเลือกผลัดทหารก่อนเริ่มทำรายการขาย สแกนบาร์โค้ด หรือคิดเงิน
                </p>
              </div>

              {availableBatches.length > 0 && setSelectedBatchId ? (
                <div className="pt-2 space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-400 block">
                    เลือกผลัดทหารที่ต้องการเปิดขาย:
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      clearCart();
                      setPrimaryBuyer(null);
                    }}
                    className={`w-full py-3 px-3.5 rounded-2xl border text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all ${
                      isLight ? 'bg-slate-50 border-slate-300 text-blue-700' : 'bg-[#182030] border-[#2b3a55] text-cyan-300'
                    }`}
                  >
                    <option value="">-- คลิกเลือกผลัดทหาร --</option>
                    {availableBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#111622] text-white'}>
                        {b.batch_name || b.batch_id} {(b.is_active_batch || b.is_active) ? '(🟢 ปัจจุบัน)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-rose-400 py-2">
                  ไม่พบข้อมูลผลัดในระบบ กรุณาไปเพิ่มผลัดในหน้า Admin ก่อน
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/admin')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-[#182030] hover:bg-[#232f48] border-[#293854] text-slate-200'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับหน้า Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Left Side: Product Catalog & Search (65%) */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {/* Top Row: Barcode Scanner / Product Search */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className={`flex-1 flex items-center px-3.5 py-2.5 rounded-2xl border focus-within:ring-2 focus-within:ring-blue-500/40 transition-all ${
              isLight ? 'bg-white border-slate-300 shadow-xs' : 'bg-[#121929] border-[#253552]'
            }`}>
              <Search className={`w-4 h-4 mr-2.5 flex-shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                ref={barcodeInputRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                disabled={!selectedBatchId}
                placeholder={!selectedBatchId ? "🔒 ระบบถูกล็อค (กรุณาเลือกผลัดทหารก่อน)" : "🔍 ยิงบาร์โค้ดสินค้าที่นี่ (กด Enter) หรือพิมพ์ค้นหาชื่อสินค้า..."}
                className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-500'
                }`}
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ล้าง
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!selectedBatchId}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>ค้นหา/ยิง</span>
            </button>
          </form>

          {/* Category Horizontal Slider */}
          <CategorySlider
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            categoryCounts={categoryCounts}
          />

          {/* Product Cards Grid */}
          <div className="flex-1">
            <ProductGrid
              products={filteredProducts}
              liveUOMs={liveUOMs}
              liveSellers={sellers}
              promotions={localPromotions}
              onAddToCart={(product) => {
                if (!selectedBatchId) {
                  showToast({ type: 'warning', title: 'POS ถูกล็อค', message: 'กรุณาเลือกผลัดทหารก่อนหยิบสินค้า' });
                  return;
                }
                addToCart(product);
              }}
            />
          </div>
        </div>

        {/* Right Side: Customer Details, Cart & Checkout (35%) */}
        <div className={`w-full lg:w-96 xl:w-[420px] border-t lg:border-t-0 lg:border-l flex flex-col justify-between shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f1422] border-[#1d273a]'
        }`}>
          {/* 1. Customer Profile Card (Shown only in Single Buyer Mode) */}
          {!isPartyMode && (
            <div className={`p-4 border-b ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141b2c] border-[#1f2a3f]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  1. ข้อมูลผู้ซื้อหลัก (Customer)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBatchId) {
                      showToast({ type: 'warning', title: 'ยังไม่ได้เลือกผลัด', message: 'กรุณาเลือกผลัดทหารก่อนเลือกลูกค้า' });
                      return;
                    }
                    setIsBuyerModalOpen(true);
                  }}
                  disabled={!selectedBatchId}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                    !selectedBatchId
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                      : primaryBuyer
                      ? isLight ? 'bg-white border-slate-300 text-blue-600 cursor-pointer' : 'bg-[#1d273e] border-[#2e3f63] text-cyan-400 cursor-pointer'
                      : 'bg-blue-600 text-white border-blue-600 cursor-pointer'
                  }`}
                >
                  {primaryBuyer ? 'เปลี่ยนลูกค้า' : '+ เลือกลูกค้า'}
                </button>
              </div>

              {primaryBuyer ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-slate-400 font-bold border border-slate-700">
                    {primaryBuyer.photo_url ? (
                      <img src={primaryBuyer.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      primaryBuyer.px_code.slice(-3)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">{primaryBuyer.full_name}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-500 font-semibold">
                        {primaryBuyer.px_code}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      สังกัด: {primaryBuyer.unit || '-'}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        เครดิต: ฿{primaryCreditRemaining.toFixed(2)}
                      </span>
                      {primaryCashBal > 0 && (
                        <span className="text-amber-500 font-medium">
                          สด: ฿{primaryCashBal.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => {
                    if (!selectedBatchId) {
                      showToast({ type: 'warning', title: 'ยังไม่ได้เลือกผลัด', message: 'กรุณาเลือกผลัดทหารก่อนเลือกลูกค้า' });
                      return;
                    }
                    setIsBuyerModalOpen(true);
                  }}
                  className={`py-4 border-2 border-dashed rounded-xl text-center transition-colors ${
                    !selectedBatchId 
                      ? 'border-amber-400/50 bg-amber-500/5 cursor-not-allowed'
                      : 'border-slate-300 dark:border-[#2a3852] cursor-pointer hover:border-blue-500'
                  }`}
                >
                  <UserCheck className={`w-6 h-6 mx-auto mb-1 ${!selectedBatchId ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold block ${!selectedBatchId ? 'text-amber-600 dark:text-amber-400' : 'text-blue-500'}`}>
                    {!selectedBatchId ? 'กรุณาเลือกผลัดทหารก่อนเลือกลูกค้า' : 'กรุณาเลือกลูกค้า / ทหารผู้ซื้อ'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {!selectedBatchId ? 'เลือกผลัดจากเมนูด้านบน' : 'ค้นหาด้วยรหัส PX, ชื่อ หรือเลขบัตร'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Party Split Bill Section */}
          <div className={`p-3.5 border-b space-y-2.5 transition-all ${
            isPartyMode 
              ? (isLight ? 'bg-indigo-50/60 border-indigo-200' : 'bg-[#141b30] border-indigo-900/50')
              : (isLight ? 'bg-slate-50/40 border-slate-200' : 'bg-[#101625] border-[#1d273a]')
          }`}>
            {/* Header & Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isPartyMode 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs' 
                    : isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>โหมดหารบิล (Party Split)</span>
                    {isPartyMode && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
                        {partyParticipants.length} คน
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isPartyMode ? 'ระบบหารค่าใช้จ่ายร่วมกันหลายคน' : 'ปิดอยู่ (ชำระคนเดียว)'}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                disabled={!selectedBatchId}
                onClick={() => {
                  togglePartyMode(!isPartyMode);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !selectedBatchId ? 'opacity-40 cursor-not-allowed bg-slate-400' : isPartyMode ? 'bg-indigo-600 cursor-pointer' : isLight ? 'bg-slate-300 cursor-pointer' : 'bg-slate-700 cursor-pointer'
                }`}
                title={!selectedBatchId ? 'กรุณาเลือกผลัดก่อน' : isPartyMode ? 'ปิดโหมดหารบิล' : 'เปิดโหมดหารบิล'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                    isPartyMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Host Explanation Popover Box (i) */}
            {isPartyMode && showHostInfo && (
              <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed relative ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowHostInfo(false)}
                  className="absolute top-1.5 right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="font-bold flex items-center gap-1 text-amber-500 mb-0.5">
                  <Crown className="w-3.5 h-3.5" /> สถานะผู้เปิดบิลหลัก (Host) คืออะไร?
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 pr-3">
                  <strong>Host</strong> คือตัวแทนทหารที่ถูกใช้บันทึกหัวบิลในระบบ และกรณีหารเท่ากันแล้วมีเศษสตางค์ไม่ลงตัว เศษส่วนต่างจะถูกปัดเข้า Host คนนี้ (สามารถกดปุ่ม <strong>&quot;ตั้งเป็น Host&quot;</strong> ที่สมาชิกคนอื่นเพื่อเปลี่ยนตัวแทนได้ตลอดเวลา)
                </p>
              </div>
            )}

            {/* When Party Mode is Active -> Show Member Management & Member List */}
            {isPartyMode && (
              <div className="space-y-2 pt-1">
                {/* Action Bar: Add Member Button & Configure Split */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBatchId) {
                        showToast({ type: 'warning', title: 'ยังไม่ได้เลือกผลัด', message: 'กรุณาเลือกผลัดทหารก่อนเพิ่มสมาชิก' });
                        return;
                      }
                      setIsAddPartyMemberOpen(true);
                    }}
                    disabled={!selectedBatchId}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มเพื่อนร่วมบิล</span>
                  </button>

                  {partyParticipants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsPartyModalOpen(true)}
                      className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        isLight ? 'bg-white hover:bg-slate-50 border-slate-300 text-indigo-600' : 'bg-[#1b243d] hover:bg-[#232f4e] border-indigo-800/60 text-indigo-300'
                      }`}
                      title="เปิดหน้าต่างตั้งค่าสัดส่วนการหารแบบละเอียด"
                    >
                      <span>ตั้งค่าสัดส่วน</span>
                    </button>
                  )}
                </div>

                {/* Member Cards List */}
                {partyParticipants.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {partyParticipants.map((p, idx) => {
                      const isHost = idx === 0;
                      const creditRemaining = p.soldier.credit_allowance_balance !== undefined
                        ? p.soldier.credit_limit - p.soldier.credit_allowance_balance
                        : (p.soldier.credit_limit || 0);

                      return (
                        <div
                          key={p.soldier.px_code}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            isHost
                              ? isLight ? 'bg-amber-50/60 border-amber-200 shadow-xs' : 'bg-[#1e1e30] border-amber-500/40'
                              : isLight ? 'bg-white border-indigo-100 shadow-xs' : 'bg-[#161d33] border-indigo-900/40'
                          }`}
                        >
                          {/* Avatar & Details */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 text-slate-300 font-bold text-[10px] border ${
                              isHost ? 'bg-amber-950/40 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700'
                            }`}>
                              {p.soldier.photo_url ? (
                                <img src={p.soldier.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                p.soldier.px_code.slice(-3)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs truncate">{p.soldier.full_name}</span>
                                {isHost ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 flex-shrink-0">
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
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPartyHost(p.soldier.px_code)}
                                    className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-500/15 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-transparent hover:border-amber-500/30 flex items-center gap-0.5 transition-colors cursor-pointer flex-shrink-0"
                                    title="สลับคนนี้ให้เป็น Host (ผู้เปิดบิลหลัก)"
                                  >
                                    <Crown className="w-2.5 h-2.5" /> ตั้งเป็น Host
                                  </button>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{p.soldier.px_code}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  เครดิต: ฿{creditRemaining.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Amount share & Remove action */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {effectiveNetPayable > 0 && (
                              <div className="text-right">
                                <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  ฿{p.amountAssigned ? p.amountAssigned.toFixed(2) : (effectiveNetPayable / (partyParticipants.length || 1)).toFixed(2)}
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removePartyParticipant(p.soldier.px_code)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="ลบคนนี้ออกจากปาร์ตี้"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      if (!selectedBatchId) return;
                      setIsAddPartyMemberOpen(true);
                    }}
                    className={`p-3 border-2 border-dashed border-indigo-400/40 rounded-xl text-center ${
                      !selectedBatchId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-500/5 transition-colors'
                    }`}
                  >
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 font-bold block">
                      + เลือกลูกค้า / เพิ่มสมาชิกคนแรก
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ค้นหาด้วยรหัส PX, ชื่อ หรือเลขบัตร
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle: Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-[#1d273a]">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
                2. ตะกร้าสินค้า ({cart.length} รายการ)
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  disabled={!selectedBatchId}
                  onClick={clearCart}
                  className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3 h-3" />
                  ล้างตะกร้า
                </button>
              )}
            </div>

            {cart.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-[#1a2336] space-y-1">
                {cart.map((item) => {
                  const promoRes = promoItemMap.get(item.barcode);
                  const hasPromoDiscount = promoRes && promoRes.discount_amount > 0;
                  const itemOriginalSubtotal = promoRes ? promoRes.original_subtotal : (item.actual_qty * item.unit_price);
                  const itemNetSubtotal = promoRes ? promoRes.net_subtotal : item.subtotal;

                  return (
                    <div key={item.barcode} className="pt-2 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs truncate">{item.product_name}</span>
                          {promoRes?.promo_label && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {promoRes.promo?.promo_type === 'BOGO' ? '🎁' : promoRes.promo?.promo_type === 'DISCOUNT_PCT' ? '🏷️' : '⚡'} {promoRes.promo_label}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                          <span>฿{item.unit_price.toFixed(2)} / {item.unit_name || 'ชิ้น'}</span>
                          {promoRes && promoRes.free_qty > 0 && (
                            <span className="text-emerald-500 font-semibold">(แถมฟรี {promoRes.free_qty} ชิ้น)</span>
                          )}
                        </div>
                      </div>

                      {/* Qty Counter */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!selectedBatchId}
                          onClick={() => updateQuantity(item.barcode, item.actual_qty - 1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                            !selectedBatchId 
                              ? 'opacity-40 cursor-not-allowed border-slate-300 bg-slate-100 dark:bg-[#182030] dark:border-[#293854]' 
                              : isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 cursor-pointer' : 'bg-[#182030] hover:bg-[#232f48] border-[#293854] cursor-pointer'
                          }`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-xs">
                          {item.actual_qty}
                        </span>
                        <button
                          type="button"
                          disabled={!selectedBatchId}
                          onClick={() => updateQuantity(item.barcode, item.actual_qty + 1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                            !selectedBatchId 
                              ? 'opacity-40 cursor-not-allowed border-slate-300 bg-slate-100 dark:bg-[#182030] dark:border-[#293854]' 
                              : isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 cursor-pointer' : 'bg-[#182030] hover:bg-[#232f48] border-[#293854] cursor-pointer'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-20 text-right">
                        {hasPromoDiscount && (
                          <div className="text-[10px] font-mono line-through text-slate-400">
                            ฿{itemOriginalSubtotal.toFixed(2)}
                          </div>
                        )}
                        <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          ฿{itemNetSubtotal.toFixed(2)}
                        </div>
                        {hasPromoDiscount && (
                          <div className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                            -฿{promoRes.discount_amount.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!selectedBatchId}
                        onClick={() => removeFromCart(item.barcode)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">ยังไม่มีสินค้าในตะกร้า</p>
                <p className="text-[10px] text-slate-400 mt-0.5">เลือกสินค้าจากการ์ดด้านซ้ายหรือยิงบาร์โค้ด</p>
              </div>
            )}
          </div>

          {/* Bottom: Payment Mode & Totals & Submit */}
          <div className={`p-4 border-t space-y-3.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121827] border-[#1e293f]'
          }`}>
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>รวมปกติ (Gross)</span>
                <span className="font-mono">฿{effectiveTotalGross.toFixed(2)}</span>
              </div>
              {effectiveDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span>ส่วนลดโปรโมชั่น</span>
                    {promoSummary.total_free_items > 0 && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 rounded font-semibold">
                        (แถมฟรี {promoSummary.total_free_items} ชิ้น)
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-bold">-฿{effectiveDiscountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 dark:border-[#222e47]">
                <span>ยอดสุทธิ (Total)</span>
                <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                  ฿{effectiveNetPayable.toFixed(2)} บาท
                </span>
              </div>
            </div>

            {/* Single Payment Method Selector if not Party */}
            {!isPartyMode && (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={!selectedBatchId}
                  onClick={() => setSinglePaymentMethod('CREDIT')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all ${
                    !selectedBatchId
                      ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                      : singlePaymentMethod === 'CREDIT'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm cursor-pointer'
                      : isLight ? 'bg-white border-slate-200 text-slate-700 cursor-pointer' : 'bg-[#182030] border-[#27354f] text-slate-300 cursor-pointer'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>ตัดเครดิต</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedBatchId}
                  onClick={() => setSinglePaymentMethod('CASH')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all ${
                    !selectedBatchId
                      ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                      : singlePaymentMethod === 'CASH'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm cursor-pointer'
                      : isLight ? 'bg-white border-slate-200 text-slate-700 cursor-pointer' : 'bg-[#182030] border-[#27354f] text-slate-300 cursor-pointer'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>เงินสด</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedBatchId}
                  onClick={() => setSinglePaymentMethod('TRANSFER')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all ${
                    !selectedBatchId
                      ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                      : singlePaymentMethod === 'TRANSFER'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm cursor-pointer'
                      : isLight ? 'bg-white border-slate-200 text-slate-700 cursor-pointer' : 'bg-[#182030] border-[#27354f] text-slate-300 cursor-pointer'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>สแกนโอน</span>
                </button>
              </div>
            )}

            {/* Cash Input Details */}
            {!isPartyMode && singlePaymentMethod === 'CASH' && (
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222e47] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span>รับเงินสดมา (฿):</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="0.00"
                    disabled={!selectedBatchId}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className={`w-28 text-right font-mono font-bold px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight ? 'bg-white border-slate-300' : 'bg-[#0f1422] border-[#2b3a55] text-white'
                    }`}
                  />
                </div>
                {Number(cashReceived) >= effectiveNetPayable && (
                  <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t">
                    <span>เงินทอน:</span>
                    <span className="font-mono">฿{(Number(cashReceived) - effectiveNetPayable).toFixed(2)} บาท</span>
                  </div>
                )}
              </div>
            )}

            {/* Transfer Confirmation */}
            {!isPartyMode && singlePaymentMethod === 'TRANSFER' && (
              <label className={`p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center gap-2 text-xs text-purple-300 ${
                !selectedBatchId ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}>
                <input
                  type="checkbox"
                  disabled={!selectedBatchId}
                  checked={transferConfirmed}
                  onChange={(e) => setTransferConfirmed(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span className="font-semibold">แคชเชียร์ตรวจสอบยอดเงินโอนเข้าบัญชีแล้ว</span>
              </label>
            )}

            {/* Party Summary when in Party Mode */}
            {isPartyMode && (
              <div className={`p-3 rounded-2xl border space-y-1.5 ${
                isLight ? 'bg-indigo-50 border-indigo-200 text-slate-800' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-indigo-500">
                    <Users className="w-4 h-4" />
                    บิลปาร์ตี้ ({partyParticipants.length} คน)
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    เฉลี่ย ~฿{(effectiveNetPayable / (partyParticipants.length || 1)).toFixed(2)} / คน
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  กดปุ่มด้านล่างเพื่อเลือกช่องทางจ่ายเงินรายคน (เครดิต / เงินสด / สแกนโอน) และตัดยอด
                </div>
              </div>
            )}

            {/* Final Submit Order Button */}
            <button
              type="button"
              disabled={isSubmittingOrder || cart.length === 0 || !selectedBatchId || !batchGuard.allowed}
              onClick={() => {
                if (!selectedBatchId) {
                  showToast({ type: 'error', title: 'ยังไม่ได้เลือกผลัด', message: 'กรุณาเลือกผลัดทหารก่อนชำระเงิน' });
                  return;
                }
                if (isPartyMode) {
                  setIsPartyModalOpen(true);
                } else {
                  handleProcessOrder();
                }
              }}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                cart.length === 0 || isSubmittingOrder || !selectedBatchId || !batchGuard.allowed
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                  : isPartyMode
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-[0.99]'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-[0.99]'
              }`}
            >
              {isSubmittingOrder ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกบิล...</span>
                </>
              ) : !selectedBatchId ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>กรุณาเลือกผลัดทหารก่อนชำระเงิน</span>
                </>
              ) : !batchGuard.allowed ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>ผลัดสิ้นสุดระยะเวลาแล้ว</span>
                </>
              ) : isPartyMode ? (
                <>
                  <span>จัดสรรยอด & ชำระบิลปาร์ตี้ (฿{effectiveNetPayable.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันชำระเงิน (฿{effectiveNetPayable.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Soldier Selector Modal */}
      <SoldierSelectorModal
        isOpen={isBuyerModalOpen}
        onClose={() => setIsBuyerModalOpen(false)}
        soldiers={soldiers}
        selectedSoldier={primaryBuyer}
        onSelectSoldier={(s) => {
          setPrimaryBuyer(s);
          setIsBuyerModalOpen(false);
          showToast({ type: 'success', title: 'เลือกลูกค้าสำเร็จ', message: `${s.full_name} (${s.px_code})` });
        }}
      />

      {/* Add Party Member Modal */}
      <SoldierSelectorModal
        isOpen={isAddPartyMemberOpen}
        onClose={() => setIsAddPartyMemberOpen(false)}
        soldiers={soldiers}
        disabledPxCodes={partyParticipants.map(p => p.soldier.px_code)}
        disabledBadgeText="อยู่ในปาร์ตี้แล้ว"
        title="เลือกเพื่อนทหารร่วมปาร์ตี้ (Party Member)"
        onSelectSoldier={(s) => {
          addPartyParticipant(s);
          setIsAddPartyMemberOpen(false);
        }}
      />

      {/* Party Split Modal */}
      <PartySplitModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        netPayable={effectiveNetPayable}
        soldiers={soldiers}
        partyParticipants={partyParticipants}
        splitMode={partySplitMode}
        onSetSplitMode={setPartySplitMode}
        onAddParticipant={addPartyParticipant}
        onRemoveParticipant={removePartyParticipant}
        onSetHost={setPartyHost}
        onUpdateAmount={updateParticipantAmount}
        onUpdatePercentage={updateParticipantPercentage}
        onUpdatePayment={updateParticipantPayment}
        onConfirmOrder={handleProcessOrder}
        isProcessing={isSubmittingOrder}
      />

      {/* E-Slip Modal */}
      <ESlipModal
        isOpen={isESlipOpen}
        onClose={() => setIsESlipOpen(false)}
        orderId={completedOrderId}
        cartItems={cart.map(item => {
          const promoRes = promoItemMap.get(item.barcode);
          return {
            ...item,
            subtotal: promoRes ? promoRes.net_subtotal : item.subtotal,
            discount_amount: promoRes ? promoRes.discount_amount : (item.discount_amount || 0),
            charged_qty: promoRes ? promoRes.charged_qty : item.charged_qty,
            actual_qty: promoRes ? promoRes.actual_qty : item.actual_qty
          };
        })}
        netPayable={effectiveNetPayable}
        discountTotal={effectiveDiscountTotal}
        isParty={isPartyMode}
        partyParticipants={partyParticipants}
        singleBuyerName={primaryBuyer?.full_name}
        singleBuyerPxCode={primaryBuyer?.px_code}
        singlePaymentMethod={singlePaymentMethod}
        onNextOrder={() => {
          clearCart();
          setCashReceived('');
          setTransferConfirmed(false);
          setCompletedOrderId('');
          if (barcodeInputRef.current) barcodeInputRef.current.focus();
        }}
      />
    </div>
  );
};

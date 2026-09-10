import React, { useState, useEffect, useRef } from 'react';
import { 
  X, QrCode, Boxes, Package, Check, RefreshCw, AlertCircle, 
  Sparkles, Image as ImageIcon, Lock, Building2
} from 'lucide-react';
import { api } from '../../../core/api.ts';
import type { ProductCatalog, ProductUOMConversion, Seller, StockInResponse } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { usePosStore } from '../../../store/usePosStore.ts';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveProducts: ProductCatalog[];
  liveUOMs?: ProductUOMConversion[];
  liveSellers?: Seller[];
  initialBarcode?: string;
  currentUser?: { user_id?: string; username?: string; name?: string; role?: string } | null;
  onSuccess?: (res: StockInResponse) => void;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  liveProducts = [],
  liveUOMs = [],
  liveSellers = [],
  initialBarcode = '',
  currentUser,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [costPriceInput, setCostPriceInput] = useState('');
  const [isContinuousScan, setIsContinuousScan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset when modal opens or initialBarcode changes
  useEffect(() => {
    if (isOpen) {
      setBarcodeInput(initialBarcode || '');
      setQuantityInput('1');
      setCostPriceInput('');
      setTimeout(() => {
        if (initialBarcode && qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        } else if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, initialBarcode]);

  if (!isOpen) return null;

  const rawBarcode = barcodeInput.trim();

  // 1. Resolve Barcode (Dual check: Pack Conversion vs Base Product)
  const matchedUom = liveUOMs.find(u => u.barcode.trim().toLowerCase() === rawBarcode.toLowerCase());
  const resolvedBaseBarcode = matchedUom ? matchedUom.base_barcode.trim() : rawBarcode;
  
  const matchedProduct = liveProducts.find(p => 
    p.barcode.trim().toLowerCase() === resolvedBaseBarcode.toLowerCase()
  );

  const isPack = !!matchedUom;
  const conversionFactor = matchedUom ? Number(matchedUom.conversion_factor) || 1 : 1;
  const packUnitName = matchedUom ? matchedUom.unit_name : '';
  const baseUnitName = matchedProduct?.unit_name || 'ชิ้น';

  // Resolved Seller Display Name (Locked)
  const productSeller = liveSellers.find(s => s.seller_id === matchedProduct?.seller_id);
  const sellerDisplayName = productSeller 
    ? `🏪 ${productSeller.seller_name} (${productSeller.seller_id})` 
    : matchedProduct?.seller_id 
    ? `🏪 ${matchedProduct.seller_id}` 
    : '🏢 สินค้าส่วนกลาง (กองร้อย)';

  // Dynamic calculations
  const qtyEntered = Math.max(0, Number(quantityInput) || 0);
  const baseQtyAdded = Math.round(qtyEntered * conversionFactor);
  const currentStock = (matchedProduct as any)?.stock_qty !== undefined 
    ? Number((matchedProduct as any).stock_qty) || 0 
    : 0;
  const newStock = currentStock + baseQtyAdded;

  const effectiveCostPrice = costPriceInput !== '' 
    ? Number(costPriceInput) || 0 
    : (matchedProduct as any)?.cost_price !== undefined ? Number((matchedProduct as any).cost_price) || 0 : 0;
  const totalCost = baseQtyAdded * effectiveCostPrice;

  // Auto-sync cost price when matchedProduct changes
  const handleBarcodeChange = (val: string) => {
    setBarcodeInput(val);
    const uom = liveUOMs.find(u => u.barcode.trim().toLowerCase() === val.trim().toLowerCase());
    const baseBc = uom ? uom.base_barcode.trim() : val.trim();
    const prod = liveProducts.find(p => p.barcode.trim().toLowerCase() === baseBc.toLowerCase());
    if (prod) {
      if ((prod as any).cost_price !== undefined && !costPriceInput) {
        setCostPriceInput(String((prod as any).cost_price));
      }
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchedProduct && qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawBarcode) {
      showToast({ type: 'warning', title: 'กรุณากรอกบาร์โค้ด', message: 'กรุณาสแกนหรือระบุบาร์โค้ดสินค้าที่ต้องการรับเข้า' });
      return;
    }

    if (!matchedProduct) {
      showToast({ type: 'error', title: 'ไม่พบสินค้าในระบบ', message: `บาร์โค้ด "${rawBarcode}" ยังไม่มีในฐานข้อมูล Master Sheet` });
      return;
    }

    if (qtyEntered <= 0) {
      showToast({ type: 'warning', title: 'จำนวนไม่ถูกต้อง', message: 'จำนวนที่รับเข้าต้องมากกว่า 0' });
      return;
    }

    setIsSubmitting(true);
    const toastId = showToast({
      type: 'loading',
      title: 'กำลังบันทึกรับของเข้าสต็อก...',
      message: `กำลังเพิ่มสต็อก ${matchedProduct.product_name} (+${baseQtyAdded} ${baseUnitName})`
    }, 0);

    try {
      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const autoInvoiceRef = isPack 
        ? `INV-${nowStr}-${randSuffix} (${rawBarcode} x${conversionFactor})`
        : `INV-${nowStr}-${randSuffix}`;

      const resolvedUserId = currentUser?.user_id || currentUser?.username || currentUser?.name 
        || usePosStore.getState().currentUser?.user_id 
        || usePosStore.getState().currentUser?.username 
        || 'ADMIN';

      const payload = {
        barcode: rawBarcode,
        quantity: qtyEntered,
        cost_price_unit: effectiveCostPrice,
        seller_id: matchedProduct?.seller_id || '',
        invoice_ref: autoInvoiceRef,
        received_by: resolvedUserId,
        notes: ''
      };

      const res = await api.stockInProduct(payload);
      dismissToast(toastId);

      if (res.success) {
        showToast({
          type: 'success',
          title: 'รับของเข้าสต็อกสำเร็จ! 🎉',
          message: res.message || `เพิ่มสต็อก ${matchedProduct.product_name} [${sellerDisplayName}] เรียบร้อย (สต็อกใหม่: ${res.new_stock ?? newStock} ${baseUnitName})`
        });

        if (onSuccess) onSuccess(res);

        if (isContinuousScan) {
          // Reset form for next scan
          setBarcodeInput('');
          setQuantityInput('1');
          setCostPriceInput('');
          setTimeout(() => {
            if (barcodeInputRef.current) barcodeInputRef.current.focus();
          }, 100);
        } else {
          onClose();
        }
      } else {
        showToast({
          type: 'error',
          title: 'บันทึกรับเข้าไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาดในการบันทึกลง Google Sheets'
        });
      }
    } catch (err: any) {
      dismissToast(toastId);
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        message: err.message || 'ไม่สามารถติดต่อ Google Apps Script ได้'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                รับของเข้าสต็อก (Stock-In / Restock)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Master Inventory
                </span>
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                สแกนบาร์โค้ดเดี่ยวหรือบาร์โค้ดแพ็ค/ลัง ระบบจะคำนวณและเพิ่มยอดสต็อกอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            disabled={isSubmitting}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Barcode Scanner Section */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#121827] border-[#222d42]'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <QrCode className="w-4 h-4 text-emerald-500" />
                สแกนหรือระบุบาร์โค้ด (Scan / Enter Barcode) *
              </label>

              {/* Continuous Scan Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isContinuousScan}
                  onChange={(e) => setIsContinuousScan(e.target.checked)}
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className={isContinuousScan ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                  ⚡ สแกนต่อเนื่อง (Continuous)
                </span>
              </label>
            </div>

            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="ยิงบาร์โค้ดเดี่ยว หรือ บาร์โค้ดแพ็ค/ลัง..."
                className={`w-full rounded-xl pl-3.5 pr-20 py-2.5 text-sm font-mono font-bold focus:outline-none transition-colors border ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0a0e17] border-[#2b3a55] text-white focus:border-emerald-500'
                }`}
              />
              {barcodeInput && (
                <button
                  type="button"
                  onClick={() => handleBarcodeChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white px-1.5 py-0.5"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Product Preview Card */}
          {matchedProduct ? (
            <div className={`p-4 rounded-xl border space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
              isLight ? 'bg-white border-emerald-200 shadow-xs' : 'bg-[#121829] border-emerald-500/30'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#222d42]">
                <div className="flex items-center gap-3">
                  {matchedProduct.image_url ? (
                    <img 
                      src={matchedProduct.image_url} 
                      alt={matchedProduct.product_name} 
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-[#2b3a55] shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-xs ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-[#182033] border-[#2b3a55] text-slate-500'
                    }`}>
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 dark:bg-[#1a233a] dark:text-slate-300">
                        {matchedProduct.category || 'ทั่วไป'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        ผู้ฝากขาย: {productSeller?.seller_name || matchedProduct.seller_id || 'สินค้าส่วนกลาง (กองร้อย)'}
                      </span>
                      {isPack ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <Boxes className="w-3 h-3" />
                          หน่วยเสริม: {packUnitName} (1 {packUnitName} = {conversionFactor} {baseUnitName})
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          สินค้าเดี่ยว (Base Unit: 1 {baseUnitName})
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold mt-1 text-slate-900 dark:text-white">
                      {matchedProduct.product_name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      บาร์โค้ดหลัก: {matchedProduct.barcode} {isPack && `(สแกนบาร์โค้ดแพ็ค: ${rawBarcode})`}
                    </p>
                  </div>
                </div>

                {/* Current Stock Pill */}
                <div className={`px-3 py-2 rounded-xl text-right border ${
                  currentStock <= 0 
                    ? isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : currentStock < 5
                    ? isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    : isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#182033] border-[#2b3a55] text-slate-200'
                }`}>
                  <span className="text-[10px] font-bold block opacity-80">สต็อกคงเหลือปัจจุบัน</span>
                  <span className="text-base font-bold font-mono block">
                    {currentStock.toLocaleString()} <span className="text-xs font-normal">{baseUnitName}</span>
                  </span>
                  {isPack && conversionFactor > 1 && (
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                      (= {Math.floor(currentStock / conversionFactor)} {packUnitName}{currentStock % conversionFactor > 0 ? ` + ${currentStock % conversionFactor} ${baseUnitName}` : ''})
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Input, Cost Price, and Locked Seller */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                      จำนวนที่รับเข้า ({isPack ? packUnitName : baseUnitName}) *
                    </label>
                    <div className="relative">
                      <input
                        ref={qtyInputRef}
                        type="number"
                        min="1"
                        step="1"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        placeholder="1"
                        className={`w-full rounded-xl px-3.5 py-2 text-sm font-mono font-bold focus:outline-none transition-colors border ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0a0e17] border-[#2b3a55] text-white focus:border-emerald-500'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {isPack ? packUnitName : baseUnitName}
                      </span>
                    </div>
                  </div>

                  {/* Cost Price per Unit */}
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                      ราคาทุนต่อ {baseUnitName} (฿)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPriceInput}
                      onChange={(e) => setCostPriceInput(e.target.value)}
                      placeholder={String((matchedProduct as any).cost_price || '0.00')}
                      className={`w-full rounded-xl px-3.5 py-2 text-sm font-mono focus:outline-none transition-colors border ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0a0e17] border-[#2b3a55] text-white focus:border-emerald-500'
                      }`}
                    />
                    {totalCost > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                        💰 มูลค่ารวม: ฿{totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Locked Seller Field */}
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        ผู้ฝากขาย (Seller)
                      </span>
                      <span className="text-[10px] font-normal text-slate-400 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> ล็อคตามสินค้า
                      </span>
                    </label>
                    <div className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border flex items-center gap-2 shadow-2xs ${
                      isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    }`}>
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 text-xs font-bold">
                        {productSeller?.seller_name ? productSeller.seller_name.charAt(0) : (matchedProduct?.seller_id ? matchedProduct.seller_id.charAt(0) : 'S')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate">
                          {productSeller ? productSeller.seller_name : (matchedProduct?.seller_id || 'สินค้าส่วนกลาง (กองร้อย)')}
                        </div>
                        <div className="text-[10px] opacity-75 font-mono truncate">
                          รหัส: {matchedProduct?.seller_id || 'CENTRAL'} {productSeller?.contact_info ? `• ${productSeller.contact_info}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Math Calculation Box */}
                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 ${
                  isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                }`}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      คำนวณยอดรับเข้าสุทธิ:
                    </div>
                    <div className="text-xs">
                      {isPack ? (
                        <span>
                          <strong>{qtyEntered}</strong> {packUnitName} × <strong>{conversionFactor}</strong> = <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{baseQtyAdded}</strong> {baseUnitName}
                        </span>
                      ) : (
                        <span>
                          รับเข้า <strong>{baseQtyAdded}</strong> {baseUnitName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right sm:text-right font-mono text-xs">
                    <span className="opacity-80 block text-[10px]">สต็อกใหม่หลังรับเข้า:</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                      {currentStock} + {baseQtyAdded} = {newStock} {baseUnitName}
                    </span>
                    {isPack && conversionFactor > 1 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                        (= {Math.floor(newStock / conversionFactor)} {packUnitName}{newStock % conversionFactor > 0 ? ` + ${newStock % conversionFactor} ${baseUnitName}` : ''})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : rawBarcode ? (
            /* Barcode Not Found Warning */
            <div className={`p-4 rounded-xl border text-center space-y-2 ${
              isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
            }`}>
              <AlertCircle className="w-7 h-7 mx-auto text-amber-500" />
              <div className="text-xs font-bold">
                ไม่พบบาร์โค้ด "{rawBarcode}" ในระบบ
              </div>
              <p className="text-[11px] opacity-80 max-w-md mx-auto">
                กรุณาตรวจสอบว่าบาร์โค้ดถูกต้อง หรือเพิ่มสินค้าใหม่ในแคตตาล็อกก่อนรับเข้าสต็อก
              </p>
            </div>
          ) : (
            /* Empty State Prompt */
            <div className={`p-8 rounded-xl border text-center space-y-2 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-[#121827] border-[#222d42] text-slate-500'
            }`}>
              <QrCode className="w-8 h-8 mx-auto opacity-50" />
              <div className="text-xs font-semibold">
                พร้อมสแกนบาร์โค้ดเพื่อรับเข้าสต็อก
              </div>
              <p className="text-[11px] max-w-sm mx-auto">
                ยิงบาร์โค้ดสินค้าจากเครื่องสแกน หรือพิมพ์บาร์โค้ดเดี่ยว/แพ็คเพื่อแสดงข้อมูล
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#21262d]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300 border-[#2b3a55]'
              }`}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !matchedProduct || qtyEntered <= 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                !matchedProduct || qtyEntered <= 0
                  ? 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
                  : isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  กำลังบันทึกรับเข้า...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  + ยืนยันรับเข้าสต็อก ({baseQtyAdded} {baseUnitName})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Tag,
  Gift,
  Percent,
  Flame,
  Search,
  Check,
  AlertCircle,
  Sparkles,
  Store,
  Shield,
  Layers,
  ChevronDown,
  Info
} from "lucide-react";
import type { Promotion, PromoType, PromoAbsorbedBy, ProductCatalog, Seller } from "../../../types/schema.ts";
import { useTheme } from "../../../hooks/useTheme.ts";
import { useToast } from "../../../hooks/useToast.ts";
import { getCurrentDateTimeLocal } from "../../promotions/promotionEngine.ts";

interface CreatePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promoData: Partial<Promotion>) => Promise<boolean>;
  initialData?: Promotion | null;
  products: ProductCatalog[];
  sellers: Seller[];
}

export const CreatePromotionModal: React.FC<CreatePromotionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  products,
  sellers
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [promoName, setPromoName] = useState("");
  const [targetBarcode, setTargetBarcode] = useState("");
  const [promoType, setPromoType] = useState<PromoType>("BOGO");
  const [buyQty, setBuyQty] = useState<number>(1);
  const [freeQty, setFreeQty] = useState<number>(1);
  const [discountPct, setDiscountPct] = useState<number>(20);
  const [specialPrice, setSpecialPrice] = useState<number>(0);
  const [absorbedBy, setAbsorbedBy] = useState<PromoAbsorbedBy>("SELLER");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper for datetime calculations
  const calculateDefaultDates = () => {
    const today = new Date();
    const start = getCurrentDateTimeLocal(today);
    const endObj = new Date(today);
    endObj.setDate(endObj.getDate() + 14);
    endObj.setHours(23, 59, 0, 0);
    const end = getCurrentDateTimeLocal(endObj);
    return { start, end };
  };

  // Reset or populate fields when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setIsDropdownOpen(false);
      setProductSearch("");

      if (initialData) {
        setPromoName(initialData.promo_name || "");
        setTargetBarcode(initialData.target_barcode || "");
        setPromoType(initialData.promo_type || "BOGO");
        setBuyQty(initialData.buy_qty ?? 1);
        setFreeQty(initialData.free_qty ?? 1);
        setDiscountPct(initialData.discount_pct ?? 20);
        setSpecialPrice(initialData.special_price ?? 0);
        setAbsorbedBy(initialData.absorbed_by || "SELLER");
        setStartDate(initialData.start_date || getCurrentDateTimeLocal());
        setEndDate(initialData.end_date || getCurrentDateTimeLocal());
        setIsActive(initialData.is_active !== false);
      } else {
        const { start, end } = calculateDefaultDates();
        setPromoName("");
        setTargetBarcode("");
        setPromoType("BOGO");
        setBuyQty(1);
        setFreeQty(1);
        setDiscountPct(20);
        setSpecialPrice(0);
        setAbsorbedBy("SELLER");
        setStartDate(start);
        setEndDate(end);
        setIsActive(true);
      }
    }
  }, [isOpen, initialData]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find target product and its seller
  const selectedProduct = useMemo(() => {
    return products.find(p => p.barcode === targetBarcode);
  }, [products, targetBarcode]);

  const selectedSeller = useMemo(() => {
    if (!selectedProduct?.seller_id) return null;
    return sellers.find(s => s.seller_id === selectedProduct.seller_id);
  }, [sellers, selectedProduct]);

  // Filter products for the searchable picker
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const q = productSearch.toLowerCase().trim();
    return products
      .filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [products, productSearch]);

  // Auto-generate promo name when product or type changes if user hasn't edited manually
  const handleSelectProduct = (prod: ProductCatalog) => {
    setTargetBarcode(prod.barcode);
    setIsDropdownOpen(false);
    setProductSearch("");

    // If promoName is empty or matches previous auto-gen pattern, update it
    if (!promoName || promoName.startsWith("ซื้อ ") || promoName.startsWith("ลด ") || promoName.startsWith("ราคาพิเศษ ")) {
      if (promoType === "BOGO") {
        setPromoName(`ซื้อ ${buyQty} แถม ${freeQty} ${prod.product_name}`);
      } else if (promoType === "DISCOUNT_PCT") {
        setPromoName(`ลด ${discountPct}% ${prod.product_name}`);
      } else {
        setPromoName(`ราคาพิเศษ ${prod.product_name}`);
      }
    }

    if (promoType === "CLEARANCE" && specialPrice === 0) {
      setSpecialPrice(Math.max(0, Math.floor(prod.selling_price * 0.8)));
    }
  };

  // Quick Date Range presets
  const applyDatePreset = (days: number) => {
    const today = new Date();
    const start = getCurrentDateTimeLocal(today);
    const endObj = new Date(today);
    endObj.setDate(endObj.getDate() + days);
    endObj.setHours(23, 59, 0, 0);
    const end = getCurrentDateTimeLocal(endObj);
    setStartDate(start);
    setEndDate(end);
  };

  const applyEndOfMonthPreset = () => {
    const today = new Date();
    const start = getCurrentDateTimeLocal(today);
    const endObj = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 0, 0);
    const end = getCurrentDateTimeLocal(endObj);
    setStartDate(start);
    setEndDate(end);
  };

  // Form Validation & Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!targetBarcode) {
      setFormError("กรุณาเลือกสินค้าที่ต้องการจัดโปรโมชั่น");
      return;
    }

    if (!promoName.trim()) {
      setFormError("กรุณากรอกชื่อโปรโมชั่น");
      return;
    }

    if (!startDate || !endDate) {
      setFormError("กรุณาระบุวันที่เริ่มต้นและสิ้นสุดโปรโมชั่น");
      return;
    }

    if (startDate > endDate) {
      setFormError("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    if (promoType === "BOGO") {
      if (buyQty < 1 || freeQty < 1) {
        setFormError("จำนวนซื้อและจำนวนแถมต้องมีค่าอย่างน้อย 1 ชิ้น");
        return;
      }
    } else if (promoType === "DISCOUNT_PCT") {
      if (discountPct <= 0 || discountPct > 100) {
        setFormError("เปอร์เซ็นต์ส่วนลดต้องอยู่ระหว่าง 1% ถึง 100%");
        return;
      }
    } else if (promoType === "CLEARANCE" || promoType === "FIXED_PRICE") {
      if (specialPrice < 0) {
        setFormError("ราคาพิเศษต้องไม่ติดลบ");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Promotion> = {
        ...(initialData?.promo_id ? { promo_id: initialData.promo_id } : {}),
        promo_name: promoName.trim(),
        promo_type: promoType,
        target_barcode: targetBarcode,
        buy_qty: promoType === "BOGO" ? Number(buyQty) : 1,
        free_qty: promoType === "BOGO" ? Number(freeQty) : 0,
        discount_pct: promoType === "DISCOUNT_PCT" ? Number(discountPct) : undefined,
        special_price: (promoType === "CLEARANCE" || promoType === "FIXED_PRICE") ? Number(specialPrice) : undefined,
        absorbed_by: absorbedBy,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive
      };

      const success = await onSave(payload);
      if (success) {
        showToast({
          type: "success",
          title: initialData ? "แก้ไขโปรโมชั่นสำเร็จ" : "สร้างโปรโมชั่นสำเร็จ",
          message: `บันทึกโปรโมชั่น "${promoName}" เรียบร้อยแล้ว`
        });
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      setFormError(message);
      showToast({
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 border my-auto ${
            isLight
              ? "bg-white border-slate-200 text-slate-900"
              : "bg-[#121722] border-[#252c3c] text-slate-100"
          }`}
        >
          {/* Header */}
          <div
            className={`px-6 py-5 flex items-center justify-between border-b ${
              isLight
                ? "bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border-slate-200"
                : "bg-gradient-to-r from-[#161f33] via-[#131b2c] to-[#121722] border-[#252c3c]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${
                  isLight
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20"
                    : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-black/40"
                }`}
              >
                {initialData ? <Sparkles className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {initialData ? "แก้ไขโปรโมชั่นสินค้า" : "สร้างโปรโมชั่นใหม่ (Promotions)"}
                </h3>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {initialData
                    ? `รหัสโปรโมชั่น: ${initialData.promo_id}`
                    : "ตั้งค่าโปรโมชั่น 1 แถม 1, ลด %, หรือสินค้าราคาพิเศษหน้าร้าน"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isLight
                  ? "hover:bg-slate-200/70 text-slate-500 hover:text-slate-700"
                  : "hover:bg-[#202738] text-slate-400 hover:text-white"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl flex items-start gap-3 text-sm border ${
                  isLight
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-rose-950/40 text-rose-400 border-rose-800/60"
                }`}
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium">{formError}</span>
              </motion.div>
            )}

            {/* 1. Target Product Picker */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. เลือกสินค้าที่ร่วมรายการ <span className="text-rose-500">*</span>
              </label>

              {/* Selected Product Card / Search Trigger */}
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedProduct
                    ? isLight
                      ? "bg-blue-50/50 border-blue-200 hover:border-blue-300"
                      : "bg-blue-950/20 border-blue-800/40 hover:border-blue-700/60"
                    : isLight
                      ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                      : "bg-[#161c28] border-[#273042] hover:border-[#35425b]"
                }`}
              >
                {selectedProduct ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                        isLight ? "bg-white border-slate-200" : "bg-[#1b2232] border-[#293448]"
                      }`}
                    >
                      {selectedProduct.image_url ? (
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Tag className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{selectedProduct.product_name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          ฿{selectedProduct.selling_price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>บาร์โค้ด: {selectedProduct.barcode}</span>
                        {selectedSeller && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 font-medium">
                              <Store className="w-3 h-3" />
                              {selectedSeller.seller_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                    <Search className="w-4 h-4" />
                    <span>คลิกเพื่อค้นหาและเลือกสินค้า...</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                      isLight ? "bg-white border border-slate-200 text-slate-600" : "bg-[#1f2737] border border-[#2d384e] text-slate-300"
                    }`}
                  >
                    {selectedProduct ? "เปลี่ยนสินค้า" : "เลือกสินค้า"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 text-slate-400 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`relative z-20 mt-1 rounded-2xl border shadow-xl overflow-hidden ${
                      isLight ? "bg-white border-slate-200" : "bg-[#161c28] border-[#2b3548]"
                    }`}
                  >
                    {/* Search Input inside Dropdown */}
                    <div className="p-3 border-b border-slate-200 dark:border-[#273042] flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="พิมพ์ชื่อสินค้า, บาร์โค้ด, หรือหมวดหมู่..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch("")}
                          className="text-xs text-slate-400 hover:text-slate-200 p-1"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>

                    {/* Product List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-[#202738]">
                      {filteredProducts.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">
                          ไม่พบสินค้าที่ตรงกับการค้นหา
                        </div>
                      ) : (
                        filteredProducts.map((prod) => {
                          const isCurrent = prod.barcode === targetBarcode;
                          const pSeller = sellers.find(s => s.seller_id === prod.seller_id);
                          return (
                            <button
                              key={prod.barcode}
                              type="button"
                              onClick={() => handleSelectProduct(prod)}
                              className={`w-full p-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isCurrent
                                  ? isLight
                                    ? "bg-blue-50 text-blue-900"
                                    : "bg-blue-900/30 text-blue-200"
                                  : isLight
                                    ? "hover:bg-slate-50"
                                    : "hover:bg-[#1d2535]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                                    isLight ? "bg-white border-slate-200" : "bg-[#1e2636] border-[#293448]"
                                  }`}
                                >
                                  {prod.image_url ? (
                                    <img
                                      src={prod.image_url}
                                      alt={prod.product_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Tag className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs sm:text-sm truncate">
                                    {prod.product_name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    บาร์โค้ด: {prod.barcode} {pSeller ? `• ${pSeller.seller_name}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0 text-right">
                                <div>
                                  <span className="font-bold text-xs sm:text-sm text-blue-500">
                                    ฿{prod.selling_price.toFixed(2)}
                                  </span>
                                  {typeof prod.stock_qty === "number" && (
                                    <p className="text-[10px] text-slate-400">สต็อก: {prod.stock_qty}</p>
                                  )}
                                </div>
                                {isCurrent && <Check className="w-4 h-4 text-blue-500" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Promo Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. ชื่อโปรโมชั่น <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ซื้อ 1 แถม 1 โค้กกระป๋อง หรือ ลด 20% นมถั่วเหลือง"
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  isLight
                    ? "bg-slate-50 border-slate-200 focus:bg-white text-slate-900"
                    : "bg-[#161c28] border-[#273042] focus:bg-[#1a2130] text-white"
                }`}
              />
            </div>

            {/* 3. Promo Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. รูปแบบโปรโมชั่น <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* BOGO Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setPromoType("BOGO");
                    if (selectedProduct) {
                      setPromoName(`ซื้อ ${buyQty} แถม ${freeQty} ${selectedProduct.product_name}`);
                    }
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                    promoType === "BOGO"
                      ? "bg-gradient-to-b from-indigo-500/15 to-purple-500/10 border-indigo-500 text-indigo-500 shadow-md shadow-indigo-500/10 font-bold ring-2 ring-indigo-500/20"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#161c28] border-[#273042] text-slate-400 hover:bg-[#1d2536]"
                  }`}
                >
                  <Gift className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs font-bold">1 แถม 1 (BOGO)</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">ซื้อ X แถม Y ฟรี</span>
                </button>

                {/* DISCOUNT_PCT Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setPromoType("DISCOUNT_PCT");
                    if (selectedProduct) {
                      setPromoName(`ลด ${discountPct}% ${selectedProduct.product_name}`);
                    }
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                    promoType === "DISCOUNT_PCT"
                      ? "bg-gradient-to-b from-emerald-500/15 to-teal-500/10 border-emerald-500 text-emerald-500 shadow-md shadow-emerald-500/10 font-bold ring-2 ring-emerald-500/20"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#161c28] border-[#273042] text-slate-400 hover:bg-[#1d2536]"
                  }`}
                >
                  <Percent className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-bold">ลดเป็น %</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">ลดเปอร์เซ็นต์จากราคา</span>
                </button>

                {/* CLEARANCE / FIXED_PRICE Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setPromoType("CLEARANCE");
                    if (selectedProduct) {
                      setPromoName(`ราคาพิเศษ ${selectedProduct.product_name}`);
                      if (specialPrice === 0) {
                        setSpecialPrice(Math.max(0, Math.floor(selectedProduct.selling_price * 0.8)));
                      }
                    }
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                    promoType === "CLEARANCE" || promoType === "FIXED_PRICE"
                      ? "bg-gradient-to-b from-amber-500/15 to-orange-500/10 border-amber-500 text-amber-500 shadow-md shadow-amber-500/10 font-bold ring-2 ring-amber-500/20"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#161c28] border-[#273042] text-slate-400 hover:bg-[#1d2536]"
                  }`}
                >
                  <Flame className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-bold">ล้างสต็อก / พิเศษ</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">กำหนดราคาพิเศษคงที่</span>
                </button>
              </div>
            </div>

            {/* 4. Dynamic Fields based on Promo Type */}
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? "bg-slate-50/70 border-slate-200" : "bg-[#151b27] border-[#242c3d]"
              }`}
            >
              {promoType === "BOGO" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-500">
                    <Gift className="w-4 h-4" />
                    <span>ตั้งค่าจำนวนซื้อและแถม (Buy X Get Y Free)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        ซื้อจำนวน (ชิ้น)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={buyQty}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setBuyQty(val);
                          if (selectedProduct) {
                            setPromoName(`ซื้อ ${val} แถม ${freeQty} ${selectedProduct.product_name}`);
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-center ${
                          isLight ? "bg-white border-slate-300" : "bg-[#1a2130] border-[#2b364a]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        แถมฟรีจำนวน (ชิ้น)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={freeQty}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setFreeQty(val);
                          if (selectedProduct) {
                            setPromoName(`ซื้อ ${buyQty} แถม ${val} ${selectedProduct.product_name}`);
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-center text-indigo-500 ${
                          isLight ? "bg-white border-slate-300" : "bg-[#1a2130] border-[#2b364a]"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      ตัวอย่าง: ลูกค้าหยิบ {buyQty + freeQty} ชิ้น จ่ายเงินเพียง {buyQty} ชิ้น (ตัดสต็อกจริง{" "}
                      {buyQty + freeQty} ชิ้น)
                    </span>
                  </div>
                </div>
              )}

              {promoType === "DISCOUNT_PCT" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                    <Percent className="w-4 h-4" />
                    <span>ตั้งค่าส่วนลดเปอร์เซ็นต์</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      เปอร์เซ็นต์ส่วนลด (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        required
                        value={discountPct}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 0));
                          setDiscountPct(val);
                          if (selectedProduct) {
                            setPromoName(`ลด ${val}% ${selectedProduct.product_name}`);
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-base font-black text-emerald-500 ${
                          isLight ? "bg-white border-slate-300" : "bg-[#1a2130] border-[#2b364a]"
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl flex items-center justify-between">
                      <span>ราคาเดิม: ฿{selectedProduct.selling_price.toFixed(2)}</span>
                      <span className="font-bold">
                        ลดเหลือ: ฿{(selectedProduct.selling_price * (1 - discountPct / 100)).toFixed(2)} (-฿
                        {((selectedProduct.selling_price * discountPct) / 100).toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {(promoType === "CLEARANCE" || promoType === "FIXED_PRICE") && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                    <Flame className="w-4 h-4" />
                    <span>ตั้งราคาพิเศษล้างสต็อก (ราคาคงที่ต่อชิ้น)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      ราคาขายพิเศษ (บาท / ชิ้น)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        required
                        value={specialPrice}
                        onChange={(e) => setSpecialPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-base font-black text-amber-500 ${
                          isLight ? "bg-white border-slate-300" : "bg-[#1a2130] border-[#2b364a]"
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl flex items-center justify-between">
                      <span>ราคาปกติ: ฿{selectedProduct.selling_price.toFixed(2)}</span>
                      <span className="font-bold">
                        ส่วนลด: ฿{Math.max(0, selectedProduct.selling_price - specialPrice).toFixed(2)} ต่อชิ้น
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Date & Time Range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  4. ระยะเวลาโปรโมชั่น (วันและเวลา) <span className="text-rose-500">*</span>
                </label>
                {/* Date Presets */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDatePreset(7)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    +7 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(14)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    +14 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(30)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    +30 วัน
                  </button>
                  <button
                    type="button"
                    onClick={applyEndOfMonthPreset}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                  >
                    สิ้นเดือนนี้
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    วันและเวลาเริ่มต้น
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium ${
                        isLight ? "bg-white border-slate-300" : "bg-[#161c28] border-[#273042]"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    วันและเวลาสิ้นสุด
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium ${
                        isLight ? "bg-white border-slate-300" : "bg-[#161c28] border-[#273042]"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Cost Burden (absorbed_by) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                5. ผู้รับผิดชอบต้นทุนส่วนลด (Cost Burden) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* SELLER */}
                <button
                  type="button"
                  onClick={() => setAbsorbedBy("SELLER")}
                  className={`p-3 rounded-2xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                    absorbedBy === "SELLER"
                      ? "bg-amber-500/10 border-amber-500 text-amber-500 ring-2 ring-amber-500/20 font-bold"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#161c28] border-[#273042] text-slate-400 hover:bg-[#1d2536]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Store className="w-3.5 h-3.5" />
                    <span>ร้านค้า / จ่า</span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-2">
                    หักส่วนลดจากยอดจ่ายเงินผู้ฝากขาย
                  </span>
                </button>

                {/* UNIT */}
                <button
                  type="button"
                  onClick={() => setAbsorbedBy("UNIT")}
                  className={`p-3 rounded-2xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                    absorbedBy === "UNIT"
                      ? "bg-blue-500/10 border-blue-500 text-blue-500 ring-2 ring-blue-500/20 font-bold"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#161c28] border-[#273042] text-slate-400 hover:bg-[#1d2536]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>กองร้อย / สวัสดิการ</span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-2">
                    กองร้อยชดเชยส่วนลด จ่าได้ยอดเต็ม
                  </span>
                </button>

                {/* SHARED */}
                <button
                  type="button"
                  onClick={() => setAbsorbedBy("SHARED")}
                  className={`p-3 rounded-2xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                    absorbedBy === "SHARED"
                      ? "bg-purple-500/10 border-purple-500 text-purple-500 ring-2 ring-purple-500/20 font-bold"
                      : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#161c28] border-[#273042] text-slate-400 hover:bg-[#1d2536]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5" />
                    <span>คนละครึ่ง (50/50)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-2">
                    แบ่งภาระส่วนลดคนละครึ่ง
                  </span>
                </button>
              </div>
            </div>

            {/* 7. Active Switch */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#161c28] border-[#273042]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-400"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">สถานะเปิดใช้งานโปรโมชั่น</p>
                  <p className="text-[10px] text-slate-400">
                    {isActive ? "พร้อมคำนวณส่วนลดทันทีที่แคชเชียร์" : "ปิดการใช้งานชั่วคราว"}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                  isLight
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-[#1a2130] text-slate-300 hover:bg-[#242e44]"
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{initialData ? "บันทึกการแก้ไข" : "สร้างโปรโมชั่น"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

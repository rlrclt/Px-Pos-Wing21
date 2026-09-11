import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Gift,
  Percent,
  Flame,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Store,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  AlertCircle,
  ShoppingBag
} from "lucide-react";
import type { Promotion, ProductCatalog, Seller } from "../../../types/schema.ts";
import { useTheme } from "../../../hooks/useTheme.ts";
import { useToast } from "../../../hooks/useToast.ts";
import { AdminSectionHeader } from "./ui/AdminSectionHeader.tsx";
import { AdminStatCard } from "./ui/AdminStatCard.tsx";
import { CreatePromotionModal } from "./CreatePromotionModal.tsx";
import { 
  getTodayDateString, 
  isPromotionActive, 
  isPromoUpcoming, 
  isPromoExpired, 
  parsePromoDateMs, 
  formatPromoDateTime 
} from "../../promotions/promotionEngine.ts";

interface PromotionsTabProps {
  promotions: Promotion[];
  products: ProductCatalog[];
  sellers: Seller[];
  onCreatePromotion: (promo: Partial<Promotion>) => Promise<boolean>;
  onUpdatePromotion: (promoId: string, updates: Partial<Promotion>) => Promise<boolean>;
  onDeletePromotion: (promoId: string) => Promise<boolean>;
  onTogglePromotionActive: (promoId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const PromotionsTab: React.FC<PromotionsTabProps> = ({
  promotions = [],
  products = [],
  sellers = [],
  onCreatePromotion,
  onUpdatePromotion,
  onDeletePromotion,
  onTogglePromotionActive,
  onRefresh
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const today = useMemo(() => getTodayDateString(), []);

  // Compute KPI summary stats
  const stats = useMemo(() => {
    let activeCount = 0;
    let upcomingCount = 0;
    let expiredOrInactiveCount = 0;
    let bogoCount = 0;
    let discountCount = 0;

    promotions.forEach(p => {
      if (isPromotionActive(p, today)) {
        activeCount += 1;
      } else if (isPromoUpcoming(p)) {
        upcomingCount += 1;
      } else {
        expiredOrInactiveCount += 1;
      }

      if (p.promo_type === "BOGO") {
        bogoCount += 1;
      } else {
        discountCount += 1;
      }
    });

    return {
      activeCount,
      upcomingCount,
      bogoCount,
      discountCount,
      expiredOrInactiveCount,
      totalCount: promotions.length
    };
  }, [promotions, today]);

  // Map products by barcode for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<string, ProductCatalog>();
    products.forEach(p => map.set(p.barcode, p));
    return map;
  }, [products]);

  // Map sellers by seller_id for quick lookup
  const sellerMap = useMemo(() => {
    const map = new Map<string, Seller>();
    sellers.forEach(s => map.set(s.seller_id, s));
    return map;
  }, [sellers]);

  // Filtered promotions list
  const filteredPromotions = useMemo(() => {
    return promotions.filter(promo => {
      const product = productMap.get(promo.target_barcode);
      const seller = product?.seller_id ? sellerMap.get(product.seller_id) : undefined;

      // Status filter
      if (statusFilter === "active") {
        if (!isPromotionActive(promo, today)) return false;
      } else if (statusFilter === "upcoming") {
        if (!isPromoUpcoming(promo)) return false;
      } else if (statusFilter === "expired") {
        if (!isPromoExpired(promo)) return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "BOGO" && promo.promo_type !== "BOGO") return false;
        if (typeFilter === "DISCOUNT_PCT" && promo.promo_type !== "DISCOUNT_PCT") return false;
        if (typeFilter === "CLEARANCE" && promo.promo_type !== "CLEARANCE" && promo.promo_type !== "FIXED_PRICE") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = promo.promo_name.toLowerCase().includes(q);
        const matchBarcode = promo.target_barcode.toLowerCase().includes(q);
        const matchProductName = product?.product_name.toLowerCase().includes(q) ?? false;
        const matchSeller = seller?.seller_name.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchBarcode && !matchProductName && !matchSeller) {
          return false;
        }
      }

      return true;
    });
  }, [promotions, statusFilter, typeFilter, searchQuery, productMap, sellerMap, today]);

  // Quick toggle active handler
  const handleToggleActive = async (promo: Promotion) => {
    setIsTogglingId(promo.promo_id);
    try {
      const success = await onTogglePromotionActive(promo.promo_id);
      if (success) {
        showToast({
          type: "success",
          title: promo.is_active ? "ปิดโปรโมชั่นแล้ว" : "เปิดโปรโมชั่นแล้ว",
          message: `${promo.promo_name} สถานะ: ${!promo.is_active ? "พร้อมใช้งาน" : "ปิดชั่วคราว"}`
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถเปลี่ยนสถานะโปรโมชั่นได้"
      });
    } finally {
      setIsTogglingId(null);
    }
  };

  // Delete promotion handler
  const handleConfirmDelete = async () => {
    if (!deletingPromotion) return;
    setIsDeleting(true);
    try {
      const success = await onDeletePromotion(deletingPromotion.promo_id);
      if (success) {
        showToast({
          type: "success",
          title: "ลบโปรโมชั่นสำเร็จ",
          message: `ลบโปรโมชั่น "${deletingPromotion.promo_name}" เรียบร้อยแล้ว`
        });
        setDeletingPromotion(null);
      }
    } catch {
      showToast({
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถลบโปรโมชั่นได้"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Date difference badge helper
  const renderDateBadge = (promo: Promotion) => {
    const isCurrentlyActive = isPromotionActive(promo, today);

    if (!promo.is_active) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          ปิดใช้งาน
        </span>
      );
    }

    const now = Date.now();
    const startMs = parsePromoDateMs(promo.start_date) ?? 0;
    const endMs = parsePromoDateMs(promo.end_date, true) ?? Infinity;

    if (startMs > now) {
      const diffHours = Math.ceil((startMs - now) / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffHours / 24);
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
          {diffHours < 24 ? `เริ่มในอีก ${diffHours} ชม.` : `เริ่มในอีก ${diffDays} วัน`}
        </span>
      );
    }

    if (endMs < now) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
          หมดอายุแล้ว
        </span>
      );
    }

    if (isCurrentlyActive) {
      const remainingHours = Math.ceil((endMs - now) / (1000 * 60 * 60));
      const remainingDays = Math.ceil(remainingHours / 24);
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {remainingHours < 24 ? `เหลือ ${remainingHours} ชม.` : `เหลือ ${remainingDays} วัน`}
        </span>
      );
    }

    return null;
  };

  // Promo type badge helper
  const renderPromoTypeBadge = (promo: Promotion) => {
    if (promo.promo_type === "BOGO") {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-500 border border-indigo-500/30 shadow-sm">
          <Gift className="w-3.5 h-3.5" />
          <span>{promo.buy_qty} แถม {promo.free_qty} ฟรี</span>
        </div>
      );
    }
    if (promo.promo_type === "DISCOUNT_PCT") {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-500 border border-emerald-500/30 shadow-sm">
          <Percent className="w-3.5 h-3.5" />
          <span>ลด {promo.discount_pct}%</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-500 border border-amber-500/30 shadow-sm">
        <Flame className="w-3.5 h-3.5" />
        <span>ราคาพิเศษ ฿{(promo.special_price || 0).toFixed(2)}</span>
      </div>
    );
  };

  // Cost burden pill helper
  const renderBurdenPill = (burden: Promotion["absorbed_by"]) => {
    if (burden === "UNIT") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
          <Shield className="w-3 h-3" />
          <span>กองร้อยออก</span>
        </span>
      );
    }
    if (burden === "SHARED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
          <Layers className="w-3 h-3" />
          <span>คนละครึ่ง</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <Store className="w-3 h-3" />
        <span>ร้านค้าออก</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Section Header */}
      <AdminSectionHeader
        title="จัดการโปรโมชั่นสินค้า (Promotions)"
        description="ตั้งค่าโปรโมชั่น 1 แถม 1, ส่วนลด %, และสินค้าราคาพิเศษ พร้อมกำหนดผู้รับผิดชอบส่วนลด"
        icon={Tag}
        badge={`${stats.activeCount} กำลังจัดโปร`}
        actions={
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="รีเฟรชข้อมูล"
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                    : "bg-[#161c28] border-[#273042] text-slate-300 hover:bg-[#1f2636]"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingPromotion(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างโปรโมชั่นใหม่</span>
            </button>
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard
          title="โปรโมชั่นที่กำลังใช้งาน"
          value={stats.activeCount}
          subtitle={`จากทั้งหมด ${stats.totalCount} รายการ`}
          icon={Sparkles}
          accentColor="#10B981"
        />
        <AdminStatCard
          title="โปรโมชั่น 1 แถม 1 (BOGO)"
          value={stats.bogoCount}
          subtitle="ซื้อ X แถม Y ชิ้น"
          icon={Gift}
          accentColor="#6366F1"
        />
        <AdminStatCard
          title="โปรโมชั่นลดราคา (% / พิเศษ)"
          value={stats.discountCount}
          subtitle="ลด % หรือ ล้างสต็อก"
          icon={Percent}
          accentColor="#F59E0B"
        />
        <AdminStatCard
          title="หมดอายุหรือปิดอยู่"
          value={stats.expiredOrInactiveCount}
          subtitle="นับเฉพาะที่หมดอายุ/ปิดแล้ว"
          icon={Clock}
          accentColor="#EF4444"
        />
      </div>

      {/* 3. Toolbar & Filters */}
      <div
        className={`p-4 rounded-3xl border transition-all ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121722] border-[#21262d]"
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโปรโมชั่น, ชื่อสินค้า, บาร์โค้ด, หรือชื่อร้านค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                isLight
                  ? "bg-slate-50 border-slate-200 focus:bg-white text-slate-900"
                  : "bg-[#161c28] border-[#273042] focus:bg-[#1a2130] text-white"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Filter Pills & View Mode */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {/* Status Pills */}
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-[#161c28] border-[#252c3c]"
              }`}
            >
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                🟢 กำลังจัดโปร
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("upcoming")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "upcoming"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                ⏳ ยังไม่เริ่ม
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("expired")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "expired"
                    ? "bg-rose-600 text-white shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                🔴 หมดอายุ/ปิด
              </button>
            </div>

            {/* Type Filter Select */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                isLight
                  ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  : "bg-[#161c28] border-[#252c3c] text-slate-300 hover:bg-[#1a2130]"
              }`}
            >
              <option value="all">ทุกประเภทโปรโมชั่น</option>
              <option value="BOGO">🎁 1 แถม 1 (BOGO)</option>
              <option value="DISCOUNT_PCT">🏷️ ลดเป็น %</option>
              <option value="CLEARANCE">🔥 ล้างสต็อก / ราคาพิเศษ</option>
            </select>

            {/* Grid / Table Mode Switch */}
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-[#161c28] border-[#252c3c]"
              }`}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="มุมมองการ์ด (Bento Grid)"
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? isLight
                      ? "bg-white text-blue-600 shadow-sm"
                      : "bg-[#252e40] text-white shadow-sm"
                    : isLight
                      ? "text-slate-500 hover:text-slate-800"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="มุมมองตาราง (Table View)"
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "table"
                    ? isLight
                      ? "bg-white text-blue-600 shadow-sm"
                      : "bg-[#252e40] text-white shadow-sm"
                    : isLight
                      ? "text-slate-500 hover:text-slate-800"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Promotion Listing */}
      {filteredPromotions.length === 0 ? (
        <div
          className={`p-12 text-center rounded-3xl border flex flex-col items-center justify-center gap-3 ${
            isLight ? "bg-white border-slate-200" : "bg-[#121722] border-[#21262d]"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center ${
              isLight ? "bg-blue-50 text-blue-500" : "bg-blue-500/10 text-blue-400"
            }`}
          >
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold">ไม่พบรายการโปรโมชั่น</h4>
            <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "ลองปรับตัวกรองหรือคำค้นหาใหม่"
                : "ยังไม่มีการสร้างโปรโมชั่นสินค้า คลิกปุ่มด้านล่างเพื่อสร้างโปรโมชั่นแรก"}
            </p>
          </div>
          {(searchQuery || statusFilter !== "all" || typeFilter !== "all") ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="mt-2 text-xs font-bold text-blue-500 hover:underline cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingPromotion(null);
                setIsCreateModalOpen(true);
              }}
              className="mt-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างโปรโมชั่นแรกเลย</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Bento Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredPromotions.map((promo) => {
            const product = productMap.get(promo.target_barcode);
            const seller = product?.seller_id ? sellerMap.get(product.seller_id) : undefined;
            const isToggling = isTogglingId === promo.promo_id;

            return (
              <motion.div
                key={promo.promo_id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between group hover:shadow-lg ${
                  isLight
                    ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    : "bg-[#121722] border-[#21262d] hover:border-[#2f384a]"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Promo Type Badge & Status Indicator */}
                  <div className="flex items-center justify-between gap-2">
                    {renderPromoTypeBadge(promo)}
                    {renderDateBadge(promo)}
                  </div>

                  {/* Target Product Section */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                        isLight ? "bg-slate-100 border-slate-200" : "bg-[#18202e] border-[#283448]"
                      }`}
                    >
                      {product?.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Tag className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-2">
                        {promo.promo_name}
                      </h4>
                      <p className={`text-xs mt-0.5 truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        สินค้า: {product?.product_name || promo.target_barcode}
                      </p>
                      {seller && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-500 font-medium mt-1">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">{seller.seller_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing / Benefit Summary Card */}
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#161c28] border-[#252c3c]"
                    }`}
                  >
                    <div>
                      <span className="text-slate-400 block text-[10px]">ราคาปกติหน้าร้าน</span>
                      <span className="font-black text-sm">
                        ฿{(product?.selling_price || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">สิทธิประโยชน์โปร</span>
                      <span className="font-black text-sm text-emerald-500">
                        {promo.promo_type === "BOGO"
                          ? `จ่าย ${promo.buy_qty} ได้ ${promo.buy_qty + promo.free_qty} ชิ้น`
                          : promo.promo_type === "DISCOUNT_PCT"
                            ? `ลด ${promo.discount_pct}% (เหลือ ฿${((product?.selling_price || 0) * (1 - (promo.discount_pct || 0) / 100)).toFixed(2)})`
                            : `พิเศษ ฿${(promo.special_price || 0).toFixed(2)}/ชิ้น`}
                      </span>
                    </div>
                  </div>

                  {/* Metadata: Date Range & Cost Burden */}
                  <div className="space-y-1.5 pt-1">
                    <div className={`flex items-start justify-between text-xs gap-2 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>ระยะเวลา:</span>
                      </span>
                      <span className="font-medium text-[11px] text-right font-mono">
                        {formatPromoDateTime(promo.start_date)} - {formatPromoDateTime(promo.end_date)}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between text-xs ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}>
                      <span>ผู้รับภาระส่วนลด:</span>
                      {renderBurdenPill(promo.absorbed_by)}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className={`pt-4 mt-4 border-t flex items-center justify-between gap-2 ${
                  isLight ? "border-slate-100" : "border-[#21262d]"
                }`}>
                  {/* Quick Active Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleActive(promo)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        promo.is_active
                          ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30"
                          : isLight
                            ? "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                            : "bg-[#1f2636] text-slate-400 hover:bg-[#283246] border border-[#2b3548]"
                      }`}
                    >
                      {isToggling ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full ${promo.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                      )}
                      <span>{promo.is_active ? "เปิดอยู่" : "ปิดอยู่"}</span>
                    </button>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPromotion(promo);
                        setIsCreateModalOpen(true);
                      }}
                      title="แก้ไขโปรโมชั่น"
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isLight
                          ? "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                          : "bg-[#18202e] text-slate-300 hover:bg-blue-950/40 hover:text-blue-400"
                      }`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPromotion(promo)}
                      title="ลบโปรโมชั่น"
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isLight
                          ? "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                          : "bg-[#18202e] text-slate-300 hover:bg-rose-950/40 hover:text-rose-400"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div
          className={`rounded-3xl border overflow-hidden transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121722] border-[#21262d]"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead
                className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                  isLight ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-[#161c28] text-slate-400 border-[#21262d]"
                }`}
              >
                <tr>
                  <th className="py-3.5 px-4">โปรโมชั่น</th>
                  <th className="py-3.5 px-4">สินค้าเป้าหมาย</th>
                  <th className="py-3.5 px-4">รูปแบบ & ส่วนลด</th>
                  <th className="py-3.5 px-4">ระยะเวลา</th>
                  <th className="py-3.5 px-4">ผู้รับภาระส่วนลด</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-[#21262d]"}`}>
                {filteredPromotions.map((promo) => {
                  const product = productMap.get(promo.target_barcode);
                  const seller = product?.seller_id ? sellerMap.get(product.seller_id) : undefined;
                  const isToggling = isTogglingId === promo.promo_id;

                  return (
                    <tr
                      key={promo.promo_id}
                      className={`transition-colors ${
                        isLight ? "hover:bg-slate-50/70" : "hover:bg-[#161c28]/60"
                      }`}
                    >
                      {/* 1. Promo Info */}
                      <td className="py-3.5 px-4 font-bold max-w-[220px]">
                        <p className="truncate text-sm">{promo.promo_name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {promo.promo_id}
                        </span>
                      </td>

                      {/* 2. Target Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                              isLight ? "bg-white border-slate-200" : "bg-[#1a2130] border-[#293448]"
                            }`}
                          >
                            {product?.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Tag className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[180px]">
                            <p className="font-semibold text-xs truncate">
                              {product?.product_name || promo.target_barcode}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              ฿{(product?.selling_price || 0).toFixed(2)}{" "}
                              {seller ? `• ${seller.seller_name}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Promo Type & Value */}
                      <td className="py-3.5 px-4">
                        {renderPromoTypeBadge(promo)}
                      </td>

                      {/* 4. Date Range */}
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-[11px] font-mono">
                          {formatPromoDateTime(promo.start_date)} - {formatPromoDateTime(promo.end_date)}
                        </p>
                        <div className="mt-1">{renderDateBadge(promo)}</div>
                      </td>

                      {/* 5. Cost Burden */}
                      <td className="py-3.5 px-4">
                        {renderBurdenPill(promo.absorbed_by)}
                      </td>

                      {/* 6. Active Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleActive(promo)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            promo.is_active
                              ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30"
                              : isLight
                                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                                : "bg-[#1f2636] text-slate-400 hover:bg-[#283246] border border-[#2b3548]"
                          }`}
                        >
                          {isToggling ? (
                            <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span
                              className={`w-2 h-2 rounded-full ${promo.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                            />
                          )}
                          <span>{promo.is_active ? "เปิด" : "ปิด"}</span>
                        </button>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPromotion(promo);
                              setIsCreateModalOpen(true);
                            }}
                            title="แก้ไขโปรโมชั่น"
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isLight
                                ? "hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                                : "hover:bg-blue-950/40 text-slate-400 hover:text-blue-400"
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPromotion(promo)}
                            title="ลบโปรโมชั่น"
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isLight
                                ? "hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                                : "hover:bg-rose-950/40 text-slate-400 hover:text-rose-400"
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Create / Edit Promotion Modal */}
      <CreatePromotionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPromotion(null);
        }}
        onSave={async (promoData) => {
          if (editingPromotion) {
            return await onUpdatePromotion(editingPromotion.promo_id, promoData);
          }
          return await onCreatePromotion(promoData);
        }}
        initialData={editingPromotion}
        products={products}
        sellers={sellers}
      />

      {/* 6. Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingPromotion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeletingPromotion(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 border ${
                isLight
                  ? "bg-white border-slate-200 text-slate-900"
                  : "bg-[#121722] border-[#252c3c] text-slate-100"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold">ยืนยันการลบโปรโมชั่น?</h3>
              <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                คุณกำลังจะลบโปรโมชั่น <span className="font-bold text-rose-500">"{deletingPromotion.promo_name}"</span> (ID: {deletingPromotion.promo_id}) การกระทำนี้ไม่สามารถเรียกคืนได้
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingPromotion(null)}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isLight
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-[#1a2130] text-slate-300 hover:bg-[#242e44]"
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>กำลังลบ...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>ยืนยันลบโปรโมชั่น</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

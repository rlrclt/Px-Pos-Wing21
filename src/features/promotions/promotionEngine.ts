/**
 * PX Wing 21 - Pure Promotion Calculation Engine
 * 
 * Handles real-time promotional pricing, BOGO (Buy X Get Y Free),
 * Percentage Discounts, Clearance Fixed Pricing, and Cost Absorption
 * (Seller vs Military Unit GP allocation).
 */

import type { Promotion, PromoAbsorbedBy } from '../../types/schema.ts';

export interface CartItemForPromotion {
  barcode: string;
  selling_price: number;
  quantity: number;
  seller_id?: string;
  product_name?: string;
  [key: string]: unknown;
}

export interface ItemPromotionResult {
  barcode: string;
  original_quantity: number;
  actual_qty: number;             // Physical stock count deducted from inventory
  charged_qty: number;            // Billable quantity equivalent
  unit_price: number;             // Base selling price per unit
  original_subtotal: number;      // unit_price * original_quantity
  discount_amount: number;        // Total promotional discount in Baht
  net_subtotal: number;           // original_subtotal - discount_amount
  promo?: Promotion;
  promo_label?: string;
  free_qty: number;               // Free units given away (for BOGO)
  absorbed_by?: PromoAbsorbedBy;
  seller_share_discount: number;  // Discount absorbed by seller (reduces seller payout)
  unit_share_discount: number;    // Discount absorbed by military unit (subsidized)
}

export interface AppliedPromotionSummary {
  promo: Promotion;
  count: number;                  // Number of cart items or sets benefiting from this promo
  total_discount: number;         // Total Baht discounted by this promotion
}

export interface CartPromotionSummary {
  items: ItemPromotionResult[];
  total_gross: number;            // Total before discount
  total_discount: number;         // Total promo discount
  net_total: number;              // Net amount to be paid by soldiers
  total_free_items: number;       // Total free items given (BOGO)
  seller_absorbed_discount: number;
  unit_absorbed_discount: number;
  applied_promotions: AppliedPromotionSummary[];
}

/**
 * Returns datetime in local 'YYYY-MM-DDTHH:mm' format for datetime-local inputs.
 */
export function getCurrentDateTimeLocal(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns today's date in local 'YYYY-MM-DD' format.
 */
export function getTodayDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Validates whether a promotion is active at a specific datetime (defaults to right now).
 * Supports both full datetime 'YYYY-MM-DDTHH:mm' and legacy date-only 'YYYY-MM-DD'.
 */
export function isPromotionActive(promo?: Promotion | null, checkDateTime?: string | Date): boolean {
  if (!promo || promo.is_active !== true) {
    return false;
  }

  const nowMs = checkDateTime instanceof Date
    ? checkDateTime.getTime()
    : checkDateTime
      ? new Date(checkDateTime).getTime()
      : Date.now();

  if (promo.start_date) {
    const startMs = new Date(promo.start_date).getTime();
    if (!isNaN(startMs) && nowMs < startMs) {
      return false;
    }
  }

  if (promo.end_date) {
    let endStr = promo.end_date;
    // If date-only format (e.g. 2026-09-30), treat as end of day 23:59:59
    if (endStr.length === 10) {
      endStr += 'T23:59:59';
    }
    const endMs = new Date(endStr).getTime();
    if (!isNaN(endMs) && nowMs > endMs) {
      return false;
    }
  }

  return true;
}

/**
 * Formats date/datetime string into beautiful Thai readable format (with time if provided).
 */
export function formatPromoDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const year = (d.getFullYear() + 543) % 100;
    const pad = (n: number) => String(n).padStart(2, '0');
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());

    if (dateStr.includes('T') || dateStr.includes(':')) {
      return `${day} ${month} ${year} ${hours}:${mins} น.`;
    }
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates promotion discount and quantity metrics for a single cart item.
 */
export function calculateItemPromotion(
  item: CartItemForPromotion,
  promo?: Promotion,
  checkDate?: string
): ItemPromotionResult {
  const original_quantity = item.quantity > 0 ? item.quantity : 0;
  const unit_price = item.selling_price > 0 ? item.selling_price : 0;
  const original_subtotal = Number((original_quantity * unit_price).toFixed(2));

  // Base fallback when no active promotion applies
  if (!promo || !isPromotionActive(promo, checkDate) || original_quantity === 0) {
    return {
      barcode: item.barcode,
      original_quantity,
      actual_qty: original_quantity,
      charged_qty: original_quantity,
      unit_price,
      original_subtotal,
      discount_amount: 0,
      net_subtotal: original_subtotal,
      free_qty: 0,
      seller_share_discount: 0,
      unit_share_discount: 0
    };
  }

  let discount_amount = 0;
  let free_qty = 0;
  let charged_qty = original_quantity;
  let promo_label: string | undefined = undefined;

  switch (promo.promo_type) {
    case 'BOGO': {
      const buyQty = promo.buy_qty > 0 ? promo.buy_qty : 1;
      const promoFreeQty = promo.free_qty > 0 ? promo.free_qty : 1;
      const packSize = buyQty + promoFreeQty;

      const freeSets = Math.floor(original_quantity / packSize);
      free_qty = freeSets * promoFreeQty;
      discount_amount = Number((free_qty * unit_price).toFixed(2));
      charged_qty = Math.max(0, original_quantity - free_qty);

      if (free_qty > 0) {
        if (buyQty === 1 && promoFreeQty === 1) {
          promo_label = `1 แถม 1 (ฟรี ${free_qty} ชิ้น)`;
        } else {
          promo_label = `ซื้อ ${buyQty} แถม ${promoFreeQty} (ฟรี ${free_qty} ชิ้น)`;
        }
      } else {
        promo_label = `ซื้อ ${buyQty} แถม ${promoFreeQty} (ครบ ${packSize} ชิ้นรับฟรี ${promoFreeQty})`;
      }
      break;
    }

    case 'DISCOUNT_PCT': {
      const discountPct = Math.min(100, Math.max(0, promo.discount_pct || 0));
      const discountPerUnit = (unit_price * discountPct) / 100;
      discount_amount = Number((discountPerUnit * original_quantity).toFixed(2));
      charged_qty = original_quantity;
      free_qty = 0;

      if (discount_amount > 0) {
        promo_label = `ลด ${discountPct}% (-฿${discount_amount.toFixed(2)})`;
      }
      break;
    }

    case 'CLEARANCE':
    case 'FIXED_PRICE': {
      const specialPrice = promo.special_price !== undefined ? promo.special_price : unit_price;
      const discountPerUnit = Math.max(0, unit_price - specialPrice);
      discount_amount = Number((discountPerUnit * original_quantity).toFixed(2));
      charged_qty = original_quantity;
      free_qty = 0;

      if (discount_amount > 0) {
        promo_label = `ราคาพิเศษ ฿${specialPrice.toFixed(2)}`;
      }
      break;
    }

    default:
      discount_amount = 0;
      charged_qty = original_quantity;
      free_qty = 0;
      break;
  }

  // Ensure discount doesn't exceed original subtotal
  discount_amount = Math.min(original_subtotal, Math.max(0, discount_amount));
  const net_subtotal = Number((original_subtotal - discount_amount).toFixed(2));

  // Compute Cost Absorption Split
  let seller_share_discount = 0;
  let unit_share_discount = 0;

  if (discount_amount > 0) {
    if (promo.absorbed_by === 'SELLER') {
      seller_share_discount = discount_amount;
      unit_share_discount = 0;
    } else if (promo.absorbed_by === 'UNIT') {
      seller_share_discount = 0;
      unit_share_discount = discount_amount;
    } else if (promo.absorbed_by === 'SHARED') {
      seller_share_discount = Number((discount_amount / 2).toFixed(2));
      unit_share_discount = Number((discount_amount - seller_share_discount).toFixed(2));
    } else {
      // Default: Seller absorbs promo
      seller_share_discount = discount_amount;
      unit_share_discount = 0;
    }
  }

  return {
    barcode: item.barcode,
    original_quantity,
    actual_qty: original_quantity,
    charged_qty,
    unit_price,
    original_subtotal,
    discount_amount,
    net_subtotal,
    promo,
    promo_label,
    free_qty,
    absorbed_by: promo.absorbed_by,
    seller_share_discount,
    unit_share_discount
  };
}

/**
 * Evaluates the entire cart against a list of active promotions.
 */
export function evaluateCartPromotions(
  cartItems: CartItemForPromotion[],
  promotions: Promotion[],
  checkDate?: string
): CartPromotionSummary {
  const targetDate = checkDate || getTodayDateString();
  const activePromos = (promotions || []).filter(p => isPromotionActive(p, targetDate));

  const items: ItemPromotionResult[] = cartItems.map(item => {
    // Find matching active promo for this product barcode
    const matchedPromo = activePromos.find(p => p.target_barcode === item.barcode);
    return calculateItemPromotion(item, matchedPromo, targetDate);
  });

  const total_gross = Number(items.reduce((sum, it) => sum + it.original_subtotal, 0).toFixed(2));
  const total_discount = Number(items.reduce((sum, it) => sum + it.discount_amount, 0).toFixed(2));
  const net_total = Number(Math.max(0, total_gross - total_discount).toFixed(2));
  const total_free_items = items.reduce((sum, it) => sum + it.free_qty, 0);

  const seller_absorbed_discount = Number(
    items.reduce((sum, it) => sum + it.seller_share_discount, 0).toFixed(2)
  );
  const unit_absorbed_discount = Number(
    items.reduce((sum, it) => sum + it.unit_share_discount, 0).toFixed(2)
  );

  // Group applied promotions
  const promoMap = new Map<string, AppliedPromotionSummary>();
  items.forEach(it => {
    if (it.promo && it.discount_amount > 0) {
      const existing = promoMap.get(it.promo.promo_id);
      if (existing) {
        existing.count += it.free_qty > 0 ? it.free_qty : it.original_quantity;
        existing.total_discount = Number((existing.total_discount + it.discount_amount).toFixed(2));
      } else {
        promoMap.set(it.promo.promo_id, {
          promo: it.promo,
          count: it.free_qty > 0 ? it.free_qty : it.original_quantity,
          total_discount: it.discount_amount
        });
      }
    }
  });

  return {
    items,
    total_gross,
    total_discount,
    net_total,
    total_free_items,
    seller_absorbed_discount,
    unit_absorbed_discount,
    applied_promotions: Array.from(promoMap.values())
  };
}

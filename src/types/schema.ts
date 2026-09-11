/**
 * PX New Recruits (Wing 21) - Database Schema & Type Definitions (v3.6 Write-Off & Partial Refund Edition)
 */

export type SoldierStatus = 'ACTIVE' | 'SUSPENDED' | 'DISCHARGED';
export type PaymentMethod = 'CREDIT' | 'CASH' | 'TRANSFER' | 'MIXED';
export type PromoType = 'BOGO' | 'DISCOUNT_PCT' | 'CLEARANCE' | 'FIXED_PRICE';
export type SplitType = 'EQUAL' | 'FIXED' | 'PERCENT';
export type OrderStatus = 'COMPLETED' | 'VOIDED';
export type ShiftStatus = 'OPEN' | 'CLOSED';
export type CreditTxnType = 'TOPUP' | 'DEDUCT' | 'REFUND';
export type PromoAbsorbedBy = 'UNIT' | 'SELLER' | 'SHARED';
export type PayrollStatus = 'PENDING' | 'EXPORTED' | 'CLEARED';
export type UserRole = 'ADMIN' | 'STAFF' | 'SELLER';
export type WriteOffReason = 'EXPIRED' | 'DAMAGED' | 'INTERNAL_USE' | 'LOST';
export type CostAbsorbedBy = 'SELLER' | 'UNIT';

/**
 * 0. Users - ตารางผู้ใช้งานระบบและกำหนดสิทธิ์ (Global Table)
 */
export interface User {
  user_id: string;                  // PK: USR-01, USR-02
  username: string;                 // ชื่อผู้ใช้ เช่น admin, cashier01
  password_hash?: string;           // รหัสผ่านหลักสำหรับเข้าระบบ (Password)
  pin_hash: string;                 // รหัส PIN ปลดล็อคด่วน 4-6 หลัก
  full_name: string;                // ยศ-ชื่อ-สกุล
  role: UserRole;                   // ADMIN | STAFF | SELLER
  seller_id?: string;               // FK Ref: เชื่อมกับ Sellers.seller_id (ถ้า role == 'SELLER')
  avatar_url?: string;              // URL รูปโปรไฟล์ผู้ใช้งาน
  email?: string;                   // อีเมล (Google Sign-In)
  google_id?: string;               // Google User ID (OAuth sub)
  line_user_id?: string;            // LINE User ID (Uxxxxxxxx...)
  line_notify_token?: string;       // LINE Notify Token / Messaging token
  is_active: boolean;               // สถานะเปิดใช้งาน
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  user_id: string;
  username: string;
  password_hash?: string;
  pin_hash?: string;
  full_name: string;
  role: UserRole;
  seller_id?: string;
  avatar_url?: string;
  email?: string;
  google_id?: string;
  line_user_id?: string;
  line_notify_token?: string;
  is_active: boolean;
}


/**
 * 1. Soldiers_{Batch} - ทะเบียนทหารกองประจำการ (แยก 2 กระเป๋า)
 */
export interface Soldier {
  px_code: string;                  // PK: รหัสบาร์โค้ดประจำตัวทหาร เช่น W21-691-001
  national_id: string;              // เลขประจำตัวประชาชน 13 หลัก (สำหรับส่งการเงินตัดเงินเดือน)
  full_name: string;                // ยศ-ชื่อ-สกุล
  unit: string;                     // ร้อย.1 / ร้อย.2 / บก.ร้อย
  credit_limit: number;             // วงเงินสวัสดิการที่ได้รับ (Default: 2000.00)
  deductions: number;               // ค่าใช้จ่ายบังคับตัดคงที่ เช่น ค่ายา/อุปกรณ์
  credit_allowance_balance: number; // ยอดคงเหลือวงเงินสวัสดิการ (หักเงินเดือน)
  cash_wallet_balance: number;      // ยอดเงินสดเติมล่วงหน้า (Prepaid)
  photo_url?: string;               // URL รูปถ่ายหน้าตรงประจำตัวทหาร (สำหรับเช็คตัวตนหน้าร้าน)
  status: SoldierStatus;            // ACTIVE | SUSPENDED | DISCHARGED
  // Read-only aggregates computed by backend from Credit_Logs (MONTHLY_DEDUCTION rows)
  allowance_deductions_total?: number; // ยอดหักจากวงเงินสวัสดิการสะสม (ALLOWANCE wallet)
  cash_deductions_total?: number;      // ยอดหักจากกระเป๋าเงินสดสะสม (CASH wallet)
}

/**
 * 2. Product_Catalog - แคตตาล็อกสินค้าหน้าร้าน (Ultra-Slim 9 ฟิลด์: โหลด 0.05s & ซ่อนต้นทุน)
 */
export interface ProductCatalog {
  barcode: string;                  // PK: บาร์โค้ดสินค้า หรือรหัส PLU (เช่น PLU-01, SRV-01)
  product_name: string;             // ชื่อสินค้า
  image_url?: string;               // URL รูปปกสินค้า
  unit_name: string;                // หน่วยนับ เช่น ขวด, ซอง, แพ็ค
  selling_price: number;            // ราคาขายปลีกหน้าร้าน (บาท)
  category: string;                 // เครื่องดื่ม / ขนม / ของใช้ / SERVICE
  parent_barcode?: string;          // FK Ref: บาร์โค้ดหน่วยเดี่ยวใน Inventory (กรณีสินค้านี้เป็นแพ็ค/ลัง)
  conversion_factor: number;        // อัตราแตกหน่วย (Default: 1, ถ้าเป็นแพ็ค 6 ให้ใส่ 6)
  is_active: boolean;               // สถานะเปิดขายหน้าร้าน (TRUE = ขายได้, FALSE = ระงับการขาย/ซ่อน)
  stock_qty?: number;               // จำนวนสต็อกคงเหลือจาก Inventory_Stocks
  cost_price?: number;              // ราคาทุนจาก Inventory_Stocks
  seller_id?: string;               // เจ้าของสินค้า/ผู้ฝากขาย
  low_stock_threshold?: number;     // จุดเตือนสินค้าใกล้หมด
}

/**
 * 2.1 Product_UOM_Conversions - ตารางความสัมพันธ์หน่วยนับและบาร์โค้ดแพ็ค/ลัง (Dedicated UOM Master)
 */
export interface ProductUOMConversion {
  conversion_id: string;            // PK: e.g. UOM-8850123006
  barcode: string;                  // Unique Barcode on Pack/Carton (e.g. 8850123006)
  base_barcode: string;             // FK Ref: Barcode of single base item in Inventory_Stocks
  unit_name: string;                // e.g. "แพ็ค 6", "ลัง 24"
  conversion_factor: number;        // Multiplier (e.g. 6, 24)
  selling_price: number;            // Retail selling price for this pack unit (e.g. 55.00)
  is_active: boolean;               // Active status
  created_at?: string;              // Timestamp
}

/**
 * 3. Inventory_Stocks - คลังสินค้าและบัญชีต้นทุนหลังร้าน (Ultra-Slim 5 ฟิลด์: เฉพาะ Base Item)
 */
export interface InventoryStock {
  barcode: string;                  // PK: บาร์โค้ดหน่วยย่อยสุดเท่านั้น (Base Barcode)
  stock_qty: number;                // จำนวนสต็อกคงเหลือในคลัง (หน่วยย่อยสุด)
  cost_price: number;               // ราคาทุนที่รับมา (บาท)
  seller_id: string;                // FK Ref: รหัสผู้ฝากขาย (Sellers.seller_id)
  low_stock_threshold: number;      // จุดแจ้งเตือนสต็อกใกล้หมด
}

/**
 * 4. Stock_In_Logs - ประวัติการนำเข้าสต็อกสินค้า
 */
export interface StockInLog {
  log_id: string;                   // PK: รหัสใบรับสินค้า เช่น IN-20260907-001
  barcode: string;                  // FK Ref: รหัสสินค้า (Base Barcode)
  quantity_added: number;           // จำนวนที่รับเข้า (หน่วยย่อย)
  cost_price_unit: number;          // ราคาทุนต่อหน่วย ณ วันที่รับเข้า
  total_cost: number;               // มูลค่าทุนรวม (quantity_added * cost_price_unit)
  seller_id: string;                // FK Ref: ผู้ส่งสินค้า
  received_by: string;              // ชื่อผู้ตรวจรับสต็อก
  received_at: string;              // วันเวลาที่รับเข้า (ISO 8601)
  invoice_ref?: string;             // เลขที่ใบเสร็จ/บิลรับของ
}

export interface StockInPayload {
  barcode: string;
  quantity: number;
  cost_price_unit?: number;
  seller_id?: string;
  invoice_ref?: string;
  received_by?: string;
  notes?: string;
}

export interface StockInResponse {
  success: boolean;
  log_id?: string;
  base_barcode?: string;
  scanned_barcode?: string;
  is_pack?: boolean;
  pack_name?: string;
  conversion_factor?: number;
  quantity_entered?: number;
  base_quantity_added?: number;
  previous_stock?: number;
  new_stock?: number;
  cost_price?: number;
  total_cost?: number;
  error?: string;
  message?: string;
}

/**
 * 5. Stock_Write_Off_Logs - ประวัติการตัดจ่ายสินค้าชำรุด/หมดอายุ/เบิกใช้ภายใน (Global Table)
 */
export interface StockWriteOffLog {
  write_off_id: string;             // PK: เช่น WO-20260907-001
  barcode: string;                  // FK Ref: รหัสสินค้า (Base Barcode)
  quantity: number;                 // จำนวนหน่วยย่อยที่ตัดจ่าย
  cost_price_unit: number;          // ราคาทุนต่อหน่วย ณ วันที่ตัด
  total_loss_value: number;         // มูลค่าความเสียหาย = quantity * cost_price_unit
  reason: WriteOffReason;           // EXPIRED | DAMAGED | INTERNAL_USE | LOST
  cost_absorbed_by: CostAbsorbedBy; // SELLER (จ่ารับภาระ) | UNIT (กองร้อยชดเชยให้จ่า)
  seller_id: string;                // FK Ref: เจ้าของสินค้า
  authorized_by: string;            // ผู้บังคับบัญชา/จ่าเวรผู้อนุมัติ
  timestamp: string;                // วันเวลาที่ตัดจ่าย (ISO 8601)
}

/**
 * 6. Sellers - รายชื่อผู้ฝากขาย / จ่าเจ้าของสินค้า
 */
export interface Seller {
  seller_id: string;                // PK: S01, S02
  seller_name: string;              // จ่าสิบเอก สมชาย (ร้านขนม)
  contact_info?: string;            // เบอร์โทรศัพท์ / LINE
  default_fee_pct: number;          // ค่า GP มาตรฐาน (%) ของจ่าคนนี้ (เช่น 0.10)
  avatar_url?: string;              // URL รูปโปรไฟล์ / โลโก้ร้านค้า
  is_active: boolean;               // สถานะการเป็นคู่ค้า
  created_at?: string;              // ISO 8601
  updated_at?: string;              // ISO 8601
}

export interface DriveFolder {
  folder_id: string;
  folder_name: string;
  folder_url: string;
  parent_folder_id?: string;
  is_linked?: boolean;
  is_default?: boolean;
  created_at?: string;
  drive_status?: 'ONLINE' | 'TRASHED' | 'DELETED' | 'ACCESS_DENIED' | 'ERROR';
  drive_status_message?: string;
}

/**
 * 7. Promotions - โปรโมชั่นและส่วนลด
 */
export interface Promotion {
  promo_id: string;                 // PK: P-BOGO-COKE, PROMO-001
  promo_name: string;               // ซื้อ 1 แถม 1 โค้กกระป๋อง
  promo_type: PromoType;            // BOGO | DISCOUNT_PCT | CLEARANCE | FIXED_PRICE
  target_barcode: string;           // FK Ref: บาร์โค้ดสินค้าที่ร่วมรายการ
  buy_qty: number;                  // จำนวนที่ต้องซื้อเพื่อให้ได้โปร (เช่น 1)
  free_qty: number;                 // จำนวนที่แถมฟรี (เช่น 1 สำหรับ BOGO)
  discount_pct?: number;            // % ส่วนลด (กรณี DISCOUNT_PCT)
  special_price?: number;           // ราคาพิเศษ (กรณี CLEARANCE / FIXED_PRICE)
  absorbed_by: PromoAbsorbedBy;     // UNIT (กองร้อยออก) | SELLER (จ่าออก) | SHARED
  start_date: string;               // YYYY-MM-DD
  end_date: string;                 // YYYY-MM-DD
  is_active: boolean;               // เปิดใช้งานโปรโมชั่น
  created_at?: string;              // ISO 8601
  updated_at?: string;              // ISO 8601
}

/**
 * 8. Orders_{Batch} - ประวัติการขายบิลหลัก
 */
export interface Order {
  order_id: string;                 // PK: ORD-2569-1-20260907-0001
  order_datetime: string;           // ISO 8601
  cashier_id: string;               // รหัสแคชเชียร์
  shift_id: string;                 // FK Ref: รหัสกะแคชเชียร์
  primary_buyer_code: string;       // FK Ref: ผู้ซื้อหลัก / ผู้ถือบิล
  total_amount: number;             // ยอดรวมเต็มก่อนหักส่วนลด (บาท)
  discount_total: number;           // ส่วนลดรวมทั้งบิล (บาท)
  net_amount: number;               // ยอดสุทธิที่ต้องชำระ (บาท)
  payment_method: PaymentMethod;    // CREDIT | CASH | TRANSFER
  is_party_split: boolean;          // มีการหารบิลหรือไม่
  status: OrderStatus;              // COMPLETED | VOIDED
}

/**
 * 9. Order_Splits_{Batch} - รายละเอียดการหารบิล (Party Split Bill)
 */
export interface OrderSplit {
  split_id: string;                 // PK: SPLIT-ORD0001-01
  order_id: string;                 // FK Ref: บิลหลัก
  participant_code: string;         // FK Ref: รหัสบาร์โค้ดทหารที่ร่วมหาร
  split_type: SplitType;            // EQUAL | FIXED | PERCENT
  amount_assigned: number;          // จำนวนเงินที่ต้องจ่าย (บาท)
  payment_method: PaymentMethod;    // CREDIT | CASH
  is_paid: boolean;                 // ชำระสำเร็จแล้วหรือไม่
  paid_at?: string;                 // เวลาที่ชำระ
}

/**
 * 10. Order_Items_{Batch} - รายการสินค้าในบิล (Snapshot ต้นทุน ณ เวลาขาย)
 */
export interface OrderItem {
  item_id: string;                  // PK: ITEM-ORD0001-01
  order_id: string;                 // FK Ref: บิลหลัก
  barcode: string;                  // FK Ref: รหัสสินค้า
  actual_qty: number;               // จำนวนชิ้นที่ลูกค้ารับจริง
  charged_qty: number;              // จำนวนชิ้นที่คิดเงิน
  cost_price_at_sale: number;       // ราคาทุน ณ วินาทีที่ขาย (บาท)
  unit_price: number;               // ราคาขายปลีกต่อหน่วย (บาท)
  discount_amount: number;          // ส่วนลดของไอเทมนี้ (บาท)
  subtotal: number;                 // ยอดรวมไอเทม (charged_qty * unit_price - discount)
  seller_id: string;                // FK Ref: เจ้าของสินค้า
  is_voided?: boolean;              // สถานะถูกยกเลิก/คืนเงินเฉพาะรายการ (Default: false)
}

/**
 * 11. Batch_Config - การตั้งค่าผลัดทหารและการเงิน
 */
export interface BatchConfig {
  batch_id: string;                 // PK: 2569_1
  batch_name: string;               // ทหารใหม่ ผลัดที่ 1/2569
  start_date: string;               // YYYY-MM-DD
  end_date: string;                 // YYYY-MM-DD
  default_credit_limit: number;     // 2000.00
  is_active_batch: boolean;         // ผลัดปัจจุบันที่เปิดระบบอยู่
}

/**
 * 12. Credit_Logs_{Batch} - สมุดบัญชีเงินสวัสดิการและกระเป๋าเงินสด
 */
export interface CreditLog {
  log_id: string;                   // PK: CL-20260907-0001
  px_code: string;                  // FK Ref: รหัสทหาร
  txn_type: CreditTxnType;          // TOPUP | DEDUCT | REFUND
  wallet_type: 'CREDIT_ALLOWANCE' | 'CASH_WALLET';
  amount: number;                   // จำนวนเงิน
  balance_before: number;           // ยอดก่อนทำรายการ
  balance_after: number;            // ยอดหลังทำรายการ
  ref_order_id?: string;            // FK Ref: อ้างอิงบิล
  recorded_by: string;              // แคชเชียร์ / ผู้บันทึก
  timestamp: string;                // ISO 8601
}

/**
 * 13. Shifts_{Batch} - บันทึกกะการขายและกระทบยอดลิ้นชักเงินสด
 */
export interface Shift {
  shift_id: string;                 // PK: SHIFT-20260907-01
  cashier_id: string;               // รหัสแคชเชียร์
  terminal_id: string;              // POS-01 / POS-02
  opened_at: string;                // เวลาเปิดกะ
  closed_at?: string;               // เวลาปิดกะ
  starting_cash_float: number;      // เงินทอนเริ่มต้น
  total_cash_sales: number;         // ยอดขายเงินสดรวมตามระบบ
  actual_cash_counted?: number;     // ยอดเงินสดที่นับได้จริง
  cash_difference?: number;         // ผลต่าง (actual - (float + sales))
  status: ShiftStatus;              // OPEN | CLOSED
}

/**
 * 14. Payroll_Settlement_{Batch} - สรุปยอดตัดเงินเดือนส่งการเงินกองบิน
 */
export interface PayrollSettlement {
  settlement_id: string;            // PK: PAY-2569-1-001
  px_code: string;                  // FK Ref: รหัสทหาร
  national_id: string;              // เลขบัตร ปชช. 13 หลัก
  salary_base: number;              // เงินเดือนมาตรฐาน
  total_credit_used: number;        // ยอดวงเงินสวัสดิการที่ใช้ไปจริง
  mandatory_deductions: number;     // ค่าใช้จ่ายบังคับตัดอื่นๆ
  net_salary_payout: number;        // เงินเดือนสุทธิที่ทหารจะได้รับโอนเข้าบัญชี
  status: PayrollStatus;            // PENDING | EXPORTED | CLEARED
  cleared_at?: string;              // วันเวลาที่ตัดยอดสำเร็จ
}

/**
 * 15. Void_Logs_{Batch} - ประวัติการยกเลิกบิลหรือคืนสินค้าบางรายการ
 */
export interface VoidLog {
  void_id: string;                  // PK: VOID-20260907-001
  order_id: string;                 // FK Ref: บิลที่ถูกยกเลิก/คืนเงิน
  item_id?: string;                 // FK Ref: คืนเฉพาะรายการ (Partial Refund) ถ้าคืนทั้งบิลให้เว้นว่าง
  is_partial: boolean;              // TRUE = คืนเฉพาะชิ้น, FALSE = ยกเลิกทั้งบิล
  refund_amount: number;            // จำนวนเงินที่คืน (บาท)
  voided_by: string;                // แคชเชียร์ผู้ทำรายการ
  authorized_by: string;            // จ่าเวร / ผู้บังคับบัญชาที่อนุมัติ
  void_reason: string;              // เหตุผล เช่น ยิงบาร์โค้ดซ้ำ, สินค้าชำรุด, เปลี่ยนไซส์
  refund_method: PaymentMethod;     // วิธีคืนเงิน (CREDIT / CASH)
  voided_at: string;                // เวลาที่ยกเลิก (ISO 8601)
}

// ----------------------------------------------------------------------
// Business Logic Functions
// ----------------------------------------------------------------------

export function isValidSoldierStatus(status: string): status is SoldierStatus {
  return ['ACTIVE', 'SUSPENDED', 'DISCHARGED'].includes(status);
}

export function isValidUserRole(role: string): role is UserRole {
  return ['ADMIN', 'STAFF', 'SELLER'].includes(role);
}

export function canAccessCostData(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SELLER';
}

export function canAuthorizeVoid(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function isProductSellable(product: ProductCatalog): boolean {
  return product.is_active === true;
}

export function calculateWriteOffLoss(quantity: number, costPriceUnit: number): number {
  return Math.max(0, quantity * costPriceUnit);
}

export function calculatePayrollNetPayout(params: {
  salaryBase: number;
  creditAllowanceLimit: number;
  creditAllowanceRemaining: number;
  mandatoryDeductions: number;
}) {
  const creditAllowanceUsed = Math.max(0, params.creditAllowanceLimit - params.creditAllowanceRemaining);
  const netPayout = params.salaryBase - creditAllowanceUsed - params.mandatoryDeductions;
  return {
    creditAllowanceUsed,
    netPayout
  };
}

export function calculateStockDeduction(quantitySold: number, conversionFactor: number = 1): number {
  return quantitySold * (conversionFactor > 0 ? conversionFactor : 1);
}

export function calculateShiftDifference(
  startingFloat: number,
  cashSales: number,
  actualCashCounted: number
): number {
  const expectedCash = startingFloat + cashSales;
  return actualCashCounted - expectedCash;
}

export function calculateConsignmentProfit(
  sellingPrice: number,
  costPrice: number,
  consignmentFeePct: number,
  quantitySold: number
) {
  const grossProfitPerUnit = Math.max(0, sellingPrice - costPrice);
  const grossProfitTotal = grossProfitPerUnit * quantitySold;
  const feeTotal = grossProfitTotal * consignmentFeePct;
  const sellerNetProfitTotal = grossProfitTotal - feeTotal;

  return {
    grossProfitTotal,
    feeTotal,
    sellerNetProfitTotal
  };
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'STAFF') return path.startsWith('/pos') || path.startsWith('/kiosk');
  if (role === 'SELLER') return path.startsWith('/seller');
  return false;
}

export function formatSoldierWalletDisplay(soldier: Soldier) {
  const totalAvailable = Number((soldier.credit_allowance_balance + soldier.cash_wallet_balance).toFixed(2));
  const isUsable = soldier.status === 'ACTIVE';
  return {
    totalAvailable,
    isUsable,
    statusMessage: isUsable ? 'พร้อมใช้งาน' : 'ระงับการใช้จ่าย (ป่วย/กักบริเวณ)'
  };
}

export function calculateSellerMonthlySettlement(
  items: Array<{ unit_price: number; cost_price_at_sale: number; charged_qty: number; is_voided?: boolean }>,
  feePct: number
) {
  let totalGrossSales = 0;
  let totalCost = 0;

  items.forEach(item => {
    if (item.is_voided) return;
    totalGrossSales += item.unit_price * item.charged_qty;
    totalCost += item.cost_price_at_sale * item.charged_qty;
  });

  const grossProfit = totalGrossSales - totalCost;
  const unitFeeDeducted = Number((grossProfit * feePct).toFixed(2));
  const sellerNetProfit = grossProfit - unitFeeDeducted;
  const sellerNetPayout = Number((totalCost + sellerNetProfit).toFixed(2));

  return {
    totalGrossSales,
    totalCost,
    grossProfit,
    unitFeeDeducted,
    sellerNetPayout
  };
}

export function calculateCartTotals(items: Array<{ unit_price: number; actual_qty: number; charged_qty: number; discount_amount: number }>) {
  let totalGross = 0;
  let discountTotal = 0;

  items.forEach(item => {
    totalGross += item.unit_price * item.actual_qty;
    discountTotal += item.discount_amount;
  });

  const netPayable = Number((totalGross - discountTotal).toFixed(2));
  return { totalGross, discountTotal, netPayable };
}

export function generatePayrollBatchSummary(
  soldiers: Array<{ px_code: string; salary_base: number; credit_limit: number; credit_allowance_balance: number; deductions: number }>
) {
  let totalCreditUsed = 0;
  let totalMandatoryDeductions = 0;
  let totalNetSalaryPayout = 0;

  soldiers.forEach(s => {
    const creditUsed = s.credit_limit - s.credit_allowance_balance;
    const netPayout = s.salary_base - creditUsed - s.deductions;
    totalCreditUsed += creditUsed;
    totalMandatoryDeductions += s.deductions;
    totalNetSalaryPayout += netPayout;
  });

  return {
    totalSoldiers: soldiers.length,
    totalCreditUsed: Number(totalCreditUsed.toFixed(2)),
    totalMandatoryDeductions: Number(totalMandatoryDeductions.toFixed(2)),
    totalNetSalaryPayout: Number(totalNetSalaryPayout.toFixed(2))
  };
}

/**
 * 23. Stock-In History & Audit Trail
 */
export interface StockInLogEntry {
  log_id: string;
  barcode: string;
  product_name: string;
  unit_name: string;
  category: string;
  image_url?: string;
  quantity_added: number;
  cost_price_unit: number;
  total_cost: number;
  seller_id: string;
  seller_name?: string;
  received_by: string;
  received_at: string;
  invoice_ref?: string;
  notes?: string;
}

export interface StockInLogsSummary {
  total_logs: number;
  total_quantity: number;
  total_cost_amount: number;
}

export interface StockInLogsResponse {
  status: string;
  success: boolean;
  data: StockInLogEntry[];
  summary: StockInLogsSummary;
  error?: string;
}

export interface StockInLogFilters {
  barcode?: string;
  seller_id?: string;
  date_preset?: 'today' | 'this_week' | 'this_month' | 'custom' | 'all';
  date_from?: string;
  date_to?: string;
}

/**
 * 24. Monthly Deductions & Recurring Rules Types
 */
export type DeductionScheduleType = 'MONTHLY_RECURRING' | 'DATE_RANGE' | 'ONE_TIME';
export type DeductionCategory = 'HAIRCUT' | 'LAUNDRY' | 'SAVINGS' | 'WELFARE' | 'MESS_HALL' | 'UTILITY' | 'MEDICAL' | 'GEAR' | 'OTHER';

export interface DeductionConfigItem {
  id: string;
  name: string;
  amount: number;
  category: DeductionCategory;
  schedule_type: DeductionScheduleType;
  target_wallet?: 'ALLOWANCE' | 'CASH' | 'SALARY';
  start_date?: string;
  end_date?: string;
  is_enabled: boolean;
  notes?: string;
}

export interface BatchDeductionExecutionRequest {
  batch_id: string;
  month_period: string; // e.g., '2026-09'
  deduction_items: DeductionConfigItem[];
  target_soldier_ids?: string[]; // If empty/undefined, applies to all ACTIVE soldiers
  admin_user_id: string;
  admin_name: string;
  target_wallet?: 'ALLOWANCE' | 'CASH' | 'SALARY';
}

export interface SalaryTopupItem {
  px_code: string;
  amount: number;
  wallet_target: 'CREDIT_LIMIT' | 'CREDIT_BALANCE' | 'CASH_WALLET';
  note?: string;
}

export interface SalaryTopupRequest {
  batch_id: string;
  topup_type: 'INDIVIDUAL' | 'BATCH_ALL' | 'CUSTOM_GRID';
  soldier_px_codes?: string[];
  wallet_target?: 'CREDIT_LIMIT' | 'CREDIT_BALANCE' | 'CASH_WALLET';
  amount?: number;
  items?: SalaryTopupItem[];
  user_id: string;
  user_name: string;
  note: string; // Mandatory reason (e.g., 'เงินเดือนประจำเดือน ต.ค. 2569')
  month_period?: string; // 'YYYY-MM' payroll period this top-up belongs to (defaults to current month server-side)
}

/**
 * 26. Monthly Payroll Payday & Cutoff Schedule Calendar
 */
export interface MonthlyPayrollSchedule {
  month_key: string;            // '2026-09'
  month_label: string;          // 'กันยายน 2569'
  payday_date: string;          // '2026-09-28' (วันที่เงินเดือนเข้า)
  cutoff_date: string;          // '2026-09-25' (วันที่ตัดยอดหักเงิน)
  salary_base: number;          // 10000 (ฐานเงินเดือนประจำเดือน)
  auto_deduct_enabled: boolean; // เปิดหักอัตโนมัติเมื่อถึงวัน cutoff หรือไม่
  status: 'SCHEDULED' | 'CUTOFF_REACHED' | 'PROCESSED' | 'PAST';
}

/**
 * 27. Monthly Deduction Execution History (persisted in Deduction_History sheet)
 */
export interface CompletedDeductionRecord {
  id: string;
  month_period: string;
  month_label: string;
  executed_at: string;
  executed_by_id: string;
  executed_by_name: string;
  target_soldier_count: number;
  total_deduction_amount: number;
  per_soldier_amount: number;
  salary_deductions: number;
  allowance_deductions: number;
  cash_deductions: number;
  items_snapshot: DeductionConfigItem[];
  status: 'COMPLETED';
}



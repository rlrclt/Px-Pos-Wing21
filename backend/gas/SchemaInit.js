/**
 * =========================================================================
 * PX ทหารใหม่ (Wing 21) - Master & Batch Database Schema Initializer (Multi-Sheet Sharding)
 * =========================================================================
 */

var MASTER_SCHEMA = {
  // 1. ตารางส่วนกลาง (Global Master Tables)
  GLOBAL: {
    Users: [
      'user_id', 'username', 'pin_hash', 'full_name', 'role', 'seller_id', 'avatar_url', 'is_active'
    ],
    Product_Catalog: [
      'barcode', 'product_name', 'image_url', 'unit_name', 'selling_price',
      'category', 'parent_barcode', 'conversion_factor', 'is_active'
    ],
    Inventory_Stocks: [
      'barcode', 'stock_qty', 'cost_price', 'seller_id', 'low_stock_threshold'
    ],
    Stock_In_Logs: [
      'log_id', 'barcode', 'quantity_added', 'cost_price_unit', 'total_cost',
      'seller_id', 'received_by', 'received_at', 'invoice_ref'
    ],
    Stock_Write_Off_Logs: [
      'write_off_id', 'barcode', 'quantity', 'cost_price_unit', 'total_loss_value',
      'reason', 'cost_absorbed_by', 'seller_id', 'authorized_by', 'timestamp'
    ],
    Sellers: [
      'seller_id', 'seller_name', 'contact_info', 'default_fee_pct', 'avatar_url', 'is_active'
    ],
    Promotions: [
      'promo_id', 'promo_name', 'promo_type', 'target_barcode', 'buy_qty',
      'free_qty', 'discount_pct', 'absorbed_by', 'start_date', 'end_date', 'is_active'
    ],
    Batch_Config: [
      'batch_id', 'batch_name', 'spreadsheet_id', 'start_date', 'end_date', 'default_credit_limit', 'is_active_batch'
    ]
  },

  // 2. ตารางเฉพาะผลัด/รุ่น (Batch-Specific Tables ใน Google Sheet ไฟล์แยก)
  BATCH_TABLES: {
    Soldiers: [
      'px_code', 'national_id', 'full_name', 'unit', 'credit_limit',
      'deductions', 'credit_allowance_balance', 'cash_wallet_balance', 'photo_url', 'status'
    ],
    Orders: [
      'order_id', 'order_datetime', 'cashier_id', 'shift_id', 'primary_buyer_code',
      'total_amount', 'discount_total', 'net_amount', 'payment_method', 'is_party_split', 'status'
    ],
    Order_Splits: [
      'split_id', 'order_id', 'participant_code', 'split_type', 'amount_assigned',
      'payment_method', 'is_paid', 'paid_at'
    ],
    Order_Items: [
      'item_id', 'order_id', 'barcode', 'actual_qty', 'charged_qty',
      'cost_price_at_sale', 'unit_price', 'discount_amount', 'subtotal', 'seller_id', 'is_voided'
    ],
    Credit_Logs: [
      'log_id', 'px_code', 'txn_type', 'wallet_type', 'amount',
      'balance_before', 'balance_after', 'ref_order_id', 'recorded_by', 'timestamp'
    ],
    Shifts: [
      'shift_id', 'cashier_id', 'terminal_id', 'opened_at', 'closed_at',
      'starting_cash_float', 'total_cash_sales', 'actual_cash_counted', 'cash_difference', 'status'
    ],
    Payroll_Settlement: [
      'settlement_id', 'px_code', 'national_id', 'salary_base', 'total_credit_used',
      'mandatory_deductions', 'net_salary_payout', 'status', 'cleared_at'
    ],
    Payroll_Schedules: [
      'month_key', 'month_label', 'payday_date', 'cutoff_date', 'salary_base',
      'auto_deduct_enabled', 'status'
    ],
    Deduction_Configs: [
      'config_key', 'config_json', 'updated_at'
    ],
    Deduction_History: [
      'record_id', 'month_period', 'month_label', 'executed_at', 'executed_by_id',
      'executed_by_name', 'target_soldier_count', 'total_deduction_amount',
      'per_soldier_amount', 'salary_deductions', 'allowance_deductions',
      'cash_deductions', 'items_snapshot_json', 'status'
    ],
    Void_Logs: [
      'void_id', 'order_id', 'item_id', 'is_partial', 'refund_amount',
      'voided_by', 'authorized_by', 'void_reason', 'refund_method', 'voided_at'
    ]
  }
};

var MASTER_SPREADSHEET_ID = "1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4";
var BATCH_2569_1_SPREADSHEET_ID = "1iJALNSSqvk4dLLYJdziUbh8Of26yWDkryPfuUEs6BJE";

function getMasterSpreadsheet() {
  if (MASTER_SPREADSHEET_ID && MASTER_SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * -------------------------------------------------------------
 * 1. ฟังก์ชันสร้าง Master Schema (8 ตาราง Global)
 * -------------------------------------------------------------
 */
function initializeMasterDatabase() {
  const ss = getMasterSpreadsheet();
  Object.keys(MASTER_SCHEMA.GLOBAL).forEach(tableName => {
    createOrUpdateSheet(ss, tableName, MASTER_SCHEMA.GLOBAL[tableName], '#1e293b'); // Dark Slate Header
  });
  return { status: 'SUCCESS', message: 'Master Global tables initialized on ' + ss.getName() };
}

/**
 * -------------------------------------------------------------
 * 2. ฟังก์ชันสร้าง Batch Schema รุ่น 1/69 (1iJALNSSqvk4dLLYJdziUbh8Of26yWDkryPfuUEs6BJE)
 * -------------------------------------------------------------
 */
function setupBatch2569_1() {
  return initializeBatchDatabase(BATCH_2569_1_SPREADSHEET_ID, "2569_1");
}

/**
 * ล้างและสร้าง 8 ตารางใหม่สำหรับผลัด 1/69 ทันที
 */
function wipeAndRecreateBatch2569_1() {
  wipeBatchDatabase(BATCH_2569_1_SPREADSHEET_ID);
  return setupBatch2569_1();
}

/**
 * สร้าง Batch Schema ใน Google Sheet ไฟล์ใดๆ
 */
function initializeBatchDatabase(batchSpreadsheetId, batchId) {
  if (!batchSpreadsheetId) {
    throw new Error('กรุณาระบุ batchSpreadsheetId ของไฟล์ Google Sheet ใหม่');
  }
  if (!batchId) batchId = "2569_1";

  const batchSS = SpreadsheetApp.openById(batchSpreadsheetId);
  Object.keys(MASTER_SCHEMA.BATCH_TABLES).forEach(tableName => {
    createOrUpdateSheet(batchSS, tableName, MASTER_SCHEMA.BATCH_TABLES[tableName], '#0f766e'); // Teal Header
  });

  // ลบชีตตั้งต้น 'Sheet1' หรือ 'แผ่นงาน1' หากมี
  try {
    const defaultSheet = batchSS.getSheetByName('Sheet1') || batchSS.getSheetByName('แผ่นงาน1');
    if (defaultSheet && batchSS.getSheets().length > 1) {
      batchSS.deleteSheet(defaultSheet);
    }
  } catch (e) {
    console.warn('Cannot delete default sheet:', e);
  }

  // ลงทะเบียนไฟล์นี้เข้า Master Batch_Config
  registerBatchSpreadsheet(batchId, "ทหารใหม่ ผลัด " + batchId, batchSpreadsheetId);

  return { 
    status: 'SUCCESS', 
    message: 'Batch tables initialized on ' + batchSS.getName() + ' and registered to Master Batch_Config' 
  };
}

/**
 * -------------------------------------------------------------
 * 3. ฟังก์ชันลบตารางทั้งหมดใน Master Sheet (Clean Wipe / Reset)
 * -------------------------------------------------------------
 */
function wipeMasterDatabase() {
  const ss = getMasterSpreadsheet();
  
  let tempSheet = ss.getSheetByName('Temp_Reset');
  if (!tempSheet) {
    tempSheet = ss.insertSheet('Temp_Reset');
  }

  const allSheets = ss.getSheets();
  allSheets.forEach(sheet => {
    if (sheet.getName() !== 'Temp_Reset') {
      try {
        ss.deleteSheet(sheet);
      } catch (e) {
        console.warn('Could not delete sheet ' + sheet.getName(), e);
      }
    }
  });

  return { status: 'SUCCESS', message: 'Wiped all sheets from Master Spreadsheet. Ready for fresh initialize.' };
}

/**
 * -------------------------------------------------------------
 * 4. ฟังก์ชัน ล้างเกลี้ยง + สร้าง Master 8 ตารางใหม่ทันที
 * -------------------------------------------------------------
 */
function wipeAndRecreateMaster() {
  const ss = getMasterSpreadsheet();
  
  initializeMasterDatabase();

  const leftoverSheets = ['Temp_Reset', 'Sheet1', 'แผ่นงาน1'];
  leftoverSheets.forEach(name => {
    const s = ss.getSheetByName(name);
    if (s && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(s);
      } catch (e) {}
    }
  });

  return { status: 'SUCCESS', message: 'Master Spreadsheet completely reset and fresh 8 tables created!' };
}

/**
 * -------------------------------------------------------------
 * 5. ฟังก์ชันลบตารางทั้งหมดใน Batch Sheet
 * -------------------------------------------------------------
 */
function wipeBatchDatabase(batchSpreadsheetId) {
  if (!batchSpreadsheetId) {
    throw new Error('กรุณาระบุ batchSpreadsheetId');
  }
  const batchSS = SpreadsheetApp.openById(batchSpreadsheetId);

  let tempSheet = batchSS.getSheetByName('Temp_Reset');
  if (!tempSheet) {
    tempSheet = batchSS.insertSheet('Temp_Reset');
  }

  const allSheets = batchSS.getSheets();
  allSheets.forEach(sheet => {
    if (sheet.getName() !== 'Temp_Reset') {
      try {
        batchSS.deleteSheet(sheet);
      } catch (e) {
        console.warn('Could not delete sheet ' + sheet.getName(), e);
      }
    }
  });

  return { status: 'SUCCESS', message: 'Wiped all sheets from Batch Spreadsheet.' };
}

/**
 * บันทึก ID ไฟล์รุ่นลงในตาราง Batch_Config ใน Master Sheet
 */
function registerBatchSpreadsheet(batchId, batchName, spreadsheetId) {
  const masterSS = getMasterSpreadsheet();
  let configSheet = masterSS.getSheetByName('Batch_Config');
  if (!configSheet) {
    createOrUpdateSheet(masterSS, 'Batch_Config', MASTER_SCHEMA.GLOBAL.Batch_Config, '#1e293b');
    configSheet = masterSS.getSheetByName('Batch_Config');
  }

  const data = configSheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(batchId)) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [batchId, batchName, spreadsheetId, new Date().toISOString().split('T')[0], '', 2000, true];
  if (rowIndex > 0) {
    configSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    configSheet.appendRow(rowValues);
  }
}

/**
 * สร้างชีต จัด Format Header ลบเซลล์ว่างส่วนเกินเพื่อความเร็วสูงสุด
 */
function createOrUpdateSheet(ss, sheetName, headers, headerColor) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(headerColor || '#1e293b');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  const maxCols = sheet.getMaxColumns();
  if (maxCols > headers.length) {
    sheet.deleteColumns(headers.length + 1, maxCols - headers.length);
  }

  const maxRows = sheet.getMaxRows();
  if (maxRows > 100) {
    sheet.deleteRows(101, maxRows - 100);
  }
}

/**
 * ฟังก์ชันสำหรับกด Run ใน Apps Script Editor เพื่อปลดล็อกสิทธิ์สร้างโฟลเดอร์ Google Drive (Full Write Permission)
 */
function testDriveAuth() {
  var parentFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
  var testSub = parentFolder.createFolder("PX_Auth_Test_Temp");
  var testId = testSub.getId();
  testSub.setTrashed(true); // ลบทิ้งทันทีหลังทดสอบสิทธิ์ผ่าน
  Logger.log("✅ สิทธิ์สร้าง/จัดการ Google Drive ผ่านสมบูรณ์ 100%! (สร้างและลบโฟลเดอร์ทดสอบ ID: " + testId + ")");
  return "OK: Full Google Drive Write Permission Granted";
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const batchId = e.parameter.batchId || "";
    let data = { status: 'SUCCESS', message: 'PX Wing 21 Backend API is running' };
    switch (action) {
      case 'getBatches':
        data = handleGetBatches();
        break;
      case 'getDriveFolders':
        data = handleGetDriveFolders();
        break;
      case 'getUsers':
        data = handleGetUsers();
        break;
      case 'login':
        data = handleLogin(e.parameter.username, e.parameter.pin);
        break;
      case 'getProducts':
        data = handleGetProducts();
        break;
      case 'getProductUOMs':
        data = handleGetProductUOMs();
        break;
      case 'getSoldiers':
        data = handleGetSoldiers(batchId);
        break;
      case 'getSellers':
        data = handleGetSellers();
        break;
      case 'getPromotions':
        data = handleGetPromotions();
        break;
      case 'getSoldier':
        data = handleCheckSoldierWallet(batchId, e.parameter.barcode);
        break;
      case 'toggleLinkDriveFolder':
      case 'setLinkDriveFolder':
        data = handleToggleLinkDriveFolder({ folder_id: e.parameter.folder_id, is_linked: e.parameter.is_linked === 'true' });
        break;
      case 'setDefaultDriveFolder':
        data = handleSetDefaultDriveFolder({ folder_id: e.parameter.folder_id });
        break;
      case 'stockInProduct':
        data = handleStockInProduct(e.parameter);
        break;
      case 'getStockInLogs':
        data = handleGetStockInLogs(e.parameter);
        break;
      case 'getOrders':
        data = handleGetOrders(batchId, e.parameter);
        break;
      case 'getOrderDetails':
        data = handleGetOrderDetails(batchId, e.parameter.order_id || e.parameter.orderId);
        break;
      default:
        data = { status: 'SUCCESS', message: 'PX Wing 21 Backend API is running' };
    }

    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const payload = requestData.payload;
    const batchId = requestData.batchId || "2569_1";

    let response = {};

    switch (action) {
      case 'getBatches':
        response = handleGetBatches();
        break;
      case 'createBatchSheet':
        response = handleCreateBatchSheet(payload);
        break;
      case 'updateBatchConfig':
        response = handleUpdateBatchConfig(payload);
        break;
      case 'executeBatchDeductions':
        response = handleBatchExecuteDeductions(batchId, payload);
        break;
      case 'batchSalaryTopup':
        response = handleBatchSalaryTopup(batchId, payload);
        break;
      case 'savePayrollSchedules':
        response = handleSavePayrollSchedules(batchId, payload);
        break;
      case 'getPayrollSchedules':
        response = handleGetPayrollSchedules(batchId);
        break;
      case 'saveDeductionConfigs':
        response = handleSaveDeductionConfigs(batchId, payload);
        break;
      case 'getDeductionConfigs':
        response = handleGetDeductionConfigs(batchId);
        break;
      case 'saveDeductionHistory':
        response = handleSaveDeductionHistory(batchId, payload);
        break;
      case 'getDeductionHistory':
        response = handleGetDeductionHistory(batchId);
        break;
      case 'deleteBatch':
      case 'deleteBatchSheet':
        response = handleDeleteBatchSheet(payload);
        break;
      case 'getDriveFolders':
        response = handleGetDriveFolders();
        break;
      case 'createDriveFolder':
        response = handleCreateDriveFolder(payload);
        break;
      case 'linkDriveFolder':
        response = handleLinkDriveFolder(payload);
        break;
      case 'setDefaultDriveFolder':
        response = handleSetDefaultDriveFolder(payload);
        break;
      case 'toggleLinkDriveFolder':
      case 'setLinkDriveFolder':
        response = handleToggleLinkDriveFolder(payload);
        break;
      case 'deleteDriveFolder':
        response = handleDeleteDriveFolder(payload);
        break;
      case 'getUsers':
        response = handleGetUsers();
        break;
      case 'login':
        response = handleLogin(payload.username, payload.pin);
        break;
      case 'createUser':
        response = handleCreateUser(payload.user);
        break;
      case 'deleteUser':
        response = handleDeleteUser(payload.userId);
        break;
      case 'toggleUserActive':
        response = handleToggleUserActive(payload.userId);
        break;
      case 'createSeller':
        response = handleCreateSeller(payload.seller || payload);
        break;
      case 'updateSeller':
        response = handleUpdateSeller(payload.seller_id, payload.updates || payload);
        break;
      case 'deleteSeller':
        response = handleDeleteSeller(payload.seller_id, payload.cascade !== false);
        break;
      case 'uploadSellerAvatar':
        response = handleUploadSellerAvatar(payload);
        break;
      case 'getPromotions':
        response = handleGetPromotions();
        break;
      case 'createPromotion':
        response = handleCreatePromotion(payload.promotion || payload);
        break;
      case 'updatePromotion':
        response = handleUpdatePromotion(payload.promo_id || payload.promoId, payload.updates || payload);
        break;
      case 'deletePromotion':
        response = handleDeletePromotion(payload.promo_id || payload.promoId || payload);
        break;
      case 'togglePromotionActive':
        response = handleTogglePromotionActive(payload.promo_id || payload.promoId || payload);
        break;
      case 'INITIALIZE_SCHEMA':
        response = initializePXDatabase(batchId);
        break;
      case 'AUTH_LOGIN':
        response = handleAuthLogin(payload);
        break;
      case 'LIST_CASHIERS':
        response = handleListCashiers();
        break;
      case 'SYNC_CATALOG':
      case 'getProducts':
        response = handleGetProducts();
        break;
      case 'getProductUOMs':
        response = handleGetProductUOMs();
        break;
      case 'saveProductUOM':
        response = handleSaveProductUOM(payload);
        break;
      case 'deleteProductUOM':
        response = handleDeleteProductUOM(payload);
        break;
      case 'deleteProduct':
        response = handleDeleteProduct(payload);
        break;
      case 'uploadProductImage':
        response = handleUploadProductImage(payload);
        break;
      case 'deleteDriveFile':
        response = handleDeleteDriveFile(payload);
        break;
      case 'toggleProductActive':
        response = handleToggleProductActive(payload);
        break;
      case 'CHECK_SOLDIER_WALLET':
      case 'getSoldier':
        response = handleCheckSoldierWallet(batchId, payload.px_code || payload.barcode);
        break;
      case 'saveSoldier':
        response = handleSaveSoldier(batchId, payload);
        break;
      case 'deleteSoldier':
        response = handleDeleteSoldier(batchId, payload);
        break;
      case 'toggleSoldierStatus':
        response = handleToggleSoldierStatus(batchId, payload);
        break;
      case 'uploadSoldierImage':
        response = handleUploadSoldierImage(payload);
        break;
      case 'batchUpdateSoldierPhotos':
        response = handleBatchUpdateSoldierPhotos(batchId, payload);
        break;
      case 'scanDriveFolderSoldierPhotos':
        response = handleScanDriveFolderForSoldierPhotos(batchId, payload);
        break;
      case 'PROCESS_ORDER':
      case 'createOrder':
        response = handleProcessOrder(batchId, payload);
        break;
      case 'topupSoldier':
        response = handleTopupSoldier(batchId, payload);
        break;
      case 'PROCESS_WRITE_OFF':
        response = handleProcessWriteOff(payload);
        break;
      case 'VOID_ORDER':
      case 'voidOrder':
        response = handleVoidOrder(batchId, payload);
        break;
      case 'CLOSE_SHIFT':
        response = handleCloseShift(batchId, payload);
        break;
      case 'GENERATE_PAYROLL_EXPORT':
      case 'processPayrollExport':
        response = handleGeneratePayrollExport(batchId, payload);
        break;
      case 'batchImportSoldiers':
      case 'importSoldiers':
        response = handleBatchImportSoldiers(batchId, payload);
        break;
      case 'batchImportProducts':
      case 'importProducts':
        response = handleBatchImportProducts(payload);
        break;
      case 'stockInProduct':
        response = handleStockInProduct(payload);
        break;
      case 'getStockInLogs':
        response = handleGetStockInLogs(payload);
        break;
      default:
        response = { status: 'ERROR', message: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

var MASTER_SPREADSHEET_ID = "1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4";
var BATCH_2569_1_SPREADSHEET_ID = "";
var DEFAULT_PX_ROOT_FOLDER_ID = "1rQMWxx9ed5DsMy0uGsFRFkFvwl5ZNChT";
var BATCH_FOLDER_ID = "1rQMWxx9ed5DsMy0uGsFRFkFvwl5ZNChT";

function getPXSpreadsheet() {
  return getMasterSpreadsheet();
}

function getMasterSpreadsheet() {
  if (MASTER_SPREADSHEET_ID && MASTER_SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getBatchSpreadsheet(batchId) {
  const masterSS = getMasterSpreadsheet();
  const configSheet = masterSS.getSheetByName('Batch_Config');
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (batchId && String(data[i][0]).trim().toLowerCase() === String(batchId).trim().toLowerCase() && data[i][2]) {
        return SpreadsheetApp.openById(String(data[i][2]).trim());
      }
    }
    for (let i = 1; i < data.length; i++) {
      if ((data[i][6] === true || String(data[i][6]).toUpperCase() === 'TRUE' || String(data[i][6]) === '1') && data[i][2]) {
        return SpreadsheetApp.openById(String(data[i][2]).trim());
      }
    }
    if (data.length > 1 && data[1][2]) {
      return SpreadsheetApp.openById(String(data[1][2]).trim());
    }
  }
  if (BATCH_2569_1_SPREADSHEET_ID && BATCH_2569_1_SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(BATCH_2569_1_SPREADSHEET_ID);
  }
  return masterSS;
}

const CANONICAL_BATCH_HEADERS = {
  Soldiers: ['px_code', 'national_id', 'full_name', 'unit', 'credit_limit', 'deductions', 'credit_allowance_balance', 'cash_wallet_balance', 'photo_url', 'status'],
  Orders: ['order_id', 'order_datetime', 'cashier_id', 'shift_id', 'primary_buyer_code', 'total_amount', 'discount_total', 'net_amount', 'payment_method', 'is_party_split', 'status'],
  Order_Splits: ['split_id', 'order_id', 'participant_code', 'split_type', 'amount_assigned', 'payment_method', 'is_paid', 'paid_at'],
  Order_Items: ['item_id', 'order_id', 'barcode', 'actual_qty', 'charged_qty', 'cost_price_at_sale', 'unit_price', 'discount_amount', 'subtotal', 'seller_id', 'is_voided'],
  Credit_Logs: ['log_id', 'px_code', 'txn_type', 'wallet_type', 'amount', 'balance_before', 'balance_after', 'ref_order_id', 'recorded_by', 'timestamp'],
  Shifts: ['shift_id', 'cashier_id', 'terminal_id', 'opened_at', 'closed_at', 'starting_cash_float', 'total_cash_sales', 'actual_cash_counted', 'cash_difference', 'status'],
  Payroll_Settlement: ['settlement_id', 'px_code', 'national_id', 'salary_base', 'total_credit_used', 'mandatory_deductions', 'net_salary_payout', 'status', 'cleared_at'],
  Payroll_Schedules: ['month_key', 'month_label', 'payday_date', 'cutoff_date', 'salary_base', 'auto_deduct_enabled', 'status'],
  Deduction_Configs: ['config_key', 'config_json', 'updated_at'],
  Deduction_History: ['record_id', 'month_period', 'month_label', 'executed_at', 'executed_by_id', 'executed_by_name', 'target_soldier_count', 'total_deduction_amount', 'per_soldier_amount', 'salary_deductions', 'allowance_deductions', 'cash_deductions', 'items_snapshot_json', 'status'],
  Void_Logs: ['void_id', 'order_id', 'item_id', 'is_partial', 'refund_amount', 'voided_by', 'authorized_by', 'void_reason', 'refund_method', 'voided_at']
};

function getBatchSheet(batchId, tableName) {
  const batchSS = getBatchSpreadsheet(batchId);
  let sheet = batchSS.getSheetByName(tableName);
  if (!sheet) {
    sheet = batchSS.getSheetByName(tableName + "_" + batchId);
  }
  if (!sheet) {
    // fallback to master sheet if combined
    const masterSS = getMasterSpreadsheet();
    sheet = masterSS.getSheetByName(tableName) || masterSS.getSheetByName(tableName + "_" + batchId);
  }

  // Auto-heal / Ensure Canonical Headers
  if (sheet && CANONICAL_BATCH_HEADERS[tableName]) {
    try {
      const expectedHeaders = CANONICAL_BATCH_HEADERS[tableName];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(expectedHeaders);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      } else {
        const lastCol = sheet.getLastColumn();
        const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
        if (currentHeaders.length < expectedHeaders.length || (tableName === 'Void_Logs' && currentHeaders.length < 10) || (tableName === 'Order_Items' && currentHeaders.length !== 11)) {
          sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
        }
      }
    } catch (err) {
      console.warn('Could not auto-heal headers for ' + tableName + ': ' + err.toString());
    }
  }

  return sheet;
}

/**
 * BatchGuard / Payroll month helpers (backend-side enforcement)
 */
function parseGasDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const parts = s.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

function monthEndDate(monthPeriod) {
  const key = String(monthPeriod || '');
  if (!/^\d{4}-\d{2}$/.test(key)) return '';
  const y = parseInt(key.split('-')[0], 10);
  const m = parseInt(key.split('-')[1], 10);
  const lastDay = new Date(y, m, 0).getDate();
  const dd = lastDay < 10 ? '0' + lastDay : String(lastDay);
  return key + '-' + dd;
}

function getBatchConfigRowData(batchId) {
  const masterSS = getMasterSpreadsheet();
  const configSheet = masterSS.getSheetByName('Batch_Config');
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (batchId && String(data[i][0]).trim().toLowerCase() === String(batchId).trim().toLowerCase()) {
        return {
          batch_id: String(data[i][0]).trim(),
          batch_name: data[i][1] ? String(data[i][1]).trim() : '',
          spreadsheet_id: data[i][2] ? String(data[i][2]).trim() : '',
          start_date: formatGasDateHelper(data[i][3]),
          end_date: formatGasDateHelper(data[i][4]),
          default_credit_limit: Number(data[i][5]) || 2000,
          is_active_batch: data[i][6] === true || String(data[i][6]).toUpperCase() === 'TRUE' || String(data[i][6]) === '1'
        };
      }
    }
  }
  return null;
}

function isBatchGuardExpired(batchId) {
  const cfg = getBatchConfigRowData(batchId);
  if (!cfg || !cfg.end_date) return { allowed: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseGasDate(cfg.end_date);
  if (!end) return { allowed: true };
  end.setHours(23, 59, 59, 999);
  if (today > end) {
    return { allowed: false, reason: 'Batch period has ended (EXPIRED). No further salary top-ups, deductions, or payroll exports are allowed.' };
  }
  return { allowed: true };
}

function resolvePayrollMonth(scheduleSheet, payload) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const schedules = [];
  if (scheduleSheet) {
    try {
      const data = scheduleSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        schedules.push({
          month_key: String(data[i][0]).trim(),
          payday_date: formatGasDateHelper(data[i][2]),
          cutoff_date: formatGasDateHelper(data[i][3]),
          salary_base: Number(data[i][4]) || 0,
          auto_deduct_enabled: data[i][5] === true || String(data[i][5]).toUpperCase() === 'TRUE' || String(data[i][5]) === '1' || String(data[i][5] || '').trim() === '',
          status: String(data[i][6] || 'SCHEDULED')
        });
      }
    } catch (e) {}
  }

  if (payload && payload.month_period) {
    const found = schedules.find(s => s.month_key === String(payload.month_period));
    return { month_key: String(payload.month_period), salary_base: found ? found.salary_base : 0, schedule: found || null };
  }

  let best = null;
  for (let i = 0; i < schedules.length; i++) {
    const s = schedules[i];
    const cutoff = parseGasDate(s.cutoff_date);
    const payday = parseGasDate(s.payday_date);
    if (cutoff && cutoff <= today) {
      if (payday && payday >= today) { best = s; break; }
      if (!best) {
        best = s;
      } else {
        const prevCutoff = parseGasDate(best.cutoff_date);
        if (prevCutoff && cutoff > prevCutoff) best = s;
      }
    }
  }
  if (best) return { month_key: best.month_key, salary_base: best.salary_base, schedule: best };

  const nowKey = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  return { month_key: nowKey, salary_base: 0, schedule: null };
}
/**
 * 0. USER MANAGEMENT (CRUD บนตาราง Users ใน Master Sheet)
 */
function handleGetUsers() {
  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName('Users');
  if (!sheet) return { status: 'SUCCESS', data: [] };

  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      users.push({
        user_id: String(row[0]),
        username: String(row[1]),
        pin_hash: String(row[2]),
        full_name: String(row[3]),
        role: String(row[4]),
        seller_id: row[5] ? String(row[5]) : null,
        avatar_url: row[6] ? String(row[6]) : '',
        is_active: row[7] === true || row[7] === 'TRUE'
      });
    }
  }
  return { status: 'SUCCESS', data: users };
}

function handleCreateUser(user) {
  if (!user || !user.username || !user.pin_hash || !user.full_name) {
    return { status: 'ERROR', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
  }

  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Users');
  if (!sheet) {
    sheet = masterSS.insertSheet('Users');
    sheet.appendRow(['user_id', 'username', 'pin_hash', 'full_name', 'role', 'seller_id', 'avatar_url', 'is_active']);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(user.username)) {
      return { status: 'ERROR', message: `Username '${user.username}' มีอยู่ในระบบแล้ว` };
    }
  }

  const userId = user.user_id || ('USR-' + String(data.length).padStart(2, '0'));
  sheet.appendRow([
    userId,
    user.username,
    user.pin_hash,
    user.full_name,
    user.role || 'STAFF',
    user.seller_id || '',
    user.avatar_url || '',
    user.is_active !== undefined ? user.is_active : true
  ]);

  return { status: 'SUCCESS', message: 'User created successfully', user_id: userId };
}

function handleDeleteUser(userId) {
  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName('Users');
  if (!sheet) return { status: 'ERROR', message: 'Sheet Users not found' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      sheet.deleteRow(i + 1);
      return { status: 'SUCCESS', message: 'User deleted' };
    }
  }
  return { status: 'ERROR', message: 'User not found' };
}

function handleToggleUserActive(userId) {
  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName('Users');
  if (!sheet) return { status: 'ERROR', message: 'Sheet Users not found' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      const current = data[i][7] === true || data[i][7] === 'TRUE';
      const newVal = !current;
      sheet.getRange(i + 1, 8).setValue(newVal);
      return { status: 'SUCCESS', is_active: newVal };
    }
  }
  return { status: 'ERROR', message: 'User not found' };
}

function handleLogin(username, pin) {
  if (!username || !pin) {
    return { status: 'ERROR', message: 'กรุณากรอกชื่อผู้ใช้และรหัส PIN' };
  }

  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName('Users');
  if (!sheet) return { status: 'ERROR', message: 'Sheet Users not found' };

  const data = sheet.getDataRange().getValues();
  const normalizedUsername = String(username).trim().toLowerCase();
  const pinStr = String(pin).trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uName = String(row[1] || '').trim().toLowerCase();
    const uPin = String(row[2] || '').trim();

    if (uName === normalizedUsername && uPin === pinStr) {
      const isActive = row[7] === true || row[7] === 'TRUE';
      if (!isActive) {
        return { status: 'ERROR', message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน' };
      }

      return {
        status: 'SUCCESS',
        user: {
          user_id: String(row[0]),
          username: String(row[1]),
          full_name: String(row[3]),
          role: String(row[4]),
          seller_id: row[5] ? String(row[5]) : null,
          avatar_url: row[6] ? String(row[6]) : '',
          is_active: true
        }
      };
    }
  }

  return { status: 'ERROR', message: 'ชื่อผู้ใช้งานหรือรหัส PIN ไม่ถูกต้อง' };
}

function handleGetProducts() {
  const masterSS = getMasterSpreadsheet();
  const catSheet = masterSS.getSheetByName('Product_Catalog');
  if (!catSheet) return { status: 'SUCCESS', data: [] };

  const stockSheet = masterSS.getSheetByName('Inventory_Stocks');
  const stockMap = {};
  if (stockSheet) {
    const stockData = stockSheet.getDataRange().getValues();
    for (let s = 1; s < stockData.length; s++) {
      const sbc = String(stockData[s][0] || '').trim();
      if (sbc) {
        stockMap[sbc] = {
          stock_qty: Number(stockData[s][1]) || 0,
          cost_price: Number(stockData[s][2]) || 0,
          seller_id: stockData[s][3] ? String(stockData[s][3]).trim() : '',
          low_stock_threshold: Number(stockData[s][4]) || 5
        };
      }
    }
  }

  const data = catSheet.getDataRange().getValues();
  const products = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      const barcode = String(row[0]).trim();
      const stockInfo = stockMap[barcode] || { stock_qty: 0, cost_price: 0, seller_id: '', low_stock_threshold: 5 };
      products.push({
        barcode: barcode,
        product_name: String(row[1] || ''),
        image_url: row[2] ? String(row[2]) : '',
        unit_name: String(row[3] || 'ชิ้น'),
        selling_price: Number(row[4]) || 0,
        category: String(row[5] || 'ทั่วไป'),
        parent_barcode: row[6] ? String(row[6]) : null,
        conversion_factor: Number(row[7]) || 1,
        is_active: row[8] === true || String(row[8]).toUpperCase() === 'TRUE',
        stock_qty: stockInfo.stock_qty,
        cost_price: stockInfo.cost_price,
        seller_id: stockInfo.seller_id,
        low_stock_threshold: stockInfo.low_stock_threshold
      });
    }
  }
  return { status: 'SUCCESS', data: products };
}

function handleBatchImportProducts(payload) {
  const masterSS = getMasterSpreadsheet();
  let catalogSheet = masterSS.getSheetByName('Product_Catalog');
  let stockSheet = masterSS.getSheetByName('Inventory_Stocks');
  let stockInLogSheet = masterSS.getSheetByName('Stock_In_Logs');

  if (!catalogSheet) {
    catalogSheet = masterSS.insertSheet('Product_Catalog');
    catalogSheet.appendRow(['barcode', 'product_name', 'image_url', 'unit_name', 'selling_price', 'category', 'parent_barcode', 'conversion_factor', 'is_active']);
  }
  if (!stockSheet) {
    stockSheet = masterSS.insertSheet('Inventory_Stocks');
    stockSheet.appendRow(['barcode', 'stock_qty', 'cost_price', 'seller_id', 'low_stock_threshold']);
  }
  if (!stockInLogSheet) {
    stockInLogSheet = masterSS.insertSheet('Stock_In_Logs');
    stockInLogSheet.appendRow(['log_id', 'barcode', 'quantity_added', 'cost_price_unit', 'total_cost', 'seller_id', 'received_by', 'received_at', 'invoice_ref']);
  }

  const mode = (payload && payload.mode) || 'NEW_PRODUCTS';
  const conflictMode = (payload && payload.conflictMode) || 'SKIP_DUPLICATES';
  const items = (payload && (payload.products || payload.data)) || [];

  if (!items || items.length === 0) {
    return { status: 'ERROR', message: 'ไม่พบข้อมูลสินค้าที่ต้องการนำเข้า' };
  }

  const catalogData = catalogSheet.getDataRange().getValues();
  const catalogByBarcode = {};
  for (let i = 1; i < catalogData.length; i++) {
    const bc = String(catalogData[i][0] || '').trim();
    if (bc) catalogByBarcode[bc] = i + 1;
  }

  const stockData = stockSheet.getDataRange().getValues();
  const stockByBarcode = {};
  for (let s = 1; s < stockData.length; s++) {
    const sbc = String(stockData[s][0] || '').trim();
    if (sbc) stockByBarcode[sbc] = s + 1;
  }

  let countImported = 0;
  let countUpdated = 0;
  let countSkipped = 0;
  let countLogged = 0;

  const catalogRowsToAppend = [];
  const stockRowsToAppend = [];
  const logRowsToAppend = [];
  const nowStr = new Date().toISOString();

  if (mode === 'NEW_PRODUCTS') {
    for (let j = 0; j < items.length; j++) {
      const p = items[j];
      const barcode = String(p.barcode || '').trim();
      const productName = String(p.product_name || p.name || '').trim();
      if (!barcode || !productName) {
        countSkipped++;
        continue;
      }

      const imageUrl = p.image_url ? String(p.image_url).trim() : '';
      const unitName = String(p.unit_name || 'ชิ้น').trim();
      const sellingPrice = Number(p.selling_price) >= 0 ? Number(p.selling_price) : 0;
      const category = String(p.category || 'ทั่วไป').trim();
      const parentBarcode = p.parent_barcode ? String(p.parent_barcode).trim() : '';
      const conversionFactor = Number(p.conversion_factor) > 0 ? Number(p.conversion_factor) : 1;
      const isActive = p.is_active !== undefined ? (p.is_active === true || p.is_active === 'TRUE') : true;

      const costPrice = Number(p.cost_price) >= 0 ? Number(p.cost_price) : 0;
      const stockQty = Number(p.stock_qty) >= 0 ? Number(p.stock_qty) : 0;
      const sellerId = String(p.seller_id || 'S01').trim();
      const lowStockThreshold = Number(p.low_stock_threshold) >= 0 ? Number(p.low_stock_threshold) : 5;

      const existingCatRow = catalogByBarcode[barcode];
      const existingStockRow = stockByBarcode[barcode];

      if (existingCatRow) {
        if (conflictMode === 'UPSERT') {
          catalogSheet.getRange(existingCatRow, 1, 1, 9).setValues([[
            barcode, productName, imageUrl, unitName, sellingPrice, category, parentBarcode, conversionFactor, isActive
          ]]);
          if (!parentBarcode) {
            if (existingStockRow) {
              stockSheet.getRange(existingStockRow, 1, 1, 5).setValues([[
                barcode, stockQty, costPrice, sellerId, lowStockThreshold
              ]]);
            } else {
              stockRowsToAppend.push([barcode, stockQty, costPrice, sellerId, lowStockThreshold]);
              stockByBarcode[barcode] = stockData.length + stockRowsToAppend.length;
            }
          }
          countUpdated++;
        } else {
          countSkipped++;
        }
      } else {
        catalogRowsToAppend.push([barcode, productName, imageUrl, unitName, sellingPrice, category, parentBarcode, conversionFactor, isActive]);
        catalogByBarcode[barcode] = catalogData.length + catalogRowsToAppend.length;

        if (!parentBarcode) {
          if (!existingStockRow) {
            stockRowsToAppend.push([barcode, stockQty, costPrice, sellerId, lowStockThreshold]);
            stockByBarcode[barcode] = stockData.length + stockRowsToAppend.length;
          }

          if (stockQty > 0) {
            const logId = 'IN-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + String(Math.floor(1000 + Math.random() * 9000));
            logRowsToAppend.push([logId, barcode, stockQty, costPrice, stockQty * costPrice, sellerId, 'SYSTEM_IMPORT', nowStr, 'INITIAL_STOCK']);
            countLogged++;
          }
        }
        countImported++;
      }
    }
  } else if (mode === 'UPDATE_CATALOG') {
    for (let j = 0; j < items.length; j++) {
      const p = items[j];
      const barcode = String(p.barcode || '').trim();
      if (!barcode) {
        countSkipped++;
        continue;
      }
      const existingRow = catalogByBarcode[barcode];
      if (existingRow) {
        const productName = p.product_name !== undefined ? String(p.product_name).trim() : catalogData[existingRow - 1][1];
        const imageUrl = p.image_url !== undefined ? String(p.image_url).trim() : catalogData[existingRow - 1][2];
        const unitName = p.unit_name !== undefined ? String(p.unit_name).trim() : catalogData[existingRow - 1][3];
        const sellingPrice = p.selling_price !== undefined ? Number(p.selling_price) : catalogData[existingRow - 1][4];
        const category = p.category !== undefined ? String(p.category).trim() : catalogData[existingRow - 1][5];
        const parentBarcode = p.parent_barcode !== undefined ? String(p.parent_barcode).trim() : catalogData[existingRow - 1][6];
        const conversionFactor = p.conversion_factor !== undefined ? Number(p.conversion_factor) : catalogData[existingRow - 1][7];
        const isActive = p.is_active !== undefined ? (p.is_active === true || p.is_active === 'TRUE') : catalogData[existingRow - 1][8];

        catalogSheet.getRange(existingRow, 1, 1, 9).setValues([[
          barcode, productName, imageUrl, unitName, sellingPrice, category, parentBarcode, conversionFactor, isActive
        ]]);

        // Sync cost_price, seller_id, low_stock_threshold to Inventory_Stocks if provided
        if (p.cost_price !== undefined || p.seller_id !== undefined || p.low_stock_threshold !== undefined) {
          const stockSheet = getOrCreateInventoryStocksSheet();
          const stockData = stockSheet.getDataRange().getValues();
          let stockRow = -1;
          for (let s = 1; s < stockData.length; s++) {
            if (String(stockData[s][0] || '').trim() === barcode) {
              stockRow = s + 1;
              break;
            }
          }
          if (stockRow > 0) {
            if (p.cost_price !== undefined && p.cost_price !== '' && !isNaN(Number(p.cost_price))) {
              stockSheet.getRange(stockRow, 3).setValue(Number(p.cost_price));
            }
            if (p.seller_id !== undefined) {
              stockSheet.getRange(stockRow, 4).setValue(String(p.seller_id).trim());
            }
            if (p.low_stock_threshold !== undefined && !isNaN(Number(p.low_stock_threshold))) {
              stockSheet.getRange(stockRow, 5).setValue(Number(p.low_stock_threshold));
            }
          } else {
            const costVal = (p.cost_price !== undefined && p.cost_price !== '' && !isNaN(Number(p.cost_price))) ? Number(p.cost_price) : 0;
            const sellerVal = p.seller_id !== undefined ? String(p.seller_id).trim() : 'S01';
            const lowStockVal = (p.low_stock_threshold !== undefined && !isNaN(Number(p.low_stock_threshold))) ? Number(p.low_stock_threshold) : 5;
            stockSheet.appendRow([barcode, 0, costVal, sellerVal, lowStockVal]);
          }
        }
        countUpdated++;
      } else {
        if (conflictMode === 'UPSERT') {
          const productName = String(p.product_name || barcode).trim();
          const unitName = String(p.unit_name || 'ชิ้น').trim();
          const sellingPrice = Number(p.selling_price) >= 0 ? Number(p.selling_price) : 0;
          const category = String(p.category || 'ทั่วไป').trim();
          catalogRowsToAppend.push([barcode, productName, '', unitName, sellingPrice, category, '', 1, true]);
          catalogByBarcode[barcode] = catalogData.length + catalogRowsToAppend.length;
          countImported++;
        } else {
          countSkipped++;
        }
      }
    }
  } else if (mode === 'RESTOCK') {
    // Map catalog barcodes to parent_barcode and conversion_factor (including Product_UOM_Conversions)
    const catalogItemMeta = {};
    for (let c = 0; c < catalogData.length; c++) {
      const cRow = catalogData[c];
      const cBarcode = String(cRow[0] || '').trim();
      const pBarcode = String(cRow[6] || '').trim();
      const factor = Number(cRow[7]) || 1;
      catalogItemMeta[cBarcode] = {
        parent_barcode: pBarcode || cBarcode,
        conversion_factor: factor > 0 ? factor : 1
      };
    }

    const uomSheet = masterSS.getSheetByName('Product_UOM_Conversions');
    if (uomSheet) {
      const uomData = uomSheet.getDataRange().getValues();
      for (let u = 1; u < uomData.length; u++) {
        const uBarcode = String(uomData[u][1] || '').trim();
        const baseBarcode = String(uomData[u][2] || '').trim();
        const uFactor = Number(uomData[u][4]) || 1;
        if (uBarcode) {
          catalogItemMeta[uBarcode] = {
            parent_barcode: baseBarcode || uBarcode,
            conversion_factor: uFactor > 0 ? uFactor : 1
          };
        }
      }
    }

    for (let j = 0; j < items.length; j++) {
      const p = items[j];
      const rawBarcode = String(p.barcode || '').trim();
      const inputQty = Number(p.quantity_added !== undefined ? p.quantity_added : p.quantity || p.stock_qty) || 0;
      if (!rawBarcode || inputQty <= 0) {
        countSkipped++;
        continue;
      }

      // Check if this barcode is a pack/carton linked to a base item
      const meta = catalogItemMeta[rawBarcode] || { parent_barcode: rawBarcode, conversion_factor: 1 };
      const targetBarcode = meta.parent_barcode;
      const factor = meta.conversion_factor;
      const effectiveQtyAdded = inputQty * factor;

      const existingStockRow = stockByBarcode[targetBarcode];
      const costPriceUnit = Number(p.cost_price_unit !== undefined ? p.cost_price_unit : p.cost_price) >= 0 ? Number(p.cost_price_unit || p.cost_price) : 0;
      const sellerId = String(p.seller_id || (existingStockRow ? stockData[existingStockRow - 1][3] : 'S01')).trim();
      let invoiceRef = p.invoice_ref ? String(p.invoice_ref).trim() : 'RESTOCK_BATCH';
      if (targetBarcode !== rawBarcode) {
        invoiceRef += ' (Pack: ' + rawBarcode + ' x' + inputQty + ' @' + factor + ')';
      }
      const receivedBy = p.received_by ? String(p.received_by).trim() : 'ADMIN';

      if (existingStockRow) {
        const currentQty = Number(stockData[existingStockRow - 1][1]) || 0;
        const newQty = currentQty + effectiveQtyAdded;
        const updatedCost = costPriceUnit > 0 ? costPriceUnit : Number(stockData[existingStockRow - 1][2]) || 0;

        stockSheet.getRange(existingStockRow, 2, 1, 2).setValues([[newQty, updatedCost]]);
        stockData[existingStockRow - 1][1] = newQty;
        stockData[existingStockRow - 1][2] = updatedCost;

        const logId = 'IN-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + String(Math.floor(1000 + Math.random() * 9000));
        logRowsToAppend.push([logId, targetBarcode, effectiveQtyAdded, updatedCost, effectiveQtyAdded * updatedCost, sellerId, receivedBy, nowStr, invoiceRef]);
        countUpdated++;
        countLogged++;
      } else {
        stockRowsToAppend.push([targetBarcode, effectiveQtyAdded, costPriceUnit, sellerId, 5]);
        stockByBarcode[targetBarcode] = stockData.length + stockRowsToAppend.length;

        const logId = 'IN-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + String(Math.floor(1000 + Math.random() * 9000));
        logRowsToAppend.push([logId, targetBarcode, effectiveQtyAdded, costPriceUnit, effectiveQtyAdded * costPriceUnit, sellerId, receivedBy, nowStr, invoiceRef]);
        countImported++;
        countLogged++;
      }
    }
  }

  if (catalogRowsToAppend.length > 0) {
    catalogSheet.getRange(catalogSheet.getLastRow() + 1, 1, catalogRowsToAppend.length, 9).setValues(catalogRowsToAppend);
  }
  if (stockRowsToAppend.length > 0) {
    stockSheet.getRange(stockSheet.getLastRow() + 1, 1, stockRowsToAppend.length, 5).setValues(stockRowsToAppend);
  }
  if (logRowsToAppend.length > 0) {
    stockInLogSheet.getRange(stockInLogSheet.getLastRow() + 1, 1, logRowsToAppend.length, 9).setValues(logRowsToAppend);
  }

  return {
    status: 'SUCCESS',
    success: true,
    count_imported: countImported,
    count_updated: countUpdated,
    count_skipped: countSkipped,
    count_logged: countLogged,
    total_processed: items.length,
    message: `นำเข้าสินค้าสำเร็จ: เพิ่มใหม่ ${countImported} รายการ, อัปเดต ${countUpdated} รายการ, ข้าม ${countSkipped} รายการ, บันทึก Log ${countLogged} รายการ`
  };
}

function getOrCreateInventoryStocksSheet() {
  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Inventory_Stocks');
  if (!sheet) {
    sheet = masterSS.insertSheet('Inventory_Stocks');
    sheet.appendRow(['barcode', 'stock_qty', 'cost_price', 'seller_id', 'low_stock_threshold']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return sheet;
}

function getOrCreateStockInLogsSheet() {
  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Stock_In_Logs');
  if (!sheet) {
    sheet = masterSS.insertSheet('Stock_In_Logs');
    sheet.appendRow(['log_id', 'barcode', 'quantity_added', 'cost_price_unit', 'total_cost', 'seller_id', 'received_by', 'received_at', 'invoice_ref']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return sheet;
}

/**
 * RESTOCK / STOCK IN PRODUCT HANDLER
 * Supports base barcodes and multi-unit pack barcodes (from Product_UOM_Conversions)
 */
function handleStockInProduct(payload) {
  if (!payload || !payload.barcode || String(payload.barcode).trim() === '') {
    return { status: 'ERROR', success: false, message: 'กรุณาระบุบาร์โค้ดสินค้า (barcode)' };
  }

  const rawQty = Number(payload.quantity);
  if (isNaN(rawQty) || rawQty <= 0) {
    return { status: 'ERROR', success: false, message: 'จำนวนสินค้าต้องมากกว่า 0' };
  }

  const masterSS = getMasterSpreadsheet();
  const rawBarcode = String(payload.barcode).trim();
  const quantity = rawQty;
  const costPriceUnit = (payload.cost_price_unit !== undefined && payload.cost_price_unit !== '' && !isNaN(Number(payload.cost_price_unit)))
    ? Number(payload.cost_price_unit)
    : 0;
  const sellerId = payload.seller_id ? String(payload.seller_id).trim() : 'S01';
  let invoiceRef = payload.invoice_ref ? String(payload.invoice_ref).trim() : (payload.notes ? String(payload.notes).trim() : '');
  const receivedBy = payload.received_by ? String(payload.received_by).trim() : 'Admin';

  let baseBarcode = rawBarcode;
  let conversionFactor = 1;
  let packUnitName = '';
  let isPack = false;

  // 1. Search Product_UOM_Conversions first for matching barcode
  const uomSheet = masterSS.getSheetByName('Product_UOM_Conversions');
  if (uomSheet) {
    const uomData = uomSheet.getDataRange().getValues();
    for (let u = 1; u < uomData.length; u++) {
      const uRow = uomData[u];
      if (String(uRow[1] || '').trim() === rawBarcode) {
        baseBarcode = String(uRow[2] || '').trim() || rawBarcode;
        conversionFactor = Number(uRow[4]) > 0 ? Number(uRow[4]) : 1;
        packUnitName = String(uRow[3] || '').trim();
        isPack = true;
        break;
      }
    }
  }

  // Check Product_Catalog for product info and fallback pack conversion
  const catalogSheet = masterSS.getSheetByName('Product_Catalog');
  let productName = '';
  let baseUnitName = 'ชิ้น';

  if (catalogSheet) {
    const catalogData = catalogSheet.getDataRange().getValues();
    if (!isPack) {
      for (let c = 1; c < catalogData.length; c++) {
        const cRow = catalogData[c];
        if (String(cRow[0] || '').trim() === rawBarcode) {
          if (cRow[6] && String(cRow[6]).trim() !== '' && String(cRow[6]).trim() !== rawBarcode) {
            baseBarcode = String(cRow[6]).trim();
            conversionFactor = Number(cRow[7]) > 0 ? Number(cRow[7]) : 1;
            packUnitName = String(cRow[3] || '').trim();
            isPack = true;
          }
          break;
        }
      }
    }

    // 2. Search Product_Catalog to get product_name and base unit_name
    for (let c = 1; c < catalogData.length; c++) {
      const cRow = catalogData[c];
      if (String(cRow[0] || '').trim() === baseBarcode) {
        productName = String(cRow[1] || '').trim();
        baseUnitName = String(cRow[3] || 'ชิ้น').trim();
        break;
      }
    }

    if (!productName) {
      for (let c = 1; c < catalogData.length; c++) {
        const cRow = catalogData[c];
        if (String(cRow[0] || '').trim() === rawBarcode) {
          productName = String(cRow[1] || '').trim();
          baseUnitName = String(cRow[3] || 'ชิ้น').trim();
          break;
        }
      }
    }
  }

  // 3. Calculate total base units added
  const baseQuantityAdded = Math.round(quantity * conversionFactor);

  // 4. Find row in Inventory_Stocks for base_barcode
  const stockSheet = getOrCreateInventoryStocksSheet();
  const stockData = stockSheet.getDataRange().getValues();
  let stockRowIndex = -1;
  let previousStock = 0;
  let currentCost = costPriceUnit;
  let currentSeller = sellerId;

  for (let s = 1; s < stockData.length; s++) {
    if (String(stockData[s][0] || '').trim() === baseBarcode) {
      stockRowIndex = s + 1;
      previousStock = Number(stockData[s][1]) || 0;
      currentCost = Number(stockData[s][2]) || 0;
      currentSeller = String(stockData[s][3] || sellerId).trim();
      break;
    }
  }

  const newStock = previousStock + baseQuantityAdded;

  if (stockRowIndex > 0) {
    const updatedCost = (costPriceUnit > 0) ? costPriceUnit : currentCost;
    const updatedSeller = (payload.seller_id && String(payload.seller_id).trim() !== '') ? sellerId : currentSeller;

    stockSheet.getRange(stockRowIndex, 2).setValue(newStock);
    if (costPriceUnit > 0) {
      stockSheet.getRange(stockRowIndex, 3).setValue(updatedCost);
    }
    if (payload.seller_id && String(payload.seller_id).trim() !== '') {
      stockSheet.getRange(stockRowIndex, 4).setValue(updatedSeller);
    }
  } else {
    previousStock = 0;
    stockSheet.appendRow([baseBarcode, newStock, costPriceUnit, sellerId, 5]);
  }

  // 5. Generate unique log_id
  const logId = 'IN-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + String(Math.floor(1000 + Math.random() * 9000));

  // 6. Calculate total_cost
  const totalCost = baseQuantityAdded * costPriceUnit;

  // 7. Append row to Stock_In_Logs
  const stockInLogSheet = getOrCreateStockInLogsSheet();
  const receivedAt = new Date().toISOString();

  if (isPack && !invoiceRef) {
    invoiceRef = `Pack Restock: ${rawBarcode} (${packUnitName} x ${quantity} @ factor ${conversionFactor})`;
  }

  stockInLogSheet.appendRow([
    logId,
    baseBarcode,
    baseQuantityAdded,
    costPriceUnit,
    totalCost,
    sellerId,
    receivedBy,
    receivedAt,
    invoiceRef
  ]);

  // Look up seller name from Sellers sheet
  let sellerName = sellerId;
  const sellerSheet = masterSS.getSheetByName('Sellers');
  if (sellerSheet) {
    const sData = sellerSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      if (String(sData[i][0] || '').trim() === sellerId) {
        sellerName = String(sData[i][1] || sellerId).trim();
        break;
      }
    }
  }

  // 8. Return response
  const sellerDisplayStr = sellerName ? ` [ผู้ฝากขาย: ${sellerName}]` : '';
  const message = isPack
    ? `รับเข้าสต็อกสำเร็จ: ${productName || baseBarcode} (${packUnitName} x ${quantity}) = +${baseQuantityAdded} ${baseUnitName}${sellerDisplayStr} (คงเหลือ: ${newStock})`
    : `รับเข้าสต็อกสำเร็จ: ${productName || baseBarcode} +${baseQuantityAdded} ${baseUnitName}${sellerDisplayStr} (คงเหลือ: ${newStock})`;

  return {
    status: 'SUCCESS',
    success: true,
    log_id: logId,
    base_barcode: baseBarcode,
    scanned_barcode: rawBarcode,
    is_pack: isPack,
    pack_name: packUnitName || null,
    conversion_factor: conversionFactor,
    quantity_entered: quantity,
    base_quantity_added: baseQuantityAdded,
    previous_stock: previousStock,
    new_stock: newStock,
    cost_price: costPriceUnit,
    total_cost: totalCost,
    seller_id: sellerId,
    seller_name: sellerName,
    message: message
  };
}

/**
 * GET STOCK IN LOGS HANDLER
 * Retrieves stock-in history records enriched with product catalog and seller details.
 * Supports filtering by barcode, seller_id, date range, or date preset.
 */
function handleGetStockInLogs(params) {
  try {
    params = params || {};
    const masterSS = getMasterSpreadsheet();
    const stockInLogSheet = getOrCreateStockInLogsSheet();
    const catalogSheet = masterSS.getSheetByName('Product_Catalog');
    const sellerSheet = masterSS.getSheetByName('Sellers');

    // 1. Build catalog lookup map
    const catalogMap = {};
    if (catalogSheet) {
      const catData = catalogSheet.getDataRange().getValues();
      for (let c = 1; c < catData.length; c++) {
        const cRow = catData[c];
        const bc = String(cRow[0] || '').trim();
        if (bc) {
          catalogMap[bc] = {
            product_name: String(cRow[1] || '').trim(),
            image_url: cRow[2] ? String(cRow[2]).trim() : '',
            unit_name: String(cRow[3] || 'ชิ้น').trim(),
            category: String(cRow[5] || 'ทั่วไป').trim()
          };
        }
      }
    }

    // 2. Build seller lookup map
    const sellerMap = {};
    if (sellerSheet) {
      const sData = sellerSheet.getDataRange().getValues();
      for (let s = 1; s < sData.length; s++) {
        const sRow = sData[s];
        const sid = String(sRow[0] || '').trim();
        if (sid) {
          sellerMap[sid] = String(sRow[1] || sid).trim();
        }
      }
    }

    // 3. Resolve filter parameters
    const cleanParam = function(val) {
      return (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'undefined' && String(val).trim() !== 'null')
        ? String(val).trim()
        : '';
    };

    const filterBarcode = cleanParam(params.barcode);
    const filterSellerId = cleanParam(params.seller_id);
    const dateFrom = cleanParam(params.date_from);
    const dateTo = cleanParam(params.date_to);
    const datePreset = cleanParam(params.date_preset);

    let filterStartDate = null;
    let filterEndDate = null;

    if (dateFrom && dateTo) {
      const fromStr = dateFrom.includes('T') ? dateFrom : (dateFrom + 'T00:00:00+07:00');
      const toStr = dateTo.includes('T') ? dateTo : (dateTo + 'T23:59:59.999+07:00');
      filterStartDate = new Date(fromStr);
      filterEndDate = new Date(toStr);
    } else if (dateFrom) {
      const fromStr = dateFrom.includes('T') ? dateFrom : (dateFrom + 'T00:00:00+07:00');
      filterStartDate = new Date(fromStr);
    } else if (dateTo) {
      const toStr = dateTo.includes('T') ? dateTo : (dateTo + 'T23:59:59.999+07:00');
      filterEndDate = new Date(toStr);
    } else if (datePreset === 'today') {
      const todayStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
      filterStartDate = new Date(todayStr + 'T00:00:00+07:00');
      filterEndDate = new Date(todayStr + 'T23:59:59.999+07:00');
    } else if (datePreset === 'this_week') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startStr = Utilities.formatDate(sevenDaysAgo, 'Asia/Bangkok', 'yyyy-MM-dd');
      filterStartDate = new Date(startStr + 'T00:00:00+07:00');
      filterEndDate = new Date();
    } else if (datePreset === 'this_month') {
      const monthStartStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM') + '-01';
      filterStartDate = new Date(monthStartStr + 'T00:00:00+07:00');
      filterEndDate = new Date();
    }

    const hasStartFilter = filterStartDate && !isNaN(filterStartDate.getTime());
    const hasEndFilter = filterEndDate && !isNaN(filterEndDate.getTime());

    // 4. Fetch and filter Stock_In_Logs
    const logData = stockInLogSheet.getDataRange().getValues();
    const logs = [];

    for (let i = 1; i < logData.length; i++) {
      const row = logData[i];
      if (!row[0] && !row[1]) continue; // Skip blank rows

      const rowLogId = String(row[0] || '').trim();
      const rowBarcode = String(row[1] || '').trim();
      const rowSellerId = String(row[5] || '').trim();

      // Filter: barcode
      if (filterBarcode && rowBarcode !== filterBarcode) {
        continue;
      }

      // Filter: seller_id
      if (filterSellerId && rowSellerId !== filterSellerId) {
        continue;
      }

      // Resolve received_at
      let receivedAtStr = '';
      let rowTime = null;
      if (row[7] instanceof Date) {
        rowTime = row[7].getTime();
        receivedAtStr = row[7].toISOString();
      } else if (row[7] !== undefined && row[7] !== null && String(row[7]).trim() !== '') {
        receivedAtStr = String(row[7]).trim();
        const parsed = new Date(receivedAtStr);
        if (!isNaN(parsed.getTime())) {
          rowTime = parsed.getTime();
        }
      }

      // Filter: date range / preset
      if (hasStartFilter && (rowTime === null || rowTime < filterStartDate.getTime())) {
        continue;
      }
      if (hasEndFilter && (rowTime === null || rowTime > filterEndDate.getTime())) {
        continue;
      }

      const qtyAdded = Number(row[2]) || 0;
      const costUnit = Number(row[3]) || 0;
      const totalCost = (row[4] !== undefined && row[4] !== '' && !isNaN(Number(row[4])))
        ? Number(row[4])
        : (qtyAdded * costUnit);

      const catInfo = catalogMap[rowBarcode];
      const sellerName = sellerMap[rowSellerId] || rowSellerId;

      logs.push({
        log_id: rowLogId,
        barcode: rowBarcode,
        product_name: catInfo ? catInfo.product_name : '',
        unit_name: catInfo ? catInfo.unit_name : 'ชิ้น',
        category: catInfo ? catInfo.category : 'ทั่วไป',
        image_url: catInfo ? catInfo.image_url : '',
        quantity_added: qtyAdded,
        cost_price_unit: costUnit,
        total_cost: totalCost,
        seller_id: rowSellerId,
        seller_name: sellerName,
        received_by: String(row[6] || '').trim(),
        received_at: receivedAtStr,
        invoice_ref: (row[8] !== undefined && row[8] !== null) ? String(row[8]).trim() : ''
      });
    }

    // 5. Sort matching rows in reverse chronological order (newest received_at first)
    logs.sort(function(a, b) {
      const timeA = a.received_at ? new Date(a.received_at).getTime() : 0;
      const timeB = b.received_at ? new Date(b.received_at).getTime() : 0;
      return timeB - timeA;
    });

    // 6. Compute summary
    let totalQty = 0;
    let totalCostAmount = 0;
    for (let l = 0; l < logs.length; l++) {
      totalQty += logs[l].quantity_added;
      totalCostAmount += logs[l].total_cost;
    }

    return {
      status: 'SUCCESS',
      success: true,
      data: logs,
      summary: {
        total_logs: logs.length,
        total_quantity: totalQty,
        total_cost_amount: Math.round(totalCostAmount * 100) / 100
      }
    };
  } catch (error) {
    return {
      status: 'ERROR',
      success: false,
      message: error.toString(),
      data: [],
      summary: {
        total_logs: 0,
        total_quantity: 0,
        total_cost_amount: 0
      }
    };
  }
}

function handleGetSoldiers(batchId) {
  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) return { status: 'SUCCESS', data: [] };

  // P2-11: Aggregate ALLOWANCE / CASH monthly deductions per soldier from Credit_Logs
  // so the Welfare "other deductions" column reflects the full truth, not just salary cuts.
  const allowanceDeductionBySoldier = {};
  const cashDeductionBySoldier = {};
  try {
    const logSheet = getBatchSheet(batchId, 'Credit_Logs');
    if (logSheet) {
      const logData = logSheet.getDataRange().getValues();
      for (let i = 1; i < logData.length; i++) {
        const row = logData[i];
        if (String(row[2] || '').toUpperCase() !== 'MONTHLY_DEDUCTION') continue;
        const px = String(row[1] || '').trim();
        if (!px) continue;
        const wallet = String(row[3] || '').toUpperCase();
        const amt = Number(row[4]) || 0;
        if (wallet === 'ALLOWANCE') allowanceDeductionBySoldier[px] = (allowanceDeductionBySoldier[px] || 0) + amt;
        else if (wallet === 'CASH') cashDeductionBySoldier[px] = (cashDeductionBySoldier[px] || 0) + amt;
      }
    }
  } catch (e) {}

  const data = sheet.getDataRange().getValues();
  const soldiers = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      const px = String(row[0]);
      soldiers.push({
        soldier_id: px,
        px_code: px,
        national_id: String(row[1]),
        full_name: String(row[2]),
        unit: String(row[3]),
        credit_limit: Number(row[4]),
        deductions: Number(row[5]),
        credit_allowance_balance: Number(row[6]),
        credit_balance: Number(row[4]) - Number(row[6]),
        remaining_credit: Number(row[6]),
        cash_wallet_balance: Number(row[7]),
        cash_balance: Number(row[7]),
        photo_url: row[8] ? String(row[8]) : '',
        status: String(row[9]),
        allowance_deductions_total: Number(allowanceDeductionBySoldier[px] || 0),
        cash_deductions_total: Number(cashDeductionBySoldier[px] || 0)
      });
    }
  }
  return { status: 'SUCCESS', data: soldiers };
}

function handleBatchImportSoldiers(batchId, payload) {
  if (!batchId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัด (batchId)' };
  }
  const soldiers = (payload && (payload.soldiers || payload.data)) || [];
  const mode = (payload && payload.mode) || 'SKIP_DUPLICATES';
  if (!soldiers || soldiers.length === 0) {
    return { status: 'ERROR', message: 'ไม่พบข้อมูลทหารที่ต้องการนำเข้า' };
  }

  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) {
    return { status: 'ERROR', message: 'ไม่พบชีต Soldiers สำหรับผลัด ' + batchId };
  }

  const existingData = sheet.getDataRange().getValues();
  const existingByNationalId = {};
  const existingByPxCode = {};

  for (let i = 1; i < existingData.length; i++) {
    const px = String(existingData[i][0] || '').trim();
    const natId = String(existingData[i][1] || '').trim();
    if (px) existingByPxCode[px] = i + 1;
    if (natId) existingByNationalId[natId] = i + 1;
  }

  let countImported = 0;
  let countUpdated = 0;
  let countSkipped = 0;
  const rowsToAppend = [];

  for (let j = 0; j < soldiers.length; j++) {
    const s = soldiers[j];
    const pxCode = String(s.px_code || s.soldier_id || '').trim();
    const nationalId = String(s.national_id || '').trim();
    const fullName = String(s.full_name || s.name || '').trim();
    const unit = String(s.unit || '').trim() || 'ร้อย 1';
    const creditLimit = Number(s.credit_limit) >= 0 ? Number(s.credit_limit) : 1000;
    const deductions = Number(s.deductions) >= 0 ? Number(s.deductions) : 0;
    const creditAllowanceBalance = Number(s.credit_allowance_balance) >= 0 ? Number(s.credit_allowance_balance) : creditLimit;
    const cashWalletBalance = Number(s.cash_wallet_balance) >= 0 ? Number(s.cash_wallet_balance) : 0;
    const photoUrl = s.photo_url ? String(s.photo_url).trim() : '';
    const status = String(s.status || 'ACTIVE').toUpperCase();

    if (!pxCode || !fullName) {
      countSkipped++;
      continue;
    }

    const existingRow = (nationalId && existingByNationalId[nationalId]) || (pxCode && existingByPxCode[pxCode]);

    if (existingRow) {
      if (mode === 'UPSERT') {
        sheet.getRange(existingRow, 1, 1, 10).setValues([[
          pxCode,
          nationalId,
          fullName,
          unit,
          creditLimit,
          deductions,
          creditAllowanceBalance,
          cashWalletBalance,
          photoUrl,
          status
        ]]);
        countUpdated++;
      } else {
        countSkipped++;
      }
    } else {
      rowsToAppend.push([
        pxCode,
        nationalId,
        fullName,
        unit,
        creditLimit,
        deductions,
        creditAllowanceBalance,
        cashWalletBalance,
        photoUrl,
        status
      ]);
      if (pxCode) existingByPxCode[pxCode] = existingData.length + rowsToAppend.length;
      if (nationalId) existingByNationalId[nationalId] = existingData.length + rowsToAppend.length;
      countImported++;
    }
  }

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 10).setValues(rowsToAppend);
  }

  return {
    status: 'SUCCESS',
    success: true,
    batch_id: batchId,
    count_imported: countImported,
    count_updated: countUpdated,
    count_skipped: countSkipped,
    total_processed: soldiers.length,
    message: 'นำเข้าข้อมูลทหารผลัด ' + batchId + ' เรียบร้อย: เพิ่มใหม่ ' + countImported + ' นาย, อัปเดต ' + countUpdated + ' นาย, ข้าม ' + countSkipped + ' นาย'
  };
}

/**
 * Handle Save Single Soldier (Create or Update) in Batch-specific Sheet
 */
function handleSaveSoldier(batchId, payload) {
  if (!batchId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัด (batchId)' };
  }
  if (!payload || !payload.px_code || !payload.full_name) {
    return { status: 'ERROR', message: 'กรุณากรอกรหัส PX และชื่อ-นามสกุล' };
  }

  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) {
    return { status: 'ERROR', message: 'ไม่พบชีต Soldiers สำหรับผลัด ' + batchId };
  }

  const pxCode = String(payload.px_code).trim();
  const nationalId = String(payload.national_id || '').trim();
  const fullName = String(payload.full_name).trim();
  const unit = String(payload.unit || 'ร้อย 1').trim();
  const creditLimit = Number(payload.credit_limit) >= 0 ? Number(payload.credit_limit) : 2000;
  const deductions = Number(payload.deductions) >= 0 ? Number(payload.deductions) : 0;
  const photoUrl = payload.photo_url ? String(payload.photo_url).trim() : '';
  const status = String(payload.status || 'ACTIVE').toUpperCase();

  const data = sheet.getDataRange().getValues();
  let targetRow = -1;
  let oldCreditBal = creditLimit;
  let oldCashBal = 0;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === pxCode) {
      targetRow = i + 1;
      oldCreditBal = Number(data[i][6]) >= 0 ? Number(data[i][6]) : creditLimit;
      oldCashBal = Number(data[i][7]) >= 0 ? Number(data[i][7]) : 0;
      break;
    }
  }

  const creditAllowanceBalance = payload.credit_allowance_balance !== undefined
    ? Number(payload.credit_allowance_balance)
    : (targetRow !== -1 ? oldCreditBal : creditLimit);

  const cashWalletBalance = payload.cash_wallet_balance !== undefined
    ? Number(payload.cash_wallet_balance)
    : oldCashBal;

  if (targetRow !== -1) {
    // Update existing row
    sheet.getRange(targetRow, 1, 1, 10).setValues([[
      pxCode,
      nationalId,
      fullName,
      unit,
      creditLimit,
      deductions,
      creditAllowanceBalance,
      cashWalletBalance,
      photoUrl,
      status
    ]]);

    return {
      status: 'SUCCESS',
      success: true,
      message: 'อัปเดตข้อมูลพลทหาร ' + fullName + ' เรียบร้อยแล้ว',
      data: {
        px_code: pxCode,
        national_id: nationalId,
        full_name: fullName,
        unit: unit,
        credit_limit: creditLimit,
        deductions: deductions,
        credit_allowance_balance: creditAllowanceBalance,
        cash_wallet_balance: cashWalletBalance,
        photo_url: photoUrl,
        status: status
      }
    };
  } else {
    // Check if national_id already exists in another soldier in this batch
    if (nationalId) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim() === nationalId) {
          return { status: 'ERROR', message: 'เลขประจำตัวประชาชน ' + nationalId + ' ซ้ำกับทหารคนอื่นในผลัดนี้' };
        }
      }
    }

    // Append new soldier
    sheet.appendRow([
      pxCode,
      nationalId,
      fullName,
      unit,
      creditLimit,
      deductions,
      creditAllowanceBalance,
      cashWalletBalance,
      photoUrl,
      status
    ]);

    return {
      status: 'SUCCESS',
      success: true,
      message: 'เพิ่มพลทหาร ' + fullName + ' เข้าผลัด ' + batchId + ' เรียบร้อยแล้ว',
      data: {
        px_code: pxCode,
        national_id: nationalId,
        full_name: fullName,
        unit: unit,
        credit_limit: creditLimit,
        deductions: deductions,
        credit_allowance_balance: creditAllowanceBalance,
        cash_wallet_balance: cashWalletBalance,
        photo_url: photoUrl,
        status: status
      }
    };
  }
}

/**
 * Handle Delete Single Soldier from Batch-specific Sheet
 */
function handleDeleteSoldier(batchId, payload) {
  if (!batchId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัด (batchId)' };
  }
  const pxCode = payload && String(payload.px_code || payload.soldier_id || '').trim();
  if (!pxCode) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัส PX ของทหารที่ต้องการลบ' };
  }

  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) {
    return { status: 'ERROR', message: 'ไม่พบชีต Soldiers สำหรับผลัด ' + batchId };
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === pxCode) {
      sheet.deleteRow(i + 1);
      return {
        status: 'SUCCESS',
        success: true,
        message: 'ลบข้อมูลพลทหารรหัส ' + pxCode + ' ออกจากผลัด ' + batchId + ' เรียบร้อย'
      };
    }
  }

  return { status: 'ERROR', message: 'ไม่พบพลทหารรหัส ' + pxCode + ' ในผลัด ' + batchId };
}

/**
 * Handle Toggle / Update Soldier Status (ACTIVE / SUSPENDED / DISCHARGED)
 */
function handleToggleSoldierStatus(batchId, payload) {
  if (!batchId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัด (batchId)' };
  }
  const pxCode = payload && String(payload.px_code || payload.soldier_id || '').trim();
  const newStatus = payload && String(payload.status || 'ACTIVE').toUpperCase();
  if (!pxCode) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัส PX' };
  }

  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) {
    return { status: 'ERROR', message: 'ไม่พบชีต Soldiers สำหรับผลัด ' + batchId };
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === pxCode) {
      sheet.getRange(i + 1, 10).setValue(newStatus);
      return {
        status: 'SUCCESS',
        success: true,
        status_value: newStatus,
        message: 'ปรับปรุงสถานะพลทหาร ' + pxCode + ' เป็น ' + newStatus + ' เรียบร้อย'
      };
    }
  }

  return { status: 'ERROR', message: 'ไม่พบพลทหารรหัส ' + pxCode };
}

/**
 * Handle Upload Soldier Avatar Image to Google Drive
 * Standardized Naming: SOLDIER_{batchId}_{pxCode}_{timestamp}.{ext}
 */
function handleUploadSoldierImage(payload) {
  if (!payload || !payload.image_base64) {
    return { status: 'ERROR', success: false, message: 'ไม่พบข้อมูลไฟล์รูปภาพ (image_base64)' };
  }

  const batchId = String(payload.batch_id || 'GENERAL').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const pxCode = String(payload.px_code || 'UNKNOWN').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const mimeType = payload.mime_type || 'image/jpeg';
  let ext = 'jpg';
  if (mimeType.indexOf('png') !== -1) ext = 'png';
  else if (mimeType.indexOf('webp') !== -1) ext = 'webp';

  const timestamp = new Date().getTime();
  const standardizedName = 'SOLDIER_' + batchId + '_' + pxCode + '_' + timestamp + '.' + ext;

  // Resolve target folder
  let targetFolder = null;
  const folderId = payload.folder_id ? String(payload.folder_id).trim() : '';

  if (folderId) {
    try {
      targetFolder = DriveApp.getFolderById(folderId);
    } catch (e) {}
  }

  if (!targetFolder) {
    try {
      targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
    } catch (e) {
      targetFolder = DriveApp.getRootFolder();
    }
  }

  // Decode Base64
  let base64Data = payload.image_base64;
  if (base64Data.indexOf('base64,') !== -1) {
    base64Data = base64Data.split('base64,')[1];
  }

  const decodedBytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedBytes, mimeType, standardizedName);
  const file = targetFolder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  const fileId = file.getId();
  const directImageUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  return {
    status: 'SUCCESS',
    success: true,
    file_id: fileId,
    file_name: standardizedName,
    image_url: directImageUrl,
    web_view_link: file.getUrl(),
    message: 'อัปโหลดรูปประจำตัวทหารสำเร็จ'
  };
}

/**
 * Handle Batch Update Soldier Photo URLs in Sheet
 */
function handleBatchUpdateSoldierPhotos(batchId, payload) {
  if (!batchId) {
    return { status: 'ERROR', success: false, message: 'กรุณาระบุรหัสผลัด (batchId)' };
  }
  const updates = (payload && (payload.updates || payload.data)) || [];
  if (!updates || updates.length === 0) {
    return { status: 'ERROR', success: false, message: 'ไม่พบรายการอัปเดต' };
  }

  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) {
    return { status: 'ERROR', success: false, message: 'ไม่พบชีต Soldiers สำหรับผลัด ' + batchId };
  }

  const data = sheet.getDataRange().getValues();
  const rowMap = {};
  for (let i = 1; i < data.length; i++) {
    const px = String(data[i][0] || '').trim();
    if (px) rowMap[px] = i + 1;
  }

  let updatedCount = 0;
  for (let j = 0; j < updates.length; j++) {
    const item = updates[j];
    const pxCode = String(item.px_code || '').trim();
    const photoUrl = String(item.photo_url || '').trim();
    const rowIdx = rowMap[pxCode];
    if (rowIdx && photoUrl) {
      sheet.getRange(rowIdx, 9).setValue(photoUrl);
      updatedCount++;
    }
  }

  return {
    status: 'SUCCESS',
    success: true,
    batch_id: batchId,
    updated_count: updatedCount,
    message: 'อัปเดตรูปถ่ายพลทหารเรียบร้อย ' + updatedCount + ' นาย'
  };
}

/**
 * Handle Scan Google Drive Folder for Soldier Photos & Auto Match
 */
function handleScanDriveFolderForSoldierPhotos(batchId, payload) {
  if (!batchId) {
    return { status: 'ERROR', success: false, message: 'กรุณาระบุรหัสผลัด (batchId)' };
  }
  const folderId = payload && payload.folder_id ? String(payload.folder_id).trim() : '';
  if (!folderId) {
    return { status: 'ERROR', success: false, message: 'กรุณาระบุรหัสโฟลเดอร์ Google Drive (folder_id)' };
  }

  let folder = null;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (err) {
    return { status: 'ERROR', success: false, message: 'ไม่สามารถเข้าถึงโฟลเดอร์ Drive ได้: ' + err.toString() };
  }

  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) {
    return { status: 'ERROR', success: false, message: 'ไม่พบชีต Soldiers สำหรับผลัด ' + batchId };
  }

  const data = sheet.getDataRange().getValues();
  const soldiers = [];
  const pxMap = {};
  const natMap = {};
  const nameMap = {};

  for (let i = 1; i < data.length; i++) {
    const px = String(data[i][0] || '').trim();
    const nat = String(data[i][1] || '').trim();
    const name = String(data[i][2] || '').trim().replace(/^(พลฯ|พลทหาร|นาย|ส\.ต\.|จ\.ส\.อ\.)\s*/g, '');
    const rowIndex = i + 1;
    if (px) {
      soldiers.push({ px_code: px, national_id: nat, full_name: String(data[i][2] || '').trim(), rowIndex: rowIndex });
      pxMap[px.toLowerCase()] = rowIndex;
      if (nat) natMap[nat] = rowIndex;
      if (name) nameMap[name.toLowerCase()] = rowIndex;
    }
  }

  const files = folder.getFiles();
  const matchedList = [];
  let matchedCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    if (mime.indexOf('image/') === -1) continue;

    const fileName = file.getName();
    const baseName = fileName.replace(/\.[^/.]+$/, '').trim().toLowerCase();

    let targetRow = null;
    let matchedPx = '';

    // Match 1: By PX Code
    for (const px in pxMap) {
      if (baseName.indexOf(px) !== -1 || px.indexOf(baseName) !== -1) {
        targetRow = pxMap[px];
        matchedPx = px;
        break;
      }
    }

    // Match 2: By National ID (13 digits)
    if (!targetRow) {
      const idMatch = baseName.match(/\d{13}/);
      if (idMatch && natMap[idMatch[0]]) {
        targetRow = natMap[idMatch[0]];
      }
    }

    // Match 3: By Name
    if (!targetRow) {
      for (const name in nameMap) {
        if (name && (baseName.indexOf(name) !== -1 || name.indexOf(baseName) !== -1)) {
          targetRow = nameMap[name];
          break;
        }
      }
    }

    if (targetRow) {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}

      const directUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
      sheet.getRange(targetRow, 9).setValue(directUrl);
      matchedCount++;

      matchedList.push({
        file_name: fileName,
        image_url: directUrl,
        row_index: targetRow
      });
    }
  }

  return {
    status: 'SUCCESS',
    success: true,
    batch_id: batchId,
    folder_id: folderId,
    matched_count: matchedCount,
    matched: matchedList,
    message: 'สแกนรูปในโฟลเดอร์สำเร็จ จับคู่และอัปเดตรูปทหารได้ ' + matchedCount + ' นาย'
  };
}

function formatGasDateHelper(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return Utilities.formatDate(val, 'Asia/Bangkok', 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
    }
  } catch (e) {}
  return str;
}

function handleGetBatches() {
  const masterSS = getMasterSpreadsheet();
  const configSheet = masterSS.getSheetByName('Batch_Config');
  const batches = [];

  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && String(row[0]).trim() !== '') {
        const batchId = String(row[0]).trim();
        const sheetId = row[2] ? String(row[2]).trim() : '';
        let resolvedName = row[1] ? String(row[1]).trim() : ('ผลัด ' + batchId);
        
        // Try getting real spreadsheet name if sheetId is provided
        if (sheetId && (!row[1] || String(row[1]).trim() === '')) {
          try {
            const ss = SpreadsheetApp.openById(sheetId);
            resolvedName = ss.getName();
          } catch (e) {}
        }

        batches.push({
          batch_id: batchId,
          batch_name: resolvedName,
          spreadsheet_id: sheetId,
          start_date: formatGasDateHelper(row[3]),
          end_date: formatGasDateHelper(row[4]),
          default_credit_limit: Number(row[5]) || 2000,
          is_active_batch: row[6] === true || String(row[6]).toUpperCase() === 'TRUE' || String(row[6]) === '1'
        });
      }
    }
  }

  return { status: 'SUCCESS', data: batches };
}

/**
 * DRIVE FOLDER MANAGEMENT HANDLERS
 */

function extractFolderId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const matchFolders = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolders && matchFolders[1]) return matchFolders[1];
  const matchId = str.match(/id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  return str;
}

function getOrCreateDriveFoldersSheet() {
  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Drive_Folders');
  if (!sheet) {
    sheet = masterSS.insertSheet('Drive_Folders');
    sheet.appendRow(['folder_id', 'folder_name', 'folder_url', 'parent_folder_id', 'is_linked', 'created_at']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  } else {
    // Ensure header column 5 is named 'is_linked'
    try {
      const headerVal = String(sheet.getRange(1, 5).getValue() || '');
      if (headerVal !== 'is_linked') {
        sheet.getRange(1, 5).setValue('is_linked');
      }
    } catch (e) {}
  }
  return sheet;
}

function handleGetDriveFolders() {
  const sheet = getOrCreateDriveFoldersSheet();
  const data = sheet.getDataRange().getValues();
  const folders = [];
  const seenIds = {};

  if (data.length <= 1) {
    return { status: 'SUCCESS', data: [] };
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let folderId = String(row[0] || '').trim();
    if (folderId !== '') {
      // Auto-migrate old root folder ID if present
      if (folderId === '1rg4IQR-f18R4sDWpNiN73bmLAVRFyY29') {
        folderId = DEFAULT_PX_ROOT_FOLDER_ID;
        let newName = 'Px pos';
        let newUrl = 'https://drive.google.com/drive/folders/' + folderId;
        try {
          const f = DriveApp.getFolderById(folderId);
          newName = f.getName();
          newUrl = f.getUrl();
        } catch (e) {}
        sheet.getRange(i + 1, 1).setValue(folderId);
        sheet.getRange(i + 1, 2).setValue(newName);
        sheet.getRange(i + 1, 3).setValue(newUrl);
        row[0] = folderId;
        row[1] = newName;
        row[2] = newUrl;
      }

      // Skip duplicate folder_id in sheet
      if (seenIds[folderId]) {
        continue;
      }
      seenIds[folderId] = true;

      // Check live Drive existence
      let driveStatus = 'ONLINE';
      let driveStatusMsg = 'ปกติใน Google Drive';
      let resolvedName = String(row[1] || '');
      let resolvedUrl = String(row[2] || '');

      try {
        const liveFolder = DriveApp.getFolderById(folderId);
        if (liveFolder.isTrashed()) {
          driveStatus = 'TRASHED';
          driveStatusMsg = 'อยู่ในถังขยะ Google Drive';
        } else {
          driveStatus = 'ONLINE';
          driveStatusMsg = 'ปกติใน Google Drive';
          resolvedName = liveFolder.getName();
          resolvedUrl = liveFolder.getUrl();
        }
      } catch (err) {
        const errStr = err.toString();
        if (errStr.indexOf('not found') !== -1 || errStr.indexOf('No item with the given ID') !== -1 || errStr.indexOf('ไม่พบ') !== -1) {
          driveStatus = 'DELETED';
          driveStatusMsg = 'ไม่พบโฟลเดอร์นี้ใน Google Drive (ถูกลบแล้ว)';
        } else if (errStr.indexOf('สิทธิ์') !== -1 || errStr.indexOf('permission') !== -1 || errStr.indexOf('Access') !== -1) {
          driveStatus = 'ACCESS_DENIED';
          driveStatusMsg = 'ไม่ได้รับอนุญาตให้เข้าถึงโฟลเดอร์นี้';
        } else {
          driveStatus = 'ERROR';
          driveStatusMsg = 'ไม่สามารถตรวจสอบได้: ' + errStr;
        }
      }

      const isLinked = row[4] === true || String(row[4]).toUpperCase() === 'TRUE' || String(row[4]) === '1';
      folders.push({
        folder_id: folderId,
        folder_name: resolvedName,
        folder_url: resolvedUrl,
        parent_folder_id: String(row[3] || ''),
        is_linked: isLinked,
        is_default: isLinked,
        drive_status: driveStatus,
        drive_status_message: driveStatusMsg,
        created_at: row[5] ? String(row[5]) : ''
      });
    }
  }

  return { status: 'SUCCESS', data: folders };
}

function handleCreateDriveFolder(payload) {
  if (!payload || !payload.folder_name || String(payload.folder_name).trim() === '') {
    return { status: 'ERROR', message: 'กรุณาระบุชื่อโฟลเดอร์ (folder_name)' };
  }
  const folderName = String(payload.folder_name).trim();
  const parentFolderId = payload.parent_folder_id ? String(payload.parent_folder_id).trim() : DEFAULT_PX_ROOT_FOLDER_ID;

  let parentFolder;
  try {
    parentFolder = DriveApp.getFolderById(parentFolderId);
  } catch (err) {
    return { status: 'ERROR', message: 'ไม่สามารถเปิดโฟลเดอร์หลักได้: ' + err.toString() };
  }

  const newFolder = parentFolder.createFolder(folderName);
  const folderId = newFolder.getId();
  const folderUrl = newFolder.getUrl();
  const resolvedName = newFolder.getName();
  const nowStr = new Date().toISOString();

  const sheet = getOrCreateDriveFoldersSheet();
  sheet.appendRow([folderId, resolvedName, folderUrl, parentFolderId, true, nowStr]);

  return {
    status: 'SUCCESS',
    success: true,
    folder_id: folderId,
    folder_name: resolvedName,
    folder_url: folderUrl,
    is_linked: true,
    message: 'สร้างโฟลเดอร์ใน Google Drive และผูกใช้งานสำเร็จ'
  };
}

function handleLinkDriveFolder(payload) {
  const input = payload && (payload.folder_url_or_id || payload.folder_id || payload.folder_url);
  if (!input || String(input).trim() === '') {
    return { status: 'ERROR', message: 'กรุณาระบุ URL หรือ ID ของโฟลเดอร์ Google Drive' };
  }

  const folderId = extractFolderId(input);
  if (!folderId) {
    return { status: 'ERROR', message: 'ไม่สามารถระบุ Folder ID จากข้อมูลที่ระบุได้' };
  }

  const sheet = getOrCreateDriveFoldersSheet();
  const data = sheet.getDataRange().getValues();

  // Check if folder is already linked
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === folderId) {
      sheet.getRange(i + 1, 5).setValue(true);
      return {
        status: 'SUCCESS',
        success: true,
        is_duplicate: true,
        folder_id: folderId,
        folder_name: String(data[i][1]),
        folder_url: String(data[i][2]),
        is_linked: true,
        message: 'โฟลเดอร์นี้มีอยู่ในระบบแล้ว (อัปเดตสถานะเป็นผูกใช้งาน)'
      };
    }
  }

  let folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (err) {
    return { status: 'ERROR', message: 'ไม่สามารถเข้าถึงโฟลเดอร์ Google Drive ได้: ' + err.toString() };
  }

  const folderName = (payload.folder_name && String(payload.folder_name).trim() !== '') ? String(payload.folder_name).trim() : folder.getName();
  const folderUrl = folder.getUrl();

  const nowStr = new Date().toISOString();
  sheet.appendRow([folderId, folderName, folderUrl, '', true, nowStr]);

  return {
    status: 'SUCCESS',
    success: true,
    folder_id: folderId,
    folder_name: folderName,
    folder_url: folderUrl,
    is_linked: true,
    message: 'เชื่อมโยงโฟลเดอร์ Google Drive สำเร็จ'
  };
}

function handleToggleLinkDriveFolder(payload) {
  if (!payload || !payload.folder_id) {
    return { status: 'ERROR', message: 'กรุณาระบุ folder_id' };
  }
  const folderId = String(payload.folder_id).trim();
  const sheet = getOrCreateDriveFoldersSheet();
  const data = sheet.getDataRange().getValues();
  let found = false;
  let newStatus = true;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === folderId) {
      if (typeof payload.is_linked === 'boolean') {
        newStatus = payload.is_linked;
      } else {
        const currentVal = data[i][4] === true || String(data[i][4]).toUpperCase() === 'TRUE' || String(data[i][4]) === '1';
        newStatus = !currentVal;
      }
      sheet.getRange(i + 1, 5).setValue(newStatus);
      found = true;
      break;
    }
  }

  if (!found) {
    return { status: 'ERROR', message: 'ไม่พบโฟลเดอร์ที่ระบุในรายการ' };
  }

  return {
    status: 'SUCCESS',
    success: true,
    folder_id: folderId,
    is_linked: newStatus,
    message: newStatus ? 'ผูกโฟลเดอร์ใช้งานสำเร็จ (TRUE)' : 'ยกเลิกการผูกโฟลเดอร์เรียบร้อย (FALSE)'
  };
}

function handleSetDefaultDriveFolder(payload) {
  return handleToggleLinkDriveFolder(payload);
}

function handleDeleteDriveFolder(payload) {
  if (!payload || !payload.folder_id) {
    return { status: 'ERROR', message: 'กรุณาระบุ folder_id' };
  }
  const folderId = String(payload.folder_id).trim();
  const sheet = getOrCreateDriveFoldersSheet();
  const data = sheet.getDataRange().getValues();
  let deleted = false;

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === folderId) {
      sheet.deleteRow(i + 1);
      deleted = true;
    }
  }

  if (!deleted) {
    return { status: 'ERROR', message: 'ไม่พบโฟลเดอร์ที่ต้องการลบในรายการ' };
  }

  return {
    status: 'SUCCESS',
    success: true,
    folder_id: folderId,
    message: 'ลบรายการโฟลเดอร์สำเร็จ'
  };
}

function handleCreateBatchSheet(payload) {
  if (!payload || !payload.batch_id || String(payload.batch_id).trim() === '') {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัด (batch_id)' };
  }

  const batchId = String(payload.batch_id).trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const batchName = payload.batch_name ? String(payload.batch_name).trim() : ('ผลัด ' + batchId);
  const creditLimit = Number(payload.default_credit_limit) || 1000;
  const startDate = payload.start_date || new Date().toISOString().split('T')[0];
  const endDate = payload.end_date || '';

  // Determine target Google Drive folder
  let targetFolderId = payload.target_folder_id ? String(payload.target_folder_id).trim() : '';
  if (!targetFolderId) {
    // Fallback: look for is_default in Drive_Folders
    try {
      const driveFoldersRes = handleGetDriveFolders();
        const validFolder = driveFoldersRes.data.find(function(f) { return (f.is_linked || f.is_default) && f.drive_status === 'ONLINE'; }) ||
                            driveFoldersRes.data.find(function(f) { return f.drive_status === 'ONLINE'; });
        if (validFolder && validFolder.folder_id) {
          targetFolderId = validFolder.folder_id;
        } else if (driveFoldersRes.data[0]) {
          targetFolderId = driveFoldersRes.data[0].folder_id;
        }
    } catch (e) {}
  }
  if (!targetFolderId) {
    targetFolderId = DEFAULT_PX_ROOT_FOLDER_ID || BATCH_FOLDER_ID;
  }

  // Check if batch already exists in Batch_Config
  const masterSS = getMasterSpreadsheet();
  let configSheet = masterSS.getSheetByName('Batch_Config');
  if (!configSheet) {
    configSheet = masterSS.insertSheet('Batch_Config');
    configSheet.appendRow(['batch_id', 'batch_name', 'spreadsheet_id', 'start_date', 'end_date', 'default_credit_limit', 'is_active_batch', 'created_at']);
    configSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  } else {
    const existingData = configSheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (String(existingData[i][0]).trim().toLowerCase() === batchId.toLowerCase()) {
        return { status: 'ERROR', message: 'รหัสผลัด ' + batchId + ' มีอยู่ในระบบแล้ว' };
      }
    }
  }

  // 1. Resolve Target Google Drive folder (with fallback to default PX root)
  let targetFolder = null;
  let targetFolderName = '';
  let targetFolderUrl = '';

  if (targetFolderId) {
    try {
      targetFolder = DriveApp.getFolderById(targetFolderId);
      if (targetFolder.isTrashed()) {
        targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
      }
    } catch (e) {
      try {
        targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
      } catch (e2) {}
    }
  } else {
    try {
      targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
    } catch (e) {}
  }

  // Create New Spreadsheet
  const newTitle = 'PX_Batch_' + batchId;
  const newSS = SpreadsheetApp.create(newTitle);
  const newSpreadsheetId = newSS.getId();

  if (targetFolder) {
    try {
      const file = DriveApp.getFileById(newSpreadsheetId);
      file.moveTo(targetFolder);
      targetFolderName = targetFolder.getName();
      targetFolderUrl = targetFolder.getUrl();
    } catch (err) {
      console.warn('Could not move file to folder: ' + err.toString());
    }
  }

  // 2. Provision 8 Tables with Canonical Standard Headers
  const tables = [
    { name: 'Soldiers_' + batchId, headers: CANONICAL_BATCH_HEADERS.Soldiers },
    { name: 'Orders_' + batchId, headers: CANONICAL_BATCH_HEADERS.Orders },
    { name: 'Order_Splits_' + batchId, headers: CANONICAL_BATCH_HEADERS.Order_Splits },
    { name: 'Order_Items_' + batchId, headers: CANONICAL_BATCH_HEADERS.Order_Items },
    { name: 'Credit_Logs_' + batchId, headers: CANONICAL_BATCH_HEADERS.Credit_Logs },
    { name: 'Shifts_' + batchId, headers: CANONICAL_BATCH_HEADERS.Shifts },
    { name: 'Payroll_Settlement_' + batchId, headers: CANONICAL_BATCH_HEADERS.Payroll_Settlement },
    { name: 'Void_Logs_' + batchId, headers: CANONICAL_BATCH_HEADERS.Void_Logs },
    { name: 'Payroll_Schedules_' + batchId, headers: CANONICAL_BATCH_HEADERS.Payroll_Schedules },
    { name: 'Deduction_Configs_' + batchId, headers: CANONICAL_BATCH_HEADERS.Deduction_Configs },
    { name: 'Deduction_History_' + batchId, headers: CANONICAL_BATCH_HEADERS.Deduction_History }
  ];

  tables.forEach(function(t) {
    const sheet = newSS.insertSheet(t.name);
    sheet.appendRow(t.headers);
    sheet.getRange(1, 1, 1, t.headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  });

  // Remove default Sheet1 if exists
  const defaultSheet = newSS.getSheetByName('Sheet1') || newSS.getSheetByName('ชีต1');
  if (defaultSheet && newSS.getSheets().length > 1) {
    newSS.deleteSheet(defaultSheet);
  }

  // 3. Register into Master Sheet Batch_Config
  const nowStr = new Date().toISOString();
  configSheet.appendRow([batchId, batchName, newSpreadsheetId, startDate, endDate, creditLimit, true, nowStr]);

  return {
    status: 'SUCCESS',
    success: true,
    batch_id: batchId,
    batch_name: batchName,
    spreadsheet_id: newSpreadsheetId,
    sheet_url: newSS.getUrl(),
    folder_id: targetFolder ? targetFolder.getId() : targetFolderId,
    folder_name: targetFolderName,
    folder_url: targetFolderUrl,
    tables_created: 8,
    message: 'สร้าง Google Sheet ผลัดเรียบร้อย'
  };
}

function handleDeleteBatchSheet(payload) {
  if (!payload || !payload.batch_id || String(payload.batch_id).trim() === '') {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัดที่ต้องการลบ (batch_id)' };
  }

  const batchId = String(payload.batch_id).trim();
  const deleteFile = payload.delete_file === true || payload.deleteFile === true;
  let spreadsheetIdToDelete = payload.spreadsheet_id ? String(payload.spreadsheet_id).trim() : '';

  const masterSS = getMasterSpreadsheet();
  const configSheet = masterSS.getSheetByName('Batch_Config');
  let rowIndexToDelete = -1;

  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === batchId.toLowerCase()) {
        rowIndexToDelete = i + 1; // 1-indexed for Sheet row
        if (!spreadsheetIdToDelete && data[i][2]) {
          spreadsheetIdToDelete = String(data[i][2]).trim();
        }
        break;
      }
    }
  }

  // Fallback for legacy 2569_1 spreadsheet ID
  if (!spreadsheetIdToDelete && (batchId === '2569_1' || batchId === 'PX_Batch_2569_1')) {
    spreadsheetIdToDelete = BATCH_2569_1_SPREADSHEET_ID;
  }

  // 1. Delete row from Batch_Config if found
  if (configSheet && rowIndexToDelete !== -1) {
    configSheet.deleteRow(rowIndexToDelete);
  }

  // 2. Optionally move Google Sheet to Trash in Google Drive
  let fileTrashed = false;
  if (deleteFile && spreadsheetIdToDelete) {
    try {
      const file = DriveApp.getFileById(spreadsheetIdToDelete);
      file.setTrashed(true);
      fileTrashed = true;
    } catch (e) {
      console.warn('Could not trash file: ' + e.toString());
    }
  }

  return {
    status: 'SUCCESS',
    success: true,
    batch_id: batchId,
    file_trashed: fileTrashed,
    message: 'ลบผลัด ' + batchId + ' เรียบร้อย' + (fileTrashed ? ' (ย้ายไฟล์ชีตลงถังขยะ Google Drive แล้ว)' : '')
  };
}

function getOrCreateSellersSheet() {
  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Sellers');
  if (!sheet) {
    sheet = masterSS.insertSheet('Sellers');
    sheet.appendRow(['seller_id', 'seller_name', 'contact_info', 'default_fee_pct', 'avatar_url', 'is_active']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return sheet;
}

function handleGetSellers() {
  const masterSS = getMasterSpreadsheet();
  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();
  const sellersMap = {};
  const sellers = [];

  // 1. Load from registered Sellers sheet
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sellerId = String(row[0] || '').trim();
    if (sellerId) {
      const isAct = row[5] === true || row[5] === 'TRUE' || String(row[5]).toUpperCase() === 'TRUE';
      const item = {
        seller_id: sellerId,
        seller_name: String(row[1] || sellerId),
        contact_info: row[2] ? String(row[2]) : '',
        default_fee_pct: Number(row[3]) || 0,
        avatar_url: row[4] ? String(row[4]) : '',
        is_active: isAct
      };
      sellersMap[sellerId] = item;
      sellers.push(item);
    }
  }

  // 2. Load from Users sheet: include active ADMIN and SELLER users
  const userSheet = masterSS.getSheetByName('Users');
  if (userSheet) {
    const userData = userSheet.getDataRange().getValues();
    for (let i = 1; i < userData.length; i++) {
      const uRow = userData[i];
      const userId = String(uRow[0] || '').trim();
      const username = String(uRow[1] || '').trim();
      const fullName = String(uRow[3] || '').trim();
      const role = String(uRow[4] || '').toUpperCase().trim();
      const userSellerId = String(uRow[5] || '').trim();
      const isUserActive = uRow[7] === true || uRow[7] === 'TRUE' || String(uRow[7]).toUpperCase() === 'TRUE';

      if (isUserActive && (role === 'SELLER' || role === 'ADMIN')) {
        const targetId = userSellerId || userId;
        if (!sellersMap[targetId]) {
          const roleLabel = role === 'ADMIN' ? ' (Admin/ผู้ดูแล)' : ' (ผู้ขาย)';
          const sellerObj = {
            seller_id: targetId,
            seller_name: fullName ? `${fullName}${roleLabel}` : `${username}${roleLabel}`,
            contact_info: username,
            default_fee_pct: 0,
            avatar_url: uRow[6] ? String(uRow[6]) : '',
            is_active: true
          };
          sellersMap[targetId] = sellerObj;
          sellers.push(sellerObj);
        }
      }
    }
  }

  return { status: 'SUCCESS', data: sellers };
}

function handleCreateSeller(payload) {
  if (!payload || !payload.seller_name) {
    return { status: 'ERROR', message: 'กรุณาระบุชื่อผู้ฝากขาย' };
  }

  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();

  let sellerId = (payload.seller_id || '').toString().trim().toUpperCase();
  if (!sellerId) {
    let maxNum = 0;
    for (let r = 1; r < data.length; r++) {
      const id = (data[r][0] || '').toString().toUpperCase();
      const m = id.match(/^S(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    sellerId = 'S' + ('0' + (maxNum + 1)).slice(-2);
  }

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === sellerId) {
      return { status: 'ERROR', message: 'รหัสผู้ฝากขาย ' + sellerId + ' มีอยู่ในระบบแล้ว' };
    }
  }

  const row = [
    sellerId,
    payload.seller_name.trim(),
    payload.contact_info || '',
    Number(payload.default_fee_pct) || 0,
    payload.avatar_url || '',
    payload.is_active !== false
  ];

  sheet.appendRow(row);
  return { 
    status: 'SUCCESS', 
    data: {
      seller_id: sellerId,
      seller_name: payload.seller_name.trim(),
      contact_info: payload.contact_info || '',
      default_fee_pct: Number(payload.default_fee_pct) || 0,
      avatar_url: payload.avatar_url || '',
      is_active: payload.is_active !== false
    }
  };
}

function handleUpdateSeller(sellerId, updates) {
  if (!sellerId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผู้ฝากขายที่ต้องการแก้ไข' };
  }

  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (sellerId || '').toUpperCase()) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบผู้ฝากขายรหัส ' + sellerId };
  }

  const payload = updates || {};
  if (payload.seller_name !== undefined) sheet.getRange(targetRow, 2).setValue(payload.seller_name);
  if (payload.contact_info !== undefined) sheet.getRange(targetRow, 3).setValue(payload.contact_info);
  if (payload.default_fee_pct !== undefined) sheet.getRange(targetRow, 4).setValue(Number(payload.default_fee_pct));
  if (payload.avatar_url !== undefined) sheet.getRange(targetRow, 5).setValue(payload.avatar_url);
  if (payload.is_active !== undefined) {
    const isActive = payload.is_active !== false;
    sheet.getRange(targetRow, 6).setValue(isActive);

    // 🌟 Cascade toggle product display/active status for all products of this seller
    try {
      const masterSS = getMasterSpreadsheet();
      const stockSheet = masterSS.getSheetByName('Inventory_Stocks');
      const catalogSheet = masterSS.getSheetByName('Product_Catalog');

      if (stockSheet && catalogSheet) {
        const stockData = stockSheet.getDataRange().getValues();
        const barcodesForSeller = new Set();
        for (let s = 1; s < stockData.length; s++) {
          const sSellerId = (stockData[s][3] || '').toString().trim().toUpperCase();
          if (sSellerId === (sellerId || '').toString().trim().toUpperCase()) {
            const bc = String(stockData[s][0] || '').trim();
            if (bc) barcodesForSeller.add(bc);
          }
        }

        const catData = catalogSheet.getDataRange().getValues();
        for (let c = 1; c < catData.length; c++) {
          const catBc = String(catData[c][0] || '').trim();
          if (barcodesForSeller.has(catBc)) {
            // Column 9 is is_active (1-indexed row c + 1, col 9)
            catalogSheet.getRange(c + 1, 9).setValue(isActive);
          }
        }
      }
    } catch (e) {
      Logger.log('Error syncing product active status: ' + e.message);
    }
  }

  return { status: 'SUCCESS', message: 'อัปเดตข้อมูลผู้ฝากขายสำเร็จ' };
}

function handleDeleteSeller(sellerId, cascadeProducts) {
  if (sellerId === 'S01') {
    return { status: 'ERROR', message: 'ไม่อนุญาตให้ลบร้านค้าส่วนกลาง (S01)' };
  }

  const masterSS = getMasterSpreadsheet();
  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (sellerId || '').toUpperCase()) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบผู้ฝากขายรหัส ' + sellerId };
  }

  sheet.deleteRow(targetRow);

  let deletedProducts = 0;
  if (cascadeProducts) {
    const prodSheet = masterSS.getSheetByName('Products');
    if (prodSheet) {
      const pData = prodSheet.getDataRange().getValues();
      for (let r = pData.length - 1; r >= 1; r--) {
        const pSellerId = (pData[r][14] || pData[r][11] || '').toString().toUpperCase();
        if (pSellerId === (sellerId || '').toUpperCase()) {
          prodSheet.deleteRow(r + 1);
          deletedProducts++;
        }
      }
    }
  }

  return { status: 'SUCCESS', deletedProductsCount: deletedProducts };
}

/**
 * Upload Seller Profile Avatar directly to Google Drive
 * Standardized Naming: SELLER_{seller_id}_{timestamp}.{ext}
 */
function handleUploadSellerAvatar(payload) {
  if (!payload || !payload.image_base64) {
    return { status: 'ERROR', success: false, message: 'ไม่พบข้อมูลไฟล์รูปภาพ (image_base64)' };
  }

  const sellerId = String(payload.seller_id || 'UNKNOWN').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const mimeType = payload.mime_type || 'image/jpeg';
  let ext = 'jpg';
  if (mimeType.indexOf('png') !== -1) ext = 'png';
  else if (mimeType.indexOf('webp') !== -1) ext = 'webp';
  else if (mimeType.indexOf('gif') !== -1) ext = 'gif';

  const timestamp = new Date().getTime();
  const standardizedName = 'SELLER_' + sellerId + '_' + timestamp + '.' + ext;

  // Resolve target folder
  let targetFolder = null;
  const folderId = payload.folder_id ? String(payload.folder_id).trim() : '';

  if (folderId) {
    try {
      targetFolder = DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn('Could not find custom folder ' + folderId + ', falling back to root folder.');
    }
  }

  if (!targetFolder) {
    try {
      targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
    } catch (e) {
      targetFolder = DriveApp.getRootFolder();
    }
  }

  // Decode Base64
  let base64Data = payload.image_base64;
  if (base64Data.indexOf('base64,') !== -1) {
    base64Data = base64Data.split('base64,')[1];
  }

  const decodedBytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedBytes, mimeType, standardizedName);
  const file = targetFolder.createFile(blob);

  // Set permissions for public view
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.warn('Error setting public permissions for seller avatar: ' + e.message);
  }

  const fileId = file.getId();
  const directImageUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
  const webViewLink = file.getUrl();

  return {
    status: 'SUCCESS',
    success: true,
    file_id: fileId,
    file_name: standardizedName,
    image_url: directImageUrl,
    web_view_link: webViewLink,
    message: 'อัปโหลดรูปโปรไฟล์ผู้ฝากขายสำเร็จ'
  };
}

function formatPromoDate(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]' || val instanceof Date) {
    try {
      if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
        return Utilities.formatDate(val, 'Asia/Bangkok', 'yyyy-MM-dd');
      }
      return val.toISOString().slice(0, 10);
    } catch (e) {
      return String(val);
    }
  }
  const str = String(val).trim();
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return str;
}

function getOrCreatePromotionsSheet() {
  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Promotions');
  if (!sheet) {
    sheet = masterSS.insertSheet('Promotions');
    sheet.appendRow(['promo_id', 'promo_name', 'promo_type', 'target_barcode', 'buy_qty', 'free_qty', 'discount_pct', 'special_price', 'absorbed_by', 'start_date', 'end_date', 'is_active']);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return sheet;
}

function handleGetPromotions() {
  const sheet = getOrCreatePromotionsSheet();
  const data = sheet.getDataRange().getValues();
  const promotions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const promoId = String(row[0] || '').trim();
    if (promoId) {
      const isAct = row[11] === true || row[11] === 'TRUE' || String(row[11]).toUpperCase() === 'TRUE';
      promotions.push({
        promo_id: promoId,
        promo_name: String(row[1] || '').trim(),
        promo_type: String(row[2] || 'BOGO').trim(),
        target_barcode: String(row[3] || '').trim(),
        buy_qty: Number(row[4]) || 1,
        free_qty: Number(row[5]) || 0,
        discount_pct: (row[6] !== '' && row[6] !== null && row[6] !== undefined) ? Number(row[6]) : undefined,
        special_price: (row[7] !== '' && row[7] !== null && row[7] !== undefined) ? Number(row[7]) : undefined,
        absorbed_by: String(row[8] || 'SELLER').trim(),
        start_date: formatPromoDate(row[9]),
        end_date: formatPromoDate(row[10]),
        is_active: isAct
      });
    }
  }

  return { status: 'SUCCESS', success: true, data: promotions };
}

function handleCreatePromotion(payload) {
  if (!payload || !payload.promo_name || !payload.target_barcode) {
    return { status: 'ERROR', message: 'กรุณาระบุชื่อโปรโมชั่นและรหัสบาร์โค้ดสินค้าที่ร่วมรายการ' };
  }

  const sheet = getOrCreatePromotionsSheet();
  const data = sheet.getDataRange().getValues();

  let promoId = (payload.promo_id || '').toString().trim();
  if (!promoId) {
    let maxNum = 0;
    for (let r = 1; r < data.length; r++) {
      const id = (data[r][0] || '').toString();
      const m = id.match(/^PROMO-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    promoId = 'PROMO-' + ('000' + (maxNum + 1)).slice(-3);
  }

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === promoId.toUpperCase()) {
      return { status: 'ERROR', message: 'รหัสโปรโมชั่น ' + promoId + ' มีอยู่ในระบบแล้ว' };
    }
  }

  const promoType = payload.promo_type || 'BOGO';
  const targetBarcode = String(payload.target_barcode).trim();
  const buyQty = Number(payload.buy_qty) || 1;
  const freeQty = Number(payload.free_qty) || 0;
  const discountPct = (payload.discount_pct !== undefined && payload.discount_pct !== null && payload.discount_pct !== '') ? Number(payload.discount_pct) : '';
  const specialPrice = (payload.special_price !== undefined && payload.special_price !== null && payload.special_price !== '') ? Number(payload.special_price) : '';
  const absorbedBy = payload.absorbed_by || 'SELLER';
  const startDate = payload.start_date || '';
  const endDate = payload.end_date || '';
  const isActive = payload.is_active !== false;

  const row = [
    promoId,
    payload.promo_name.trim(),
    promoType,
    targetBarcode,
    buyQty,
    freeQty,
    discountPct,
    specialPrice,
    absorbedBy,
    startDate,
    endDate,
    isActive
  ];

  sheet.appendRow(row);

  return {
    status: 'SUCCESS',
    success: true,
    data: {
      promo_id: promoId,
      promo_name: payload.promo_name.trim(),
      promo_type: promoType,
      target_barcode: targetBarcode,
      buy_qty: buyQty,
      free_qty: freeQty,
      discount_pct: discountPct !== '' ? Number(discountPct) : undefined,
      special_price: specialPrice !== '' ? Number(specialPrice) : undefined,
      absorbed_by: absorbedBy,
      start_date: startDate,
      end_date: endDate,
      is_active: isActive
    },
    message: 'สร้างโปรโมชั่นสำเร็จ'
  };
}

function handleUpdatePromotion(promoId, updates) {
  if (!promoId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสโปรโมชั่นที่ต้องการแก้ไข' };
  }

  const sheet = getOrCreatePromotionsSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (promoId || '').toUpperCase()) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบโปรโมชั่นรหัส ' + promoId };
  }

  const payload = updates || {};
  if (payload.promo_name !== undefined) sheet.getRange(targetRow, 2).setValue(String(payload.promo_name).trim());
  if (payload.promo_type !== undefined) sheet.getRange(targetRow, 3).setValue(String(payload.promo_type).trim());
  if (payload.target_barcode !== undefined) sheet.getRange(targetRow, 4).setValue(String(payload.target_barcode).trim());
  if (payload.buy_qty !== undefined) sheet.getRange(targetRow, 5).setValue(Number(payload.buy_qty) || 1);
  if (payload.free_qty !== undefined) sheet.getRange(targetRow, 6).setValue(Number(payload.free_qty) || 0);
  if (payload.discount_pct !== undefined) sheet.getRange(targetRow, 7).setValue((payload.discount_pct !== null && payload.discount_pct !== '') ? Number(payload.discount_pct) : '');
  if (payload.special_price !== undefined) sheet.getRange(targetRow, 8).setValue((payload.special_price !== null && payload.special_price !== '') ? Number(payload.special_price) : '');
  if (payload.absorbed_by !== undefined) sheet.getRange(targetRow, 9).setValue(String(payload.absorbed_by).trim());
  if (payload.start_date !== undefined) sheet.getRange(targetRow, 10).setValue(payload.start_date || '');
  if (payload.end_date !== undefined) sheet.getRange(targetRow, 11).setValue(payload.end_date || '');
  if (payload.is_active !== undefined) sheet.getRange(targetRow, 12).setValue(payload.is_active !== false);

  const updatedRow = sheet.getRange(targetRow, 1, 1, 12).getValues()[0];
  const isAct = updatedRow[11] === true || updatedRow[11] === 'TRUE' || String(updatedRow[11]).toUpperCase() === 'TRUE';
  const updatedItem = {
    promo_id: String(updatedRow[0] || '').trim(),
    promo_name: String(updatedRow[1] || '').trim(),
    promo_type: String(updatedRow[2] || 'BOGO').trim(),
    target_barcode: String(updatedRow[3] || '').trim(),
    buy_qty: Number(updatedRow[4]) || 1,
    free_qty: Number(updatedRow[5]) || 0,
    discount_pct: (updatedRow[6] !== '' && updatedRow[6] !== null && updatedRow[6] !== undefined) ? Number(updatedRow[6]) : undefined,
    special_price: (updatedRow[7] !== '' && updatedRow[7] !== null && updatedRow[7] !== undefined) ? Number(updatedRow[7]) : undefined,
    absorbed_by: String(updatedRow[8] || 'SELLER').trim(),
    start_date: formatPromoDate(updatedRow[9]),
    end_date: formatPromoDate(updatedRow[10]),
    is_active: isAct
  };

  return {
    status: 'SUCCESS',
    success: true,
    data: updatedItem,
    message: 'อัปเดตข้อมูลโปรโมชั่นสำเร็จ'
  };
}

function handleDeletePromotion(promoId) {
  if (!promoId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสโปรโมชั่นที่ต้องการลบ' };
  }

  const sheet = getOrCreatePromotionsSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (promoId || '').toUpperCase()) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบโปรโมชั่นรหัส ' + promoId };
  }

  sheet.deleteRow(targetRow);
  return { status: 'SUCCESS', success: true, message: 'ลบโปรโมชั่นสำเร็จ' };
}

function handleTogglePromotionActive(promoId) {
  if (!promoId) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสโปรโมชั่น' };
  }

  const sheet = getOrCreatePromotionsSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;
  let currentVal = false;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (promoId || '').toUpperCase()) {
      targetRow = r + 1;
      currentVal = data[r][11] === true || data[r][11] === 'TRUE' || String(data[r][11]).toUpperCase() === 'TRUE';
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบโปรโมชั่นรหัส ' + promoId };
  }

  const newVal = !currentVal;
  sheet.getRange(targetRow, 12).setValue(newVal);

  return {
    status: 'SUCCESS',
    success: true,
    is_active: newVal,
    message: newVal ? 'เปิดใช้งานโปรโมชั่นสำเร็จ' : 'ปิดใช้งานโปรโมชั่นสำเร็จ'
  };
}

function getOrCreateProductUOMSheet() {
  const masterSS = getMasterSpreadsheet();
  let sheet = masterSS.getSheetByName('Product_UOM_Conversions');
  if (!sheet) {
    sheet = masterSS.insertSheet('Product_UOM_Conversions');
    sheet.appendRow(['conversion_id', 'barcode', 'base_barcode', 'unit_name', 'conversion_factor', 'selling_price', 'is_active', 'created_at']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return sheet;
}

function handleGetProductUOMs() {
  const sheet = getOrCreateProductUOMSheet();
  const data = sheet.getDataRange().getValues();
  const uoms = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] || row[1]) {
      uoms.push({
        conversion_id: String(row[0] || ('UOM-' + row[1])),
        barcode: String(row[1] || ''),
        base_barcode: String(row[2] || ''),
        unit_name: String(row[3] || ''),
        conversion_factor: Number(row[4]) || 1,
        selling_price: Number(row[5]) || 0,
        is_active: row[6] === true || row[6] === 'TRUE' || String(row[6]).toUpperCase() === 'TRUE',
        created_at: row[7] ? String(row[7]) : ''
      });
    }
  }
  return { status: 'SUCCESS', data: uoms };
}

function handleSaveProductUOM(payload) {
  if (!payload || !payload.barcode || !payload.base_barcode) {
    return { status: 'ERROR', message: 'กรุณาระบุบาร์โค้ดแพ็คและบาร์โค้ดสินค้าหลัก' };
  }
  const sheet = getOrCreateProductUOMSheet();
  const data = sheet.getDataRange().getValues();
  const targetBarcode = String(payload.barcode).trim();
  const conversionId = payload.conversion_id || ('UOM-' + targetBarcode);
  const now = new Date().toISOString();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === conversionId || String(data[i][1]) === targetBarcode) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    conversionId,
    targetBarcode,
    String(payload.base_barcode).trim(),
    String(payload.unit_name || 'แพ็ค').trim(),
    Number(payload.conversion_factor) || 1,
    Number(payload.selling_price) || 0,
    payload.is_active !== false,
    now
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 8).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return {
    status: 'SUCCESS',
    success: true,
    data: {
      conversion_id: conversionId,
      barcode: targetBarcode,
      base_barcode: String(payload.base_barcode).trim(),
      unit_name: String(payload.unit_name || 'แพ็ค').trim(),
      conversion_factor: Number(payload.conversion_factor) || 1,
      selling_price: Number(payload.selling_price) || 0,
      is_active: payload.is_active !== false,
      created_at: now
    },
    message: 'บันทึกหน่วยนับสินค้าสำเร็จ'
  };
}

function handleDeleteProductUOM(payload) {
  if (!payload || (!payload.conversion_id && !payload.barcode)) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสหน่วยนับที่ต้องการลบ' };
  }
  const sheet = getOrCreateProductUOMSheet();
  const data = sheet.getDataRange().getValues();
  const targetId = String(payload.conversion_id || '').trim();
  const targetBarcode = String(payload.barcode || '').trim();

  for (let i = 1; i < data.length; i++) {
    if ((targetId && String(data[i][0]) === targetId) || (targetBarcode && String(data[i][1]) === targetBarcode)) {
      sheet.deleteRow(i + 1);
      return { status: 'SUCCESS', success: true, message: 'ลบหน่วยนับสำเร็จ' };
    }
  }
  return { status: 'ERROR', message: 'ไม่พบรายการหน่วยนับที่ระบุ' };
}

function handleDeleteProduct(payload) {
  if (!payload || !payload.barcode) {
    return { status: 'ERROR', message: 'กรุณาระบุบาร์โค้ดสินค้าที่ต้องการลบ' };
  }
  const barcode = String(payload.barcode).trim();
  const force = !!payload.force;
  const masterSS = getMasterSpreadsheet();
  const catalogSheet = masterSS.getSheetByName('Product_Catalog');
  const stockSheet = masterSS.getSheetByName('Inventory_Stocks');
  const uomSheet = masterSS.getSheetByName('Product_UOM_Conversions');

  if (!catalogSheet) return { status: 'ERROR', message: 'ไม่พบตาราง Product_Catalog' };

  // 1. Safety Check: Check stock_qty in Inventory_Stocks
  if (stockSheet && !force) {
    const stockData = stockSheet.getDataRange().getValues();
    for (let s = 1; s < stockData.length; s++) {
      if (String(stockData[s][0]).trim() === barcode) {
        const qty = Number(stockData[s][1]) || 0;
        if (qty > 0) {
          return {
            status: 'ERROR',
            message: 'ไม่สามารถลบสินค้าได้เนื่องจากยังมีสต็อกคงเหลือ ' + qty + ' ชิ้น กรุณาตัดจำหน่าย (Write-Off) หรือเปลี่ยนเป็น "ระงับการขาย" แทน'
          };
        }
      }
    }
  }

  // 2. Delete from Product_Catalog & get image_url to trash
  const catalogData = catalogSheet.getDataRange().getValues();
  let foundCatalog = false;
  let imageToDelete = '';
  for (let i = 1; i < catalogData.length; i++) {
    if (String(catalogData[i][0]).trim() === barcode) {
      imageToDelete = String(catalogData[i][2] || '').trim();
      catalogSheet.deleteRow(i + 1);
      foundCatalog = true;
      break;
    }
  }

  // 3. Trash Drive Image if present
  if (imageToDelete) {
    const fileId = extractDriveFileId(imageToDelete);
    if (fileId) {
      try {
        const imgFile = DriveApp.getFileById(fileId);
        imgFile.setTrashed(true);
      } catch (e) {
        console.warn('Could not trash product image: ' + e.toString());
      }
    }
  }

  // 4. Delete from Inventory_Stocks
  if (stockSheet) {
    const stockData = stockSheet.getDataRange().getValues();
    for (let s = 1; s < stockData.length; s++) {
      if (String(stockData[s][0]).trim() === barcode) {
        stockSheet.deleteRow(s + 1);
        break;
      }
    }
  }

  // 5. Cascade delete linked Product_UOM_Conversions
  if (uomSheet) {
    const uomData = uomSheet.getDataRange().getValues();
    // Delete in reverse order to preserve row indices
    for (let u = uomData.length - 1; u >= 1; u--) {
      if (String(uomData[u][2]).trim() === barcode) {
        uomSheet.deleteRow(u + 1);
      }
    }
  }

  if (foundCatalog) {
    return { status: 'SUCCESS', success: true, message: 'ลบสินค้า ' + barcode + ' และหน่วยเสริมที่เกี่ยวข้องเรียบร้อย' };
  } else {
    return { status: 'ERROR', message: 'ไม่พบสินค้ารหัส ' + barcode + ' ในระบบ' };
  }
}

/**
 * Utility: Extract Google Drive File ID from URL or Raw ID
 */
function extractDriveFileId(input) {
  if (!input) return '';
  const str = String(input).trim();
  // Match /d/{id} or /d/{id}/
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];
  // Match id={id}
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  // Match raw ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) return str;
  return '';
}

/**
 * Handle Upload Product Image to specified Google Drive Folder
 * Standardized Naming: PROD_{barcode}_{timestamp}.{ext}
 */
function handleUploadProductImage(payload) {
  if (!payload || !payload.image_base64) {
    return { status: 'ERROR', success: false, message: 'ไม่พบข้อมูลไฟล์รูปภาพ (image_base64)' };
  }

  const barcode = String(payload.barcode || 'UNKNOWN').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const mimeType = payload.mime_type || 'image/jpeg';
  let ext = 'jpg';
  if (mimeType.indexOf('png') !== -1) ext = 'png';
  else if (mimeType.indexOf('webp') !== -1) ext = 'webp';
  else if (mimeType.indexOf('gif') !== -1) ext = 'gif';

  const timestamp = new Date().getTime();
  const standardizedName = 'PROD_' + barcode + '_' + timestamp + '.' + ext;

  // Resolve target folder
  let targetFolder = null;
  const folderId = payload.folder_id ? String(payload.folder_id).trim() : '';

  if (folderId) {
    try {
      targetFolder = DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn('Could not find custom folder ' + folderId + ', falling back to root folder.');
    }
  }

  if (!targetFolder) {
    try {
      targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
    } catch (e) {
      targetFolder = DriveApp.getRootFolder();
    }
  }

  // Decode Base64
  let base64Data = payload.image_base64;
  if (base64Data.indexOf('base64,') !== -1) {
    base64Data = base64Data.split('base64,')[1];
  }

  const decodedBytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedBytes, mimeType, standardizedName);
  const file = targetFolder.createFile(blob);

  // Set permissions for public view
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.warn('Could not set public sharing: ' + e.toString());
  }

  const fileId = file.getId();
  // Standard Google Drive direct image URL
  const directImageUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  return {
    status: 'SUCCESS',
    success: true,
    file_id: fileId,
    file_name: standardizedName,
    image_url: directImageUrl,
    web_view_link: file.getUrl(),
    message: 'อัปโหลดรูปภาพสินค้าสำเร็จ (' + standardizedName + ')'
  };
}

/**
 * Handle Delete / Trash File in Google Drive
 */
function handleDeleteDriveFile(payload) {
  if (!payload || (!payload.file_id && !payload.file_url)) {
    return { status: 'ERROR', success: false, message: 'กรุณาระบุ file_id หรือ file_url ที่ต้องการลบ' };
  }

  const fileId = payload.file_id ? String(payload.file_id).trim() : extractDriveFileId(payload.file_url);
  if (!fileId) {
    return { status: 'ERROR', success: false, message: 'ไม่สามารถแยก File ID จากข้อมูลที่ระบุได้' };
  }

  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return {
      status: 'SUCCESS',
      success: true,
      file_id: fileId,
      message: 'ย้ายไฟล์ลงถังขยะ Google Drive สำเร็จ'
    };
  } catch (err) {
    return {
      status: 'ERROR',
      success: false,
      message: 'ลบไฟล์ใน Google Drive ไม่สำเร็จ: ' + err.toString()
    };
  }
}

function handleToggleProductActive(payload) {
  if (!payload || !payload.barcode) {
    return { status: 'ERROR', message: 'กรุณาระบุบาร์โค้ดสินค้า' };
  }
  const barcode = String(payload.barcode).trim();
  const isActive = payload.is_active !== false;
  const masterSS = getMasterSpreadsheet();
  const catalogSheet = masterSS.getSheetByName('Product_Catalog');

  if (!catalogSheet) return { status: 'ERROR', message: 'ไม่พบตาราง Product_Catalog' };

  const catalogData = catalogSheet.getDataRange().getValues();
  for (let i = 1; i < catalogData.length; i++) {
    if (String(catalogData[i][0]).trim() === barcode) {
      catalogSheet.getRange(i + 1, 9).setValue(isActive);
      return { 
        status: 'SUCCESS', 
        success: true, 
        message: isActive ? 'เปิดขายสินค้าเรียบร้อย' : 'ระงับการขายสินค้า (ซ่อนจากหน้าร้าน) เรียบร้อย' 
      };
    }
  }
  return { status: 'ERROR', message: 'ไม่พบสินค้ารหัส ' + barcode };
}

function handleTopupSoldier(batchId, payload) {
  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const logSheet = getBatchSheet(batchId, 'Credit_Logs');
  if (!soldierSheet) return { status: 'ERROR', message: 'Soldiers sheet not found' };

  const data = soldierSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.soldier_id)) {
      const currentCash = Number(data[i][7]) || 0;
      const amount = Number(payload.amount);
      const newCash = currentCash + amount;
      soldierSheet.getRange(i + 1, 8).setValue(newCash);

      if (logSheet) {
        logSheet.appendRow([
          'TOP-' + Utilities.getUuid().substring(0, 8),
          payload.soldier_id,
          'TOPUP',
          'CASH_WALLET',
          amount,
          currentCash,
          newCash,
          '',
          payload.staff_user_id || 'CASHIER',
          new Date().toISOString()
        ]);
      }

      return { status: 'SUCCESS', new_cash_balance: newCash };
    }
  }
  return { status: 'ERROR', message: 'Soldier not found' };
}

/**
 * 0. AUTH_LOGIN: ตรวจสอบการเข้าใช้งานระบบ (Admin, Staff, Seller)
 */
function handleAuthLogin(payload) {
  const ss = getPXSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) throw new Error('Sheet Users not found');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // row: user_id, username, pin_hash, full_name, role, seller_id, avatar_url, is_active
    const username = row[1];
    const pinHash = row[2];
    const avatarUrl = row[6] || '';
    const isActive = row[7];

    if (username === payload.username && pinHash === payload.pin && (isActive === true || isActive === 'TRUE')) {
      return {
        status: 'SUCCESS',
        user: {
          user_id: row[0],
          username: row[1],
          full_name: row[3],
          role: row[4],
          seller_id: row[5] || null,
          avatar_url: avatarUrl
        }
      };
    }
  }

  return { status: 'ERROR', message: 'Invalid username/pin or user inactive' };
}

/**
 * 0.1 LIST_CASHIERS: ดึงรายชื่อแคชเชียร์สำหรับหน้าจอ Switch Cashier บน POS
 */
function handleListCashiers() {
  const ss = getPXSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) throw new Error('Sheet Users not found');

  const data = sheet.getDataRange().getValues();
  const cashiers = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[4] === 'STAFF' && (row[7] === true || row[7] === 'TRUE')) {
      cashiers.push({
        user_id: row[0],
        full_name: row[3],
        username: row[1],
        avatar_url: row[6] || ''
      });
    }
  }

  return { status: 'SUCCESS', cashiers: cashiers };
}

/**
 * 1. SYNC_CATALOG: ดึงข้อมูลแคตตาล็อกสินค้าหน้าร้าน (Ultra-Slim 9 ฟิลด์: เฉพาะ is_active == TRUE)
 */
function handleSyncCatalog() {
  const ss = getPXSpreadsheet();
  const sheet = ss.getSheetByName('Product_Catalog');
  if (!sheet) throw new Error('Sheet Product_Catalog not found');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, colIdx) => {
      item[h] = row[colIdx];
    });
    // กรองเฉพาะสินค้าที่เปิดใช้งาน (is_active == TRUE)
    if (item.barcode && (item.is_active === true || item.is_active === 'TRUE' || item.is_active === 1 || item.is_active === '')) {
      items.push(item);
    }
  }

  return {
    status: 'SUCCESS',
    count: items.length,
    catalog: items
  };
}

/**
 * 2. CHECK_SOLDIER_WALLET: เช็คยอดเงินคงเหลือ 2 กระเป๋าของทหาร
 */
function handleCheckSoldierWallet(batchId, pxCode) {
  const sheet = getBatchSheet(batchId, 'Soldiers');
  if (!sheet) throw new Error('Sheet Soldiers for batch ' + batchId + ' not found');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === pxCode) {
      return {
        status: 'SUCCESS',
        soldier: {
          px_code: data[i][0],
          national_id: data[i][1],
          full_name: data[i][2],
          unit: data[i][3],
          credit_limit: Number(data[i][4]),
          deductions: Number(data[i][5]),
          credit_allowance_balance: Number(data[i][6]),
          cash_wallet_balance: Number(data[i][7]),
          photo_url: data[i][8] || '',
          status: data[i][9]
        }
      };
    }
  }

  return { status: 'ERROR', message: 'Soldier not found: ' + pxCode };
}

/**
 * 3. PROCESS_ORDER: บันทึกบิลการขาย ตัดสต็อก และตัดยอด 2 กระเป๋าแบบปรมาณู
 */
function handleProcessOrder(batchId, payload) {
  const masterSS = getMasterSpreadsheet();
  const orderSheet = getBatchSheet(batchId, 'Orders');
  const itemsSheet = getBatchSheet(batchId, 'Order_Items');
  const splitsSheet = getBatchSheet(batchId, 'Order_Splits');
  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const stockSheet = masterSS.getSheetByName('Inventory_Stocks');
  const catalogSheet = masterSS.getSheetByName('Product_Catalog');
  const logSheet = getBatchSheet(batchId, 'Credit_Logs');

  const order = payload.order;
  const items = payload.items; // array of items
  const splits = payload.splits || []; // party splits

  // 1. ตรวจสอบยอดเงินทหารแต่ละคน (Two-Wallet validation)
  const soldierData = soldierSheet.getDataRange().getValues();
  const soldierMap = {};
  for (let i = 1; i < soldierData.length; i++) {
    soldierMap[soldierData[i][0]] = {
      rowIndex: i + 1,
      creditBalance: Number(soldierData[i][6]),
      cashBalance: Number(soldierData[i][7]),
      status: soldierData[i][9]
    };
  }

  // 2. แมพ Product_Catalog (Parent Barcode & Conversion Factor) และ Product_UOM_Conversions
  const catalogData = catalogSheet.getDataRange().getValues();
  const catalogMap = {};
  for (let i = 1; i < catalogData.length; i++) {
    catalogMap[catalogData[i][0]] = {
      parentBarcode: catalogData[i][6],
      conversionFactor: Number(catalogData[i][7]) || 1
    };
  }

  const uomSheet = masterSS.getSheetByName('Product_UOM_Conversions');
  const uomMap = {};
  if (uomSheet) {
    const uomData = uomSheet.getDataRange().getValues();
    for (let i = 1; i < uomData.length; i++) {
      const uRow = uomData[i];
      if (uRow[1]) {
        uomMap[String(uRow[1]).trim()] = {
          baseBarcode: String(uRow[2] || uRow[1]).trim(),
          conversionFactor: Number(uRow[4]) || 1
        };
      }
    }
  }

  // 3. แมพ Inventory_Stocks (เฉพาะ Base item)
  const stockData = stockSheet.getDataRange().getValues();
  const stockMap = {};
  for (let i = 1; i < stockData.length; i++) {
    stockMap[stockData[i][0]] = {
      rowIndex: i + 1,
      stockQty: Number(stockData[i][1]),
      costPrice: Number(stockData[i][2]),
      sellerId: stockData[i][3]
    };
  }

  // 4. หักเงินใน Soldiers และบันทึก Credit_Logs
  const nowStr = new Date().toISOString();
  if (splits.length > 0) {
    // โหมดหารบิล (Party Split)
    splits.forEach(split => {
      const s = soldierMap[split.participant_code];
      if (!s || s.status !== 'ACTIVE') {
        throw new Error('Participant soldier not found or inactive: ' + split.participant_code);
      }

      if (split.payment_method === 'CASH') {
        if (s.cashBalance < split.amount_assigned) {
          throw new Error('Insufficient cash balance for participant: ' + split.participant_code);
        }
        const newCash = s.cashBalance - split.amount_assigned;
        soldierSheet.getRange(s.rowIndex, 8).setValue(newCash);

        logSheet.appendRow([
          'CL-' + Utilities.getUuid().substring(0, 8),
          split.participant_code,
          'DEDUCT',
          'CASH_WALLET',
          split.amount_assigned,
          s.cashBalance,
          newCash,
          order.order_id,
          order.cashier_id,
          nowStr
        ]);
      } else {
        // หักกระเป๋าสวัสดิการ
        if (s.creditBalance < split.amount_assigned) {
          throw new Error('Insufficient credit allowance for participant: ' + split.participant_code);
        }
        const newCredit = s.creditBalance - split.amount_assigned;
        soldierSheet.getRange(s.rowIndex, 7).setValue(newCredit);

        logSheet.appendRow([
          'CL-' + Utilities.getUuid().substring(0, 8),
          split.participant_code,
          'DEDUCT',
          'CREDIT_ALLOWANCE',
          split.amount_assigned,
          s.creditBalance,
          newCredit,
          order.order_id,
          order.cashier_id,
          nowStr
        ]);
      }
    });
  } else {
    // บิลเดี่ยว (Primary Buyer)
    const s = soldierMap[order.primary_buyer_code];
    if (!s || s.status !== 'ACTIVE') {
      throw new Error('Primary buyer not found or inactive: ' + order.primary_buyer_code);
    }

    if (order.payment_method === 'CASH') {
      if (s.cashBalance < order.net_amount) {
        throw new Error('Insufficient cash balance for buyer: ' + order.primary_buyer_code);
      }
      const newBal = s.cashBalance - order.net_amount;
      soldierSheet.getRange(s.rowIndex, 8).setValue(newBal);

      logSheet.appendRow([
        'CL-' + Utilities.getUuid().substring(0, 8),
        order.primary_buyer_code,
        'DEDUCT',
        'CASH_WALLET',
        order.net_amount,
        s.cashBalance,
        newBal,
        order.order_id,
        order.cashier_id,
        nowStr
      ]);
    } else {
      if (s.creditBalance < order.net_amount) {
        throw new Error('Insufficient credit allowance for buyer: ' + order.primary_buyer_code);
      }
      const newBal = s.creditBalance - order.net_amount;
      soldierSheet.getRange(s.rowIndex, 7).setValue(newBal);

      logSheet.appendRow([
        'CL-' + Utilities.getUuid().substring(0, 8),
        order.primary_buyer_code,
        'DEDUCT',
        'CREDIT_ALLOWANCE',
        order.net_amount,
        s.creditBalance,
        newBal,
        order.order_id,
        order.cashier_id,
        nowStr
      ]);
    }
  }

  // 5. บันทึก Order
  orderSheet.appendRow([
    order.order_id,
    nowStr,
    order.cashier_id,
    order.shift_id,
    order.primary_buyer_code,
    order.total_amount,
    order.discount_total || 0,
    order.net_amount,
    order.payment_method,
    splits.length > 0,
    'COMPLETED'
  ]);

  // 6. บันทึก Order_Splits (ถ้ามี)
  if (splits.length > 0) {
    splits.forEach((split, idx) => {
      splitsSheet.appendRow([
        'SPLIT-' + order.order_id + '-' + (idx + 1),
        order.order_id,
        split.participant_code,
        split.split_type || 'EQUAL',
        split.amount_assigned,
        split.payment_method,
        true,
        nowStr
      ]);
    });
  }

  // 7. บันทึก Order_Items พร้อม Snapshot ราคาทุน และตัดสต็อกสินค้าใน Inventory
  items.forEach((item, idx) => {
    const uomInfo = uomMap[item.barcode];
    const cat = catalogMap[item.barcode] || { parentBarcode: '', conversionFactor: 1 };
    const targetBarcode = (uomInfo && uomInfo.baseBarcode)
      ? uomInfo.baseBarcode
      : ((cat.parentBarcode && cat.parentBarcode.trim() !== '') ? cat.parentBarcode : item.barcode);
    const conversionMultiplier = (uomInfo && uomInfo.conversionFactor) ? uomInfo.conversionFactor : cat.conversionFactor;
    const stockInfo = stockMap[targetBarcode];

    const costAtSale = stockInfo ? stockInfo.costPrice : 0;
    const sellerId = stockInfo ? stockInfo.sellerId : 'S01';

    itemsSheet.appendRow([
      'ITEM-' + order.order_id + '-' + (idx + 1),
      order.order_id,
      item.barcode,
      item.actual_qty,
      item.charged_qty,
      costAtSale,
      item.unit_price,
      item.discount_amount || 0,
      item.subtotal,
      sellerId,
      false
    ]);

    // ตัดสต็อกคลังหลังร้าน
    if (stockInfo) {
      const deductionQty = item.actual_qty * conversionMultiplier;
      const newStock = Math.max(0, stockInfo.stockQty - deductionQty);
      stockSheet.getRange(stockInfo.rowIndex, 2).setValue(newStock);
      stockInfo.stockQty = newStock;
    }
  });

  return {
    status: 'SUCCESS',
    order_id: order.order_id,
    message: 'Order processed successfully'
  };
}

/**
 * 3.1 PROCESS_WRITE_OFF: บันทึกตัดจ่ายสินค้าชำรุด/หมดอายุ/เบิกใช้ และตัดสต็อก
 */
function handleProcessWriteOff(payload) {
  const ss = getPXSpreadsheet();
  const writeOffSheet = ss.getSheetByName('Stock_Write_Off_Logs');
  const stockSheet = ss.getSheetByName('Inventory_Stocks');
  if (!writeOffSheet || !stockSheet) throw new Error('Required sheets not found');

  const stockData = stockSheet.getDataRange().getValues();
  let stockRow = -1;
  let currentStock = 0;
  let costPrice = payload.cost_price_unit || 0;
  let sellerId = payload.seller_id || 'S01';

  for (let i = 1; i < stockData.length; i++) {
    if (stockData[i][0] === payload.barcode) {
      stockRow = i + 1;
      currentStock = Number(stockData[i][1]);
      costPrice = Number(stockData[i][2]);
      sellerId = stockData[i][3];
      break;
    }
  }

  const writeOffQty = Number(payload.quantity);
  const totalLoss = writeOffQty * costPrice;

  // 1. บันทึกประวัติ Write Off
  const writeOffId = 'WO-' + Utilities.getUuid().substring(0, 8);
  writeOffSheet.appendRow([
    writeOffId,
    payload.barcode,
    writeOffQty,
    costPrice,
    totalLoss,
    payload.reason || 'DAMAGED',
    payload.cost_absorbed_by || 'SELLER',
    sellerId,
    payload.authorized_by,
    new Date().toISOString()
  ]);

  // 2. ตัดสต็อกออกจาก Inventory_Stocks
  if (stockRow !== -1) {
    const newStock = Math.max(0, currentStock - writeOffQty);
    stockSheet.getRange(stockRow, 2).setValue(newStock);
  }

  return {
    status: 'SUCCESS',
    write_off_id: writeOffId,
    total_loss_value: totalLoss,
    message: 'Write-off processed and stock updated'
  };
}

/**
 * 4. VOID_ORDER: ยกเลิกบิล คืนเงินอัตโนมัติเข้ากระเป๋าทหาร และคืนสต็อกเข้าคลัง
 */
function handleVoidOrder(batchId, payload) {
  const masterSS = getMasterSpreadsheet();
  const voidSheet = getBatchSheet(batchId, 'Void_Logs');
  const orderSheet = getBatchSheet(batchId, 'Orders');
  const itemsSheet = getBatchSheet(batchId, 'Order_Items');
  const splitsSheet = getBatchSheet(batchId, 'Order_Splits');
  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const stockSheet = masterSS.getSheetByName('Inventory_Stocks');
  const catalogSheet = masterSS.getSheetByName('Product_Catalog');
  const logSheet = getBatchSheet(batchId, 'Credit_Logs');

  const isPartial = payload.is_partial === true || payload.is_partial === 'TRUE';
  const nowStr = new Date().toISOString();

  // 1. ดึงข้อมูล Orders เดิม
  const orderData = orderSheet.getDataRange().getValues();
  let targetOrderRow = -1;
  let orderInfo = null;

  for (let i = 1; i < orderData.length; i++) {
    if (orderData[i][0] === payload.order_id) {
      targetOrderRow = i + 1;
      orderInfo = {
        primary_buyer_code: orderData[i][4],
        net_amount: Number(orderData[i][7]),
        payment_method: orderData[i][8],
        is_party_split: orderData[i][9] === true || orderData[i][9] === 'TRUE',
        status: orderData[i][10]
      };
      break;
    }
  }

  if (!orderInfo) {
    throw new Error('Order not found: ' + payload.order_id);
  }

  // 2. แมพทหารทั้งหมดเพื่อเตรียมคืนเงิน (Soldier Balance Map)
  const soldierData = soldierSheet.getDataRange().getValues();
  const soldierMap = {};
  for (let i = 1; i < soldierData.length; i++) {
    soldierMap[soldierData[i][0]] = {
      rowIndex: i + 1,
      creditBalance: Number(soldierData[i][6]),
      cashBalance: Number(soldierData[i][7])
    };
  }

  // 3. คืนเงินเข้ากระเป๋าทหาร (Credit Allowance / Cash Wallet Reversal)
  if (orderInfo.is_party_split && !isPartial) {
    const splitData = splitsSheet.getDataRange().getValues();
    for (let i = 1; i < splitData.length; i++) {
      if (splitData[i][1] === payload.order_id && splitData[i][5] === 'CREDIT') {
        const participantCode = splitData[i][2];
        const refundAmt = Number(splitData[i][4]);
        const s = soldierMap[participantCode];

        if (s) {
          const newBal = s.creditBalance + refundAmt;
          soldierSheet.getRange(s.rowIndex, 7).setValue(newBal);

          logSheet.appendRow([
            'CL-' + Utilities.getUuid().substring(0, 8),
            participantCode,
            'REFUND',
            'CREDIT_ALLOWANCE',
            refundAmt,
            s.creditBalance,
            newBal,
            payload.order_id,
            payload.voided_by,
            nowStr
          ]);
          s.creditBalance = newBal;
        }
      }
    }
  } else if (orderInfo.payment_method === 'CREDIT') {
    const s = soldierMap[orderInfo.primary_buyer_code];
    const refundAmt = isPartial ? Number(payload.refund_amount) : orderInfo.net_amount;

    if (s && refundAmt > 0) {
      const newBal = s.creditBalance + refundAmt;
      soldierSheet.getRange(s.rowIndex, 7).setValue(newBal);

      logSheet.appendRow([
        'CL-' + Utilities.getUuid().substring(0, 8),
        orderInfo.primary_buyer_code,
        'REFUND',
        'CREDIT_ALLOWANCE',
        refundAmt,
        s.creditBalance,
        newBal,
        payload.order_id,
        payload.voided_by,
        nowStr
      ]);
      s.creditBalance = newBal;
    }
  }

  // 4. คืนสต็อกกลับเข้า Inventory_Stocks
  const catalogData = catalogSheet.getDataRange().getValues();
  const catalogMap = {};
  for (let i = 1; i < catalogData.length; i++) {
    catalogMap[catalogData[i][0]] = {
      parentBarcode: catalogData[i][6],
      conversionFactor: Number(catalogData[i][7]) || 1
    };
  }

  const stockData = stockSheet.getDataRange().getValues();
  const stockMap = {};
  for (let i = 1; i < stockData.length; i++) {
    stockMap[stockData[i][0]] = {
      rowIndex: i + 1,
      stockQty: Number(stockData[i][1])
    };
  }

  const itemsData = itemsSheet.getDataRange().getValues();
  for (let i = 1; i < itemsData.length; i++) {
    if (itemsData[i][1] === payload.order_id) {
      const itemId = itemsData[i][0];
      const barcode = itemsData[i][2];
      const actualQty = Number(itemsData[i][3]);

      if (isPartial && payload.item_id && payload.item_id !== itemId) {
        continue;
      }

      const cat = catalogMap[barcode] || { parentBarcode: '', conversionFactor: 1 };
      const targetBarcode = (cat.parentBarcode && cat.parentBarcode.trim() !== '') ? cat.parentBarcode : barcode;
      const stockInfo = stockMap[targetBarcode];

      if (stockInfo) {
        const restoreQty = actualQty * cat.conversionFactor;
        const newStock = stockInfo.stockQty + restoreQty;
        stockSheet.getRange(stockInfo.rowIndex, 2).setValue(newStock);
        stockInfo.stockQty = newStock;
      }

      itemsSheet.getRange(i + 1, 11).setValue(true);
    }
  }

  // 5. บันทึกลง Void_Logs
  voidSheet.appendRow([
    'VOID-' + Utilities.getUuid().substring(0, 8),
    payload.order_id,
    payload.item_id || '',
    isPartial,
    isPartial ? payload.refund_amount : orderInfo.net_amount,
    payload.voided_by,
    payload.authorized_by,
    payload.void_reason,
    payload.refund_method || orderInfo.payment_method,
    nowStr
  ]);

  // 6. อัปเดตสถานะ Orders เป็น VOIDED (ถ้ายกเลิกทั้งบิล)
  if (!isPartial && targetOrderRow !== -1) {
    orderSheet.getRange(targetOrderRow, 11).setValue('VOIDED');
  }

  return {
    status: 'SUCCESS',
    order_id: payload.order_id,
    is_partial: isPartial,
    message: 'Order voided, money refunded, and inventory restocked successfully'
  };
}

/**
 * 5. CLOSE_SHIFT: ปิดกะและบันทึกผลต่างลิ้นชักเงินสด
 */
function handleCloseShift(batchId, payload) {
  const shiftSheet = getBatchSheet(batchId, 'Shifts');

  const diff = payload.actual_cash_counted - (payload.starting_cash_float + payload.total_cash_sales);

  shiftSheet.appendRow([
    payload.shift_id,
    payload.cashier_id,
    payload.terminal_id,
    payload.opened_at,
    new Date().toISOString(),
    payload.starting_cash_float,
    payload.total_cash_sales,
    payload.actual_cash_counted,
    diff,
    'CLOSED'
  ]);

  return {
    status: 'SUCCESS',
    cash_difference: diff,
    message: 'Shift closed successfully'
  };
}

/**
 * 6. GENERATE_PAYROLL_EXPORT: รวมยอดตัดเงินเดือนส่งการเงินกองบิน 21
 */
function handleGeneratePayrollExport(batchId, payload) {
  // P0-4: Backend batchGuard — frontend-only blocking is not enough
  const guard = isBatchGuardExpired(batchId);
  if (!guard.allowed) {
    return { status: 'ERROR', message: guard.reason };
  }

  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const payrollSheet = getBatchSheet(batchId, 'Payroll_Settlement');
  const scheduleSheet = getBatchSheet(batchId, 'Payroll_Schedules');

  if (!soldierSheet) {
    return { status: 'ERROR', message: 'Soldiers sheet not found for batch ' + batchId };
  }

  // P0-1 / P1-14: Read salary_base from Payroll_Schedules + filter export to the month that reached cutoff
  const monthInfo = resolvePayrollMonth(scheduleSheet, payload);
  const monthPeriod = monthInfo.month_key;
  const salaryBase = monthInfo.salary_base > 0 ? monthInfo.salary_base : 10000;

  const data = soldierSheet.getDataRange().getValues();
  const results = [];

  // P0-3: Idempotent upsert by settlement_id — no duplicate rows on re-run
  const rowsBySettlement = {};
  const settlementOrder = [];
  if (payrollSheet) {
    try {
      const payrollData = payrollSheet.getDataRange().getValues();
      for (let i = 1; i < payrollData.length; i++) {
        const key = String(payrollData[i][0] || '').trim();
        if (key) {
          rowsBySettlement[key] = payrollData[i].slice(0, 9);
          settlementOrder.push(key);
        }
      }
    } catch (e) {}
  }

  for (let i = 1; i < data.length; i++) {
    const pxCode = String(data[i][0] || '').trim();
    if (!pxCode) continue;
    const nationalId = String(data[i][1] || '');
    const creditLimit = Number(data[i][4]) || 2000;
    const deductions = Number(data[i][5]) || 0;
    const creditRemaining = Number(data[i][6]) || 0;

    const used = Math.max(0, creditLimit - creditRemaining);
    const netPayout = Math.max(0, salaryBase - used - deductions);

    const settlementId = 'PAY-' + batchId + '-' + monthPeriod + '-' + pxCode;
    rowsBySettlement[settlementId] = [
      settlementId,
      pxCode,
      nationalId,
      salaryBase,
      used,
      deductions,
      netPayout,
      'PENDING',
      ''
    ];
    if (settlementOrder.indexOf(settlementId) === -1) settlementOrder.push(settlementId);

    results.push({
      px_code: pxCode,
      national_id: nationalId,
      salary_base: salaryBase,
      credit_used: used,
      net_salary_payout: netPayout
    });
  }

  // Write back whole table (upsert — safe to re-run)
  const finalRows = settlementOrder.map(id => rowsBySettlement[id]);
  if (payrollSheet) {
    try {
      if (payrollSheet.getLastRow() > 1) {
        payrollSheet.getRange(2, 1, payrollSheet.getLastRow() - 1, 9).clearContent();
      }
      if (finalRows.length > 0) {
        payrollSheet.getRange(2, 1, finalRows.length, 9).setValues(finalRows);
      }
    } catch (e) {}
  }

  // P2-13: Mark month schedule as PROCESSED after successful export
  if (scheduleSheet && monthPeriod) {
    try {
      const schedData = scheduleSheet.getDataRange().getValues();
      for (let i = 1; i < schedData.length; i++) {
        if (String(schedData[i][0] || '').trim() === monthPeriod) {
          scheduleSheet.getRange(i + 1, 7).setValue('PROCESSED');
          break;
        }
      }
    } catch (e) {}
  }

  return {
    status: 'SUCCESS',
    month_period: monthPeriod,
    exported_count: results.length,
    data: results
  };
}

/**
 * 7. GET_ORDERS: ดึงรายการประวัติการขาย (Orders History)
 */
function handleGetOrders(batchId, params) {
  const orderSheet = getBatchSheet(batchId, 'Orders');
  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const splitsSheet = getBatchSheet(batchId, 'Order_Splits');

  if (!orderSheet) {
    return { status: 'SUCCESS', data: [], summary: { total_sales: 0, total_orders: 0, party_splits: 0, credit_sales: 0, cash_sales: 0 } };
  }

  const soldierData = soldierSheet ? soldierSheet.getDataRange().getValues() : [];
  const soldierMap = {};
  for (let s = 1; s < soldierData.length; s++) {
    soldierMap[soldierData[s][0]] = {
      px_code: soldierData[s][0],
      rank: soldierData[s][2],
      full_name: soldierData[s][3],
      unit: soldierData[s][8]
    };
  }

  // Count splits per order
  const splitsData = splitsSheet ? splitsSheet.getDataRange().getValues() : [];
  const splitsCountMap = {};
  for (let sp = 1; sp < splitsData.length; sp++) {
    const ordId = String(splitsData[sp][1]);
    splitsCountMap[ordId] = (splitsCountMap[ordId] || 0) + 1;
  }

  const orderData = orderSheet.getDataRange().getValues();
  const orders = [];
  let totalSales = 0;
  let partySplitCount = 0;
  let creditSales = 0;
  let cashSales = 0;

  for (let i = 1; i < orderData.length; i++) {
    const row = orderData[i];
    if (!row[0]) continue;

    const orderId = String(row[0]);
    const orderDatetime = row[1] ? new Date(row[1]).toISOString() : '';
    const cashierId = String(row[2] || '');
    const shiftId = String(row[3] || '');
    const buyerCode = String(row[4] || '');
    const totalAmount = Number(row[5]) || 0;
    const discountTotal = Number(row[6]) || 0;
    const netAmount = Number(row[7]) || 0;
    const paymentMethod = String(row[8] || 'CREDIT');
    const isPartySplit = row[9] === true || String(row[9]).toUpperCase() === 'TRUE';
    const status = String(row[10] || 'COMPLETED');

    const buyer = soldierMap[buyerCode];
    const buyerDisplayName = buyer ? (buyer.rank ? buyer.rank + ' ' : '') + buyer.full_name : buyerCode;

    if (status !== 'VOIDED') {
      totalSales += netAmount;
      if (isPartySplit) partySplitCount++;
      if (paymentMethod === 'CREDIT') creditSales += netAmount;
      else if (paymentMethod === 'CASH') cashSales += netAmount;
    }

    orders.push({
      order_id: orderId,
      order_datetime: orderDatetime,
      cashier_id: cashierId,
      shift_id: shiftId,
      primary_buyer_code: buyerCode,
      buyer_name: buyerDisplayName,
      buyer_unit: buyer ? buyer.unit : '',
      total_amount: totalAmount,
      discount_total: discountTotal,
      net_amount: netAmount,
      payment_method: paymentMethod,
      is_party_split: isPartySplit,
      split_count: splitsCountMap[orderId] || 0,
      status: status
    });
  }

  // Sort newest first
  orders.reverse();

  return {
    status: 'SUCCESS',
    data: orders,
    summary: {
      total_sales: totalSales,
      total_orders: orders.length,
      party_splits: partySplitCount,
      credit_sales: creditSales,
      cash_sales: cashSales
    }
  };
}

/**
 * 8. GET_ORDER_DETAILS: ดึงรายละเอียดบิลเดียว พร้อมสินค้าและรายชื่อหาร
 */
function handleGetOrderDetails(batchId, orderId) {
  const masterSS = getMasterSpreadsheet();
  const orderSheet = getBatchSheet(batchId, 'Orders');
  const itemsSheet = getBatchSheet(batchId, 'Order_Items');
  const splitsSheet = getBatchSheet(batchId, 'Order_Splits');
  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const catalogSheet = masterSS.getSheetByName('Product_Catalog');

  if (!orderSheet) {
    return { status: 'ERROR', message: 'Order sheet not found' };
  }

  // 1. Find order header
  const orderData = orderSheet.getDataRange().getValues();
  let foundOrder = null;
  for (let i = 1; i < orderData.length; i++) {
    if (String(orderData[i][0]) === orderId) {
      foundOrder = {
        order_id: String(orderData[i][0]),
        order_datetime: orderData[i][1] ? new Date(orderData[i][1]).toISOString() : '',
        cashier_id: String(orderData[i][2] || ''),
        shift_id: String(orderData[i][3] || ''),
        primary_buyer_code: String(orderData[i][4] || ''),
        total_amount: Number(orderData[i][5]) || 0,
        discount_total: Number(orderData[i][6]) || 0,
        net_amount: Number(orderData[i][7]) || 0,
        payment_method: String(orderData[i][8] || 'CREDIT'),
        is_party_split: orderData[i][9] === true || String(orderData[i][9]).toUpperCase() === 'TRUE',
        status: String(orderData[i][10] || 'COMPLETED')
      };
      break;
    }
  }

  if (!foundOrder) {
    return { status: 'ERROR', message: 'ไม่พบบิลรหัส: ' + orderId };
  }

  // 2. Catalog map for product names
  const catalogMap = {};
  if (catalogSheet) {
    const catData = catalogSheet.getDataRange().getValues();
    for (let c = 1; c < catData.length; c++) {
      catalogMap[String(catData[c][0])] = {
        product_name: String(catData[c][1] || ''),
        unit_name: String(catData[c][3] || 'ชิ้น')
      };
    }
  }

  // 3. Soldier Map
  const soldierMap = {};
  if (soldierSheet) {
    const sData = soldierSheet.getDataRange().getValues();
    for (let s = 1; s < sData.length; s++) {
      soldierMap[String(sData[s][0])] = {
        px_code: String(sData[s][0]),
        rank: String(sData[s][2] || ''),
        soldier_name: String(sData[s][3] || ''),
        unit: String(sData[s][8] || '')
      };
    }
  }

  // 4. Order Items
  const items = [];
  if (itemsSheet) {
    const itemsData = itemsSheet.getDataRange().getValues();
    for (let it = 1; it < itemsData.length; it++) {
      if (String(itemsData[it][1]) === orderId) {
        const barcode = String(itemsData[it][2]);
        const cat = catalogMap[barcode] || { product_name: barcode, unit_name: 'ชิ้น' };
        items.push({
          item_id: String(itemsData[it][0]),
          order_id: orderId,
          barcode: barcode,
          product_name: cat.product_name,
          unit_name: cat.unit_name,
          actual_qty: Number(itemsData[it][3]) || 0,
          charged_qty: Number(itemsData[it][4]) || 0,
          cost_price_at_sale: Number(itemsData[it][5]) || 0,
          unit_price: Number(itemsData[it][6]) || 0,
          discount_amount: Number(itemsData[it][7]) || 0,
          subtotal: Number(itemsData[it][8]) || 0,
          seller_id: String(itemsData[it][9] || 'S01'),
          is_voided: itemsData[it][10] === true || String(itemsData[it][10]).toUpperCase() === 'TRUE'
        });
      }
    }
  }

  // 5. Order Splits
  const splits = [];
  if (splitsSheet) {
    const splitsData = splitsSheet.getDataRange().getValues();
    for (let sp = 1; sp < splitsData.length; sp++) {
      if (String(splitsData[sp][1]) === orderId) {
        const pCode = String(splitsData[sp][2]);
        const soldier = soldierMap[pCode] || { soldier_name: pCode, rank: '', unit: '' };
        splits.push({
          split_id: String(splitsData[sp][0]),
          order_id: orderId,
          participant_code: pCode,
          soldier_name: soldier.soldier_name,
          rank: soldier.rank,
          unit: soldier.unit,
          split_type: String(splitsData[sp][3] || 'EQUAL'),
          amount_assigned: Number(splitsData[sp][4]) || 0,
          payment_method: String(splitsData[sp][5] || 'CREDIT'),
          is_paid: splitsData[sp][6] === true || String(splitsData[sp][6]).toUpperCase() === 'TRUE',
          paid_at: splitsData[sp][7] ? new Date(splitsData[sp][7]).toISOString() : ''
        });
      }
    }
  }

  return {
    status: 'SUCCESS',
    data: {
      order: foundOrder,
      items: items,
      splits: splits,
      primary_buyer: soldierMap[foundOrder.primary_buyer_code] || null
    }
  };
}

/**
 * 24. UPDATE BATCH CONFIG (DATES, NAME, LIMIT)
 */
function handleUpdateBatchConfig(payload) {
  if (!payload || !payload.batch_id) {
    return { status: 'ERROR', message: 'กรุณาระบุรหัสผลัด (batch_id)' };
  }

  const batchId = String(payload.batch_id).trim();
  const masterSS = getMasterSpreadsheet();
  const configSheet = masterSS.getSheetByName('Batch_Config');
  if (!configSheet) {
    return { status: 'ERROR', message: 'ไม่พบตาราง Batch_Config ในระบบ' };
  }

  const data = configSheet.getDataRange().getValues();
  let foundRowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === batchId.toLowerCase()) {
      foundRowIdx = i + 1; // 1-indexed for getRange
      break;
    }
  }

  if (foundRowIdx === -1) {
    return { status: 'ERROR', message: 'ไม่พบข้อมูลผลัด ' + batchId + ' ในระบบ' };
  }

  if (payload.batch_name !== undefined) {
    configSheet.getRange(foundRowIdx, 2).setValue(String(payload.batch_name).trim());
  }
  if (payload.start_date !== undefined) {
    configSheet.getRange(foundRowIdx, 4).setValue(payload.start_date);
  }
  if (payload.end_date !== undefined) {
    configSheet.getRange(foundRowIdx, 5).setValue(payload.end_date);
  }
  if (payload.default_credit_limit !== undefined) {
    configSheet.getRange(foundRowIdx, 6).setValue(Number(payload.default_credit_limit) || 0);
  }

  return {
    status: 'SUCCESS',
    success: true,
    batch_id: batchId,
    message: 'อัปเดตข้อมูลผลัด ' + batchId + ' เรียบร้อยแล้ว'
  };
}

/**
 * 25. EXECUTE MONTHLY BATCH DEDUCTIONS
 */
function handleBatchExecuteDeductions(batchId, payload) {
  if (!payload || !batchId) {
    return { status: 'ERROR', message: 'ข้อมูลไม่ครบถ้วน' };
  }

  // P0-4: Backend batchGuard — frontend-only blocking is not enough
  const guard = isBatchGuardExpired(batchId);
  if (!guard.allowed) {
    return { status: 'ERROR', message: guard.reason };
  }

  const monthPeriod = payload.month_period || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');

  // P1-6: Respect auto_deduct_enabled from Payroll Calendar (server-side)
  let autoDeductEnabled = true;
  try {
    const scheduleSheet = getBatchSheet(batchId, 'Payroll_Schedules');
    if (scheduleSheet) {
      const schedData = scheduleSheet.getDataRange().getValues();
      for (let i = 1; i < schedData.length; i++) {
        if (String(schedData[i][0] || '').trim() === monthPeriod) {
          const val = schedData[i][5];
          if (val !== '' && val !== undefined && val !== null) {
            autoDeductEnabled = val === true || String(val).toUpperCase() === 'TRUE' || String(val) === '1';
          }
          break;
        }
      }
    }
  } catch (e) {}
  if (!autoDeductEnabled) {
    return { status: 'ERROR', message: 'Auto-deduct is disabled for month ' + monthPeriod + ' in the Payroll Calendar' };
  }

  // P0-2 / P1-5: Load executed item ids from Deduction_History to block double-execution
  const executedByIds = {};
  const executedOneTimeIds = {};
  try {
    const historySheet = getBatchSheet(batchId, 'Deduction_History');
    if (historySheet) {
      const histData = historySheet.getDataRange().getValues();
      for (let i = 1; i < histData.length; i++) {
        const row = histData[i];
        if (!row[0]) continue;
        const histMonth = String(row[1] || '').trim();
        let snapshot = [];
        try { if (row[12]) snapshot = JSON.parse(String(row[12])); } catch (e) {}
        for (let k = 0; k < snapshot.length; k++) {
          const item = snapshot[k];
          if (!item || !item.id) continue;
          if (histMonth === monthPeriod) executedByIds[String(item.id)] = true;
          if (String(item.schedule_type || '') === 'ONE_TIME') executedOneTimeIds[String(item.id)] = true;
        }
      }
    }
  } catch (e) {}

  const items = payload.deduction_items || [];
  if (items.length === 0) {
    return { status: 'ERROR', message: 'No deduction items provided' };
  }

  // P1-5: Filter by schedule_type + DATE_RANGE window + dedupe by history
  const effectiveItems = [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.is_enabled === false) continue;
    const itemId = String(it.id || '');
    if (itemId && (executedByIds[itemId] || executedOneTimeIds[itemId])) continue;
    const schedType = String(it.schedule_type || 'MONTHLY_RECURRING');
    if (schedType === 'DATE_RANGE') {
      const startDate = formatGasDateHelper(it.start_date);
      const endDate = formatGasDateHelper(it.end_date);
      if (startDate || endDate) {
        const monthStart = parseGasDate(monthPeriod + '-01');
        const monthEnd = parseGasDate(monthEndDate(monthPeriod));
        const s = parseGasDate(startDate);
        const e = parseGasDate(endDate);
        if (monthStart && monthEnd) {
          const overlap = (!s || s <= monthEnd) && (!e || e >= monthStart);
          if (!overlap) continue;
        }
      }
    }
    effectiveItems.push(it);
  }

  if (effectiveItems.length === 0) {
    return { status: 'ERROR', message: 'All deduction items were already executed for month ' + monthPeriod + ' or are outside the active date range' };
  }

  let totalAllowanceDeduction = 0;
  let totalCashDeduction = 0;
  let totalSalaryDeduction = 0;

  for (let k = 0; k < effectiveItems.length; k++) {
    const it = effectiveItems[k];
    const amt = Number(it.amount) || 0;
    const wallet = String(it.target_wallet || payload.target_wallet || 'SALARY').toUpperCase();
    if (wallet === 'ALLOWANCE') totalAllowanceDeduction += amt;
    else if (wallet === 'CASH') totalCashDeduction += amt;
    else totalSalaryDeduction += amt;
  }

  const grandTotalPerSoldier = totalAllowanceDeduction + totalCashDeduction + totalSalaryDeduction;
  if (grandTotalPerSoldier <= 0) {
    return { status: 'ERROR', message: 'Total deduction per soldier must be greater than 0 baht' };
  }

  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const creditLogsSheet = getBatchSheet(batchId, 'Credit_Logs');
  if (!soldierSheet) {
    return { status: 'ERROR', message: 'Soldiers sheet not found' };
  }

  const targetCodes = payload.target_soldier_ids && Array.isArray(payload.target_soldier_ids) 
    ? new Set(payload.target_soldier_ids) 
    : null;
  const adminStr = (payload.admin_user_id || 'ADMIN') + ' (' + (payload.admin_name || 'Admin') + ')';
  const nowStr = new Date().toISOString();

  const data = soldierSheet.getDataRange().getValues();
  const logsToAppend = [];
  let affectedCount = 0;
  let totalActuallyDeducted = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const pxCode = String(row[0]).trim();
    if (!pxCode) continue;

    if (targetCodes && !targetCodes.has(pxCode)) continue;
    const status = String(row[9] || 'ACTIVE').toUpperCase();
    if (status !== 'ACTIVE') continue;

    let currentDeductions = Number(row[5]) || 0;
    let currentAllowance = Number(row[6]) || 0;
    let currentCash = Number(row[7]) || 0;

    // 1. Process Allowance Deduction (P1-7: log ACTUAL deducted amount)
    if (totalAllowanceDeduction > 0) {
      const before = currentAllowance;
      const after = Math.max(0, before - totalAllowanceDeduction);
      const actual = before - after;
      if (actual > 0) {
        soldierSheet.getRange(i + 1, 7).setValue(after);
        logsToAppend.push([
          'DED-' + Utilities.getUuid().slice(0, 8),
          pxCode,
          'MONTHLY_DEDUCTION',
          'ALLOWANCE',
          actual,
          before,
          after,
          'PERIOD-' + monthPeriod,
          adminStr,
          nowStr
        ]);
        totalActuallyDeducted += actual;
      }
    }

    // 2. Process Cash Deduction
    if (totalCashDeduction > 0) {
      const before = currentCash;
      const after = Math.max(0, before - totalCashDeduction);
      const actual = before - after;
      if (actual > 0) {
        soldierSheet.getRange(i + 1, 8).setValue(after);
        logsToAppend.push([
          'DED-' + Utilities.getUuid().slice(0, 8),
          pxCode,
          'MONTHLY_DEDUCTION',
          'CASH',
          actual,
          before,
          after,
          'PERIOD-' + monthPeriod,
          adminStr,
          nowStr
        ]);
        totalActuallyDeducted += actual;
      }
    }

    // 3. Process Salary Base Deduction
    if (totalSalaryDeduction > 0) {
      const before = currentDeductions;
      const after = currentDeductions + totalSalaryDeduction;
      const actual = after - before;
      soldierSheet.getRange(i + 1, 6).setValue(after);
      logsToAppend.push([
        'DED-' + Utilities.getUuid().slice(0, 8),
        pxCode,
        'MONTHLY_DEDUCTION',
        'SALARY',
        actual,
        before,
        after,
        'PERIOD-' + monthPeriod,
        adminStr,
        nowStr
      ]);
      totalActuallyDeducted += actual;
    }

    affectedCount++;
  }

  if (logsToAppend.length > 0 && creditLogsSheet) {
    const startRow = creditLogsSheet.getLastRow() + 1;
    creditLogsSheet.getRange(startRow, 1, logsToAppend.length, logsToAppend[0].length).setValues(logsToAppend);
  }

  return {
    status: 'SUCCESS',
    success: true,
    month_period: monthPeriod,
    affected_count: affectedCount,
    total_deducted: totalActuallyDeducted,
    executed_items: effectiveItems,
    message: 'Monthly deductions completed for ' + affectedCount + ' soldiers, total ' + totalActuallyDeducted + ' baht'
  };
}

/**
 * Ensure a batch-scoped table exists (creates it with canonical headers when missing).
 * Needed for tables added after a batch spreadsheet was already provisioned.
 */
function ensureBatchSheet(batchId, tableName) {
  let sheet = getBatchSheet(batchId, tableName);
  if (sheet) return sheet;

  const headers = CANONICAL_BATCH_HEADERS[tableName] || [];
  const batchSS = getBatchSpreadsheet(batchId);
  try {
    sheet = batchSS.insertSheet(tableName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }
    return sheet;
  } catch (e) {
    console.warn('Could not create sheet ' + tableName + ': ' + e.toString());
    return null;
  }
}

/**
 * 27. PAYROLL CALENDAR SCHEDULES (replaces frontend localStorage)
 */
function handleGetPayrollSchedules(batchId) {
  if (!batchId) {
    return { status: 'ERROR', message: 'batchId is required' };
  }

  const sheet = ensureBatchSheet(batchId, 'Payroll_Schedules');
  if (!sheet) {
    return { status: 'SUCCESS', success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  const schedules = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    schedules.push({
      month_key: String(row[0]).trim(),
      month_label: row[1] ? String(row[1]) : '',
      payday_date: formatGasDateHelper(row[2]),
      cutoff_date: formatGasDateHelper(row[3]),
      salary_base: Number(row[4]) || 0,
      auto_deduct_enabled: row[5] === true || String(row[5]).toUpperCase() === 'TRUE' || String(row[5]) === '1',
      status: String(row[6] || 'SCHEDULED')
    });
  }

  return { status: 'SUCCESS', success: true, data: schedules };
}

function handleSavePayrollSchedules(batchId, payload) {
  if (!batchId || !payload) {
    return { status: 'ERROR', message: 'batchId and payload are required' };
  }

  const guard = isBatchGuardExpired(batchId);
  if (!guard.allowed) {
    return { status: 'ERROR', message: guard.reason };
  }

  const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];
  if (schedules.length === 0) {
    return { status: 'ERROR', message: 'schedules must be a non-empty array' };
  }

  const sheet = ensureBatchSheet(batchId, 'Payroll_Schedules');
  if (!sheet) {
    return { status: 'ERROR', message: 'Payroll_Schedules sheet not found' };
  }

  const rows = schedules.map(function(s) {
    return [
      String(s.month_key || ''),
      String(s.month_label || ''),
      formatGasDateHelper(s.payday_date),
      formatGasDateHelper(s.cutoff_date),
      Number(s.salary_base) || 0,
      s.auto_deduct_enabled !== false,
      String(s.status || 'SCHEDULED')
    ];
  });

  try {
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).clearContent();
    }
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  } catch (e) {
    return { status: 'ERROR', message: 'Failed to save payroll schedules: ' + e.toString() };
  }

  return { status: 'SUCCESS', success: true, saved_count: rows.length, data: schedules };
}

/**
 * 28. MONTHLY DEDUCTION CONFIGS (replaces frontend localStorage)
 */
function handleGetDeductionConfigs(batchId) {
  if (!batchId) {
    return { status: 'ERROR', message: 'batchId is required' };
  }

  const sheet = ensureBatchSheet(batchId, 'Deduction_Configs');
  if (!sheet) {
    return { status: 'SUCCESS', success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === 'items') {
      try {
        const parsed = JSON.parse(String(data[i][1] || '[]'));
        if (Array.isArray(parsed)) {
          return { status: 'SUCCESS', success: true, data: parsed };
        }
      } catch (e) {}
    }
  }

  return { status: 'SUCCESS', success: true, data: [] };
}

function handleSaveDeductionConfigs(batchId, payload) {
  if (!batchId || !payload) {
    return { status: 'ERROR', message: 'batchId and payload are required' };
  }

  const guard = isBatchGuardExpired(batchId);
  if (!guard.allowed) {
    return { status: 'ERROR', message: guard.reason };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return { status: 'ERROR', message: 'items must be a non-empty array' };
  }

  const sheet = ensureBatchSheet(batchId, 'Deduction_Configs');
  if (!sheet) {
    return { status: 'ERROR', message: 'Deduction_Configs sheet not found' };
  }

  const nowStr = new Date().toISOString();
  const json = JSON.stringify(items);
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === 'items') {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, 3).setValues([['items', json, nowStr]]);
  } else {
    sheet.appendRow(['items', json, nowStr]);
  }

  return { status: 'SUCCESS', success: true, saved_count: items.length, data: items };
}

/**
 * 29. MONTHLY DEDUCTION EXECUTION HISTORY (replaces frontend localStorage)
 */
function handleGetDeductionHistory(batchId) {
  if (!batchId) {
    return { status: 'ERROR', message: 'batchId is required' };
  }

  const sheet = ensureBatchSheet(batchId, 'Deduction_History');
  if (!sheet) {
    return { status: 'SUCCESS', success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    let snapshot = [];
    try {
      if (row[12]) snapshot = JSON.parse(String(row[12]));
    } catch (e) {}

    records.push({
      id: String(row[0]),
      month_period: String(row[1] || ''),
      month_label: String(row[2] || ''),
      executed_at: String(row[3] || ''),
      executed_by_id: String(row[4] || ''),
      executed_by_name: String(row[5] || ''),
      target_soldier_count: Number(row[6]) || 0,
      total_deduction_amount: Number(row[7]) || 0,
      per_soldier_amount: Number(row[8]) || 0,
      salary_deductions: Number(row[9]) || 0,
      allowance_deductions: Number(row[10]) || 0,
      cash_deductions: Number(row[11]) || 0,
      items_snapshot: Array.isArray(snapshot) ? snapshot : [],
      status: String(row[13] || 'COMPLETED')
    });
  }

  records.reverse(); // newest first
  return { status: 'SUCCESS', success: true, data: records };
}

function handleSaveDeductionHistory(batchId, payload) {
  if (!batchId || !payload) {
    return { status: 'ERROR', message: 'batchId and payload are required' };
  }

  const record = payload.record || payload;
  if (!record || !record.id) {
    return { status: 'ERROR', message: 'record.id is required' };
  }

  const sheet = ensureBatchSheet(batchId, 'Deduction_History');
  if (!sheet) {
    return { status: 'ERROR', message: 'Deduction_History sheet not found' };
  }

  sheet.appendRow([
    String(record.id),
    String(record.month_period || ''),
    String(record.month_label || ''),
    String(record.executed_at || new Date().toISOString()),
    String(record.executed_by_id || ''),
    String(record.executed_by_name || ''),
    Number(record.target_soldier_count) || 0,
    Number(record.total_deduction_amount) || 0,
    Number(record.per_soldier_amount) || 0,
    Number(record.salary_deductions) || 0,
    Number(record.allowance_deductions) || 0,
    Number(record.cash_deductions) || 0,
    JSON.stringify(record.items_snapshot || []),
    String(record.status || 'COMPLETED')
  ]);

  return { status: 'SUCCESS', success: true, data: record };
}

/**
 * 26. BATCH & INDIVIDUAL SALARY TOP-UP WITH AUDIT LOGS
 */
function handleBatchSalaryTopup(batchId, payload) {
  if (!payload || !batchId) {

  // P0-4: Backend batchGuard (frontend-only blocking is not enough)
  const guard = isBatchGuardExpired(batchId);
  if (!guard.allowed) {
    return { status: 'ERROR', message: guard.reason };
  }

  // P1-12: Tag every top-up log with its month period for monthly accounting
  const monthPeriod = payload.month_period || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
    return { status: 'ERROR', message: 'ข้อมูลไม่ครบถ้วน' };
  }

  const isCustomGrid = payload.topup_type === 'CUSTOM_GRID' && Array.isArray(payload.items) && payload.items.length > 0;
  const singleAmount = Number(payload.amount) || 0;

  if (!isCustomGrid && singleAmount <= 0) {
    return { status: 'ERROR', message: 'จำนวนเงินที่เพิ่มต้องมากกว่า 0 บาท' };
  }

  const note = payload.note ? String(payload.note).trim() : 'เติมเงินเดือน/เบี้ยเลี้ยง';
  const adminStr = (payload.user_id || 'ADMIN') + ' (' + (payload.user_name || 'Admin') + ') [' + note + ']';
  const defaultTargetWallet = payload.wallet_target || 'CREDIT_LIMIT';

  // Build lookup map if custom grid
  const itemMap = {};
  if (isCustomGrid) {
    for (let j = 0; j < payload.items.length; j++) {
      const it = payload.items[j];
      if (it && it.px_code) {
        itemMap[String(it.px_code).trim()] = it;
      }
    }
  }

  const targetCodes = payload.soldier_px_codes && Array.isArray(payload.soldier_px_codes) 
    ? new Set(payload.soldier_px_codes) 
    : (isCustomGrid ? new Set(Object.keys(itemMap)) : null);

  const soldierSheet = getBatchSheet(batchId, 'Soldiers');
  const creditLogsSheet = getBatchSheet(batchId, 'Credit_Logs');
  if (!soldierSheet) {
    return { status: 'ERROR', message: 'ไม่พบตารางข้อมูลทหารของผลัด ' + batchId };
  }

  const data = soldierSheet.getDataRange().getValues();
  const logsToAppend = [];
  let updatedCount = 0;
  let totalDistributedAmount = 0;
  const nowStr = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const pxCode = String(row[0]).trim();
    if (!pxCode) continue;

    if (targetCodes && !targetCodes.has(pxCode)) continue;
    const status = String(row[9] || 'ACTIVE').toUpperCase();
    if (status !== 'ACTIVE' && payload.topup_type === 'BATCH_ALL') continue;

    let targetWallet = defaultTargetWallet;
    let amount = singleAmount;
    let itemNote = note;

    if (isCustomGrid) {
      const gridItem = itemMap[pxCode];
      if (!gridItem) continue;
      amount = Number(gridItem.amount) || 0;
      if (amount <= 0) continue;
      targetWallet = gridItem.wallet_target || defaultTargetWallet;
      if (gridItem.note && String(gridItem.note).trim()) {
        itemNote = String(gridItem.note).trim();
      }
    }

    let currentLimit = Number(row[4]) || 0;
    let currentAllowance = Number(row[6]) || 0;
    let currentCash = Number(row[7]) || 0;
    let balanceBefore = 0;
    let balanceAfter = 0;

    if (targetWallet === 'CREDIT_LIMIT') {
      balanceBefore = currentLimit;
      balanceAfter = currentLimit + amount;
      soldierSheet.getRange(i + 1, 5).setValue(balanceAfter);
      soldierSheet.getRange(i + 1, 7).setValue(currentAllowance + amount);
    } else if (targetWallet === 'CREDIT_BALANCE') {
      balanceBefore = currentAllowance;
      balanceAfter = currentAllowance + amount;
      soldierSheet.getRange(i + 1, 7).setValue(balanceAfter);
    } else {
      // CASH_WALLET
      balanceBefore = currentCash;
      balanceAfter = currentCash + amount;
      soldierSheet.getRange(i + 1, 8).setValue(balanceAfter);
    }

    const logId = 'TOP-' + Utilities.getUuid().slice(0, 8);
    const itemAdminStr = (payload.user_id || 'ADMIN') + ' (' + (payload.user_name || 'Admin') + ') [' + itemNote + ']';
    logsToAppend.push([
      logId,
      pxCode,
      'SALARY_TOPUP',
      targetWallet,
      amount,
      balanceBefore,
      balanceAfter,
      'PERIOD-' + monthPeriod,
      itemAdminStr,
      nowStr
    ]);

    updatedCount++;
    totalDistributedAmount += amount;
  }

  if (logsToAppend.length > 0 && creditLogsSheet) {
    const startRow = creditLogsSheet.getLastRow() + 1;
    creditLogsSheet.getRange(startRow, 1, logsToAppend.length, logsToAppend[0].length).setValues(logsToAppend);
  }

  return {
    status: 'SUCCESS',
    success: true,
    updated_count: updatedCount,
    total_amount: totalDistributedAmount,
    message: 'เพิ่มเงินเดือน/เบี้ยเลี้ยงสำเร็จ ' + updatedCount + ' นาย รวม ฿' + totalDistributedAmount.toLocaleString()
  };
}


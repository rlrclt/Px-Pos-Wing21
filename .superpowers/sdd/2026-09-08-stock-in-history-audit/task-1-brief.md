# Task 1 Brief — Stock-In History: Backend GAS `handleGetStockInLogs`

## Context
This is Task 1 of 6 in the Stock-In History & Product Audit Trail plan.
The project is a React 19 + TypeScript PWA for an army PX store management system.
Backend is Google Apps Script (GAS) writing to Google Sheets.

## Your Task
Implement `handleGetStockInLogs(params)` in `backend/gas/Code.js` and wire its routes.

## Requirements (verbatim)

### 1. Implement `handleGetStockInLogs(params)` in `backend/gas/Code.js`

Implement `handleGetStockInLogs(params)` with the following specifications:
1. Fetch `Stock_In_Logs`, `Product_Catalog`, and `Sellers` from Master Spreadsheet.
2. If `Stock_In_Logs` does not exist, initialize it via `getOrCreateStockInLogsSheet()` — this function already exists in the codebase.
3. Map catalog entries by `barcode` (column index 0 = barcode, 1 = product_name, 2 = image_url, 3 = unit_name, 5 = category) to attach `product_name`, `category`, `unit_name`, `image_url`.
4. Map sellers by `seller_id` (column 0 = seller_id, 1 = seller_name) to attach `seller_name`.
5. `Stock_In_Logs` sheet column mapping (0-indexed):
   - 0: `log_id`
   - 1: `barcode`
   - 2: `quantity_added`
   - 3: `cost_price_unit`
   - 4: `total_cost`
   - 5: `seller_id`
   - 6: `received_by`
   - 7: `received_at` (ISO string)
   - 8: `invoice_ref`
6. Support filtering via `params` object:
   - `barcode`: Exact match on `barcode` column.
   - `seller_id`: Exact match on `seller_id` column.
   - `date_preset` options:
     * `'today'`: Bangkok timezone today 00:00:00 to 23:59:59. Use `Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd')` to get today's date string, then parse as start/end of day.
     * `'this_month'`: Bangkok timezone 1st of current month 00:00:00 to now.
     * `'all'` (default if no date params): no date filtering.
   - `date_from` (YYYY-MM-DD string): Filter `received_at >= date_from 00:00:00`.
   - `date_to` (YYYY-MM-DD string): Filter `received_at <= date_to 23:59:59`.
   - When both `date_from` and `date_to` are present, they override `date_preset`.
7. Compute summary:
   - `total_logs`: Count of matching rows.
   - `total_quantity`: Sum of `quantity_added` (Number) of matching rows.
   - `total_cost_amount`: Sum of `total_cost` (Number) of matching rows.
8. Sort matching rows in reverse chronological order (newest `received_at` first).
9. Return:
```javascript
{
  status: 'SUCCESS',
  success: true,
  data: logs,   // array of enriched log objects
  summary: {
    total_logs: logs.length,
    total_quantity: totalQty,
    total_cost_amount: totalCost
  }
}
```
Each log object:
```javascript
{
  log_id: String,
  barcode: String,
  product_name: String,
  unit_name: String,
  category: String,
  image_url: String,
  quantity_added: Number,
  cost_price_unit: Number,
  total_cost: Number,
  seller_id: String,
  seller_name: String,
  received_by: String,
  received_at: String,  // ISO string as stored
  invoice_ref: String
}
```

### 2. Wire routes in `doGet` and `doPost` in `backend/gas/Code.js`

In `doGet` (inside the `switch(action)` block):
```javascript
case 'getStockInLogs':
  data = handleGetStockInLogs(e.parameter);
  break;
```

In `doPost` (inside the `switch(payload.action)` block):
```javascript
case 'getStockInLogs':
  response = handleGetStockInLogs(payload);
  break;
```

## Global Constraints
- NO mock data. All data from Google Sheets.
- GAS uses V8 runtime, no Node.js APIs.
- Use Bangkok timezone for date logic: `'Asia/Bangkok'`.
- Do NOT run npm run build or npm test.

## Report File
Write your full implementation report to:
`/Users/khamseankhampang/Desktop/yoru work/.superpowers/sdd/2026-09-08-stock-in-history-audit/task-1-report.md`

Report must include:
- Files modified
- Summary of changes
- Verification run: `npx tsc --noEmit` result (this is frontend check, but note you only edited .js backend — just confirm you saved the file correctly)
- Any concerns

## Contract
Return ONLY one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
Do NOT dispatch subagents or reviewers.

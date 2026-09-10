# Task 2 Brief — Stock-In History: TypeScript Schema & Frontend API Client

## Context
This is Task 2 of 6 in the Stock-In History & Product Audit Trail plan.
Task 1 is complete: `handleGetStockInLogs(params)` is implemented in `backend/gas/Code.js` and routed.
This task adds TypeScript types and an API client method.

## Your Task
Modify `src/types/schema.ts` and `src/core/api.ts` to add types and the `getStockInLogs` method.

## Requirements

### Step 1: Add types in `src/types/schema.ts`

Export these interfaces at the bottom of the file (before any export or after the last export):
```typescript
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
  date_preset?: 'today' | 'this_month' | 'custom' | 'all';
  date_from?: string;
  date_to?: string;
}
```

### Step 2: Add `getStockInLogs` to `src/core/api.ts`

First, import the new types at the top of `src/core/api.ts` where other types are imported from schema:
```typescript
import type { StockInLogFilters, StockInLogsResponse } from '../types/schema.ts';
```
(Merge into the existing import from schema if one already exists)

Then add this method to the `PXApiClient` class (match the style of `getProducts` or similar existing methods):
```typescript
async getStockInLogs(filters?: StockInLogFilters): Promise<StockInLogsResponse> {
  const params = new URLSearchParams({ action: 'getStockInLogs' });
  if (filters?.barcode) params.set('barcode', filters.barcode);
  if (filters?.seller_id) params.set('seller_id', filters.seller_id);
  if (filters?.date_preset) params.set('date_preset', filters.date_preset);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);

  try {
    const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.error('Failed to fetch stock in logs:', err);
    return {
      status: 'ERROR',
      success: false,
      data: [],
      summary: { total_logs: 0, total_quantity: 0, total_cost_amount: 0 },
      error: err.message || 'ไม่สามารถดึงประวัติการรับเข้าสต็อกได้'
    };
  }
}
```

### Step 3: Run type check
Run: `npx tsc --noEmit`
Expected: Exit code 0, no errors.

## Global Constraints
- NEVER run `npm run build` or `npm test`.
- Only `npx tsc --noEmit` for verification.

## Report File
Write your full implementation report to:
`/Users/khamseankhampang/Desktop/yoru work/.superpowers/sdd/2026-09-08-stock-in-history-audit/task-2-report.md`

Report must include:
- Files modified
- Summary of changes
- `npx tsc --noEmit` output (must be clean)
- Any concerns

## Contract
Return ONLY one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
Do NOT dispatch subagents or reviewers.

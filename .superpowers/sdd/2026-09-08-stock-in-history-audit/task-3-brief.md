# Task 3 Brief — Stock-In History: `StockInHistoryModal.tsx` (Global History & KPI Analytics)

## Context
This is Task 3 of 6 in the Stock-In History & Product Audit Trail plan.

**Completed tasks:**
- Task 1: `handleGetStockInLogs(params)` in `backend/gas/Code.js`
- Task 2: Types (`StockInLogEntry`, `StockInLogsSummary`, `StockInLogsResponse`, `StockInLogFilters`) in `src/types/schema.ts` + `api.getStockInLogs(filters?)` in `src/core/api.ts`

## Your Task
Create `src/features/inventory/components/StockInHistoryModal.tsx` — a full-page admin modal for viewing all Stock-In history with KPI summary and filtering.

## Requirements

### Props Interface
```typescript
interface StockInHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveSellers: Seller[];           // from src/types/schema.ts
  liveProducts: ProductCatalog[];  // from src/types/schema.ts
  onOpenProductHistory?: (product: ProductCatalog) => void;
}
```

### Component Structure

**1. Overall layout:**
- Fixed overlay modal (full-screen on mobile, max-w-5xl on desktop)
- Dark/light theme via `useTheme()` hook from `src/hooks/useTheme.ts`
- Toast notifications via `useToast()` hook from `src/hooks/useToast.ts`

**2. State:**
```typescript
const [logs, setLogs] = useState<StockInLogEntry[]>([]);
const [summary, setSummary] = useState<StockInLogsSummary>({ total_logs: 0, total_quantity: 0, total_cost_amount: 0 });
const [isLoading, setIsLoading] = useState(false);
const [datePreset, setDatePreset] = useState<'today' | 'this_month' | 'all' | 'custom'>('today');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');
const [filterSellerId, setFilterSellerId] = useState('');
const [searchQuery, setSearchQuery] = useState('');
```

**3. Data fetching:**
```typescript
const fetchLogs = async () => {
  setIsLoading(true);
  const filters: StockInLogFilters = {
    date_preset: datePreset !== 'custom' ? datePreset : undefined,
    date_from: datePreset === 'custom' ? dateFrom : undefined,
    date_to: datePreset === 'custom' ? dateTo : undefined,
    seller_id: filterSellerId || undefined,
  };
  const res = await api.getStockInLogs(filters);
  if (res.success) {
    setLogs(res.data);
    setSummary(res.summary);
  }
  setIsLoading(false);
};
```
Trigger `fetchLogs` on mount (when `isOpen` becomes true) and when filters change.
Use `useEffect(() => { if (isOpen) fetchLogs(); }, [isOpen, datePreset, filterSellerId])`.
Custom date range: only fetch when both `dateFrom` and `dateTo` are set.

**4. Search filter (client-side):**
```typescript
const filteredLogs = logs.filter(log => {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (
    log.product_name.toLowerCase().includes(q) ||
    log.barcode.toLowerCase().includes(q) ||
    (log.invoice_ref || '').toLowerCase().includes(q) ||
    log.received_by.toLowerCase().includes(q)
  );
});
```

**5. Header section:**
```
📜 ประวัติการรับเข้าสต็อก (Stock-In History)
[Refresh button]
```

**6. Quick Filter Chips (row of buttons):**
- `📅 วันนี้` — sets `datePreset = 'today'`
- `🗓️ เดือนนี้` — sets `datePreset = 'this_month'`
- `📦 ทั้งหมด` — sets `datePreset = 'all'`
- `🎯 กำหนดเอง` — sets `datePreset = 'custom'`, shows two date inputs
Active chip gets highlighted border/bg style.

**7. Seller filter dropdown:**
```tsx
<select value={filterSellerId} onChange={(e) => setFilterSellerId(e.target.value)}>
  <option value="">-- ทุก Seller --</option>
  {liveSellers.map(s => <option key={s.seller_id} value={s.seller_id}>🏪 {s.seller_name}</option>)}
</select>
```

**8. Search input:** placeholder `ค้นหาชื่อสินค้า บาร์โค้ด เลขบิล ผู้รับ...`

**9. KPI Summary Cards (3 cards in a grid):**
```tsx
// Card 1
📦 ยอดรับเข้าสุทธิ
{summary.total_quantity} ชิ้น/หน่วย

// Card 2
💰 มูลค่ารับเข้ารวม
฿{summary.total_cost_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}

// Card 3
🧾 จำนวนรอบรับเข้า
{summary.total_logs} ครั้ง
```

**10. Log Table (desktop) / Cards (mobile):**
Columns: วันที่-เวลา | สินค้า (thumbnail + name + barcode + category) | จำนวน | ราคาทุน/หน่วย | มูลค่ารวม | ผู้ฝากขาย | ผู้รับ / เลขบิล

Date format: `new Date(log.received_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })`

Product cell: if `log.image_url` show 40px thumbnail, then `log.product_name`, then `log.barcode` in font-mono smaller text.

**11. Empty state:** when `filteredLogs.length === 0 && !isLoading`:
```
📭 ไม่พบประวัติการรับเข้าในช่วงเวลาที่เลือก
```

**12. Loading state:** show spinner/pulse skeleton instead of table.

## Imports to use
```typescript
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Search, Package, Boxes, TrendingUp, DollarSign, Calendar, Filter } from 'lucide-react';
import { api } from '../../../core/api.ts';
import type { StockInLogEntry, StockInLogsSummary, StockInLogFilters } from '../../../types/schema.ts';
import type { Seller, ProductCatalog } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';
```

## Global Constraints
- React 19 + TypeScript — no class components, no PropTypes
- Tailwind CSS only — no inline style objects (except specific overrides)
- NEVER run `npm run build` or `npm test`
- Run `npx tsc --noEmit` to verify

## Report File
Write your full implementation report to:
`/Users/khamseankhampang/Desktop/yoru work/.superpowers/sdd/2026-09-08-stock-in-history-audit/task-3-report.md`

Report must include:
- Files created
- Summary of implementation
- `npx tsc --noEmit` output (must be exit code 0)
- Any concerns

## Contract
Return ONLY one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
Do NOT dispatch subagents or reviewers.

# Task 4 Brief — Stock-In History: `ProductStockHistoryModal.tsx` (Single Product Drill-Down)

## Context
This is Task 4 of 6 in the Stock-In History & Product Audit Trail plan.

**Completed tasks:**
- Task 1: `handleGetStockInLogs(params)` in `backend/gas/Code.js`
- Task 2: Types + `api.getStockInLogs` in `src/types/schema.ts` / `src/core/api.ts`
- Task 3: `StockInHistoryModal.tsx` — global history modal with KPI cards

## Your Task
Create `src/features/inventory/components/ProductStockHistoryModal.tsx` — a drill-down modal showing a single product's restock history timeline.

## Requirements

### Props Interface
```typescript
interface ProductStockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCatalog | null;      // from src/types/schema.ts
  liveSellers?: Seller[];              // from src/types/schema.ts
  onOpenStockIn?: (barcode: string) => void;  // optional: quick-open StockInModal
}
```

### State
```typescript
const [logs, setLogs] = useState<StockInLogEntry[]>([]);
const [summary, setSummary] = useState<StockInLogsSummary>({ total_logs: 0, total_quantity: 0, total_cost_amount: 0 });
const [isLoading, setIsLoading] = useState(false);
```

### Data Fetching
```typescript
useEffect(() => {
  if (isOpen && product) {
    const fetchProductLogs = async () => {
      setIsLoading(true);
      const res = await api.getStockInLogs({ barcode: product.barcode, date_preset: 'all' });
      if (res.success) {
        setLogs(res.data);
        setSummary(res.summary);
      }
      setIsLoading(false);
    };
    fetchProductLogs();
  }
}, [isOpen, product?.barcode]);
```

Reset logs/summary to empty when `isOpen` becomes false.

### Layout

**Guard:** `if (!isOpen || !product) return null;`

**Resolved seller** (look up from `liveSellers`):
```typescript
const productSeller = liveSellers?.find(s => s.seller_id === product.seller_id);
const sellerDisplayName = productSeller
  ? `🏪 ${productSeller.seller_name} (${productSeller.seller_id})`
  : product.seller_id
  ? `🏪 ${product.seller_id}`
  : '🏢 สินค้าส่วนกลาง (กองร้อย)';
```

**Current stock:**
```typescript
const currentStock = (product as any).stock_qty !== undefined ? Number((product as any).stock_qty) || 0 : 0;
```

**1. Header:**
```
[Product image or icon] [Product name] [Category badge] [Seller badge]
Barcode: {product.barcode}  Current stock: {currentStock} {product.unit_name}
                                                    [X close button]
```

**2. Stats mini-grid (3 stat cards):**
```
📦 รับเข้ารวมทั้งหมด        💰 มูลค่าทุนรวม            📅 รับเข้าล่าสุด
{summary.total_quantity}    ฿{summary.total_cost_amount}   {logs[0]?.received_at ?? '-'}
{product.unit_name}         บาท                            โดย {logs[0]?.received_by ?? '-'}
```

Date for last restocked: `new Date(logs[0].received_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })`

**3. Quick action button** (top right or bottom of header):
```tsx
{onOpenStockIn && (
  <button onClick={() => { onOpenStockIn(product.barcode); onClose(); }}>
    📥 รับเข้าสต็อกเพิ่มทันที
  </button>
)}
```
Style: emerald filled button, small.

**4. Timeline table:**
Columns: ลำดับ | วันที่-เวลา | จำนวนที่รับเข้า | ราคาทุน/หน่วย | มูลค่าล็อตนี้ | เลขบิล | ผู้รับ

Date format: `new Date(log.received_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })`

Show row number (1, 2, 3...) from newest to oldest.

**5. Loading state:** spinner/pulse skeleton rows.

**6. Empty state** when `logs.length === 0 && !isLoading`:
```
📭 ยังไม่มีประวัติการรับเข้าของสินค้านี้
กด "รับเข้าสต็อกเพิ่มทันที" เพื่อเริ่มบันทึก
```

## Imports to use
```typescript
import React, { useState, useEffect } from 'react';
import { X, Package, ImageIcon, Building2, TrendingUp, DollarSign, Calendar, Clock } from 'lucide-react';
import { api } from '../../../core/api.ts';
import type { StockInLogEntry, StockInLogsSummary } from '../../../types/schema.ts';
import type { ProductCatalog, Seller } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
```

## Global Constraints
- React 19 + TypeScript — no class components
- Tailwind CSS only
- NEVER run `npm run build` or `npm test`
- Run `npx tsc --noEmit` to verify — must be exit code 0

## Report File
Write your full implementation report to:
`/Users/khamseankhampang/Desktop/yoru work/.superpowers/sdd/2026-09-08-stock-in-history-audit/task-4-report.md`

Report must include:
- Files created
- Summary of implementation
- `npx tsc --noEmit` output (must be exit code 0)
- Any concerns

## Contract
Return ONLY one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
Do NOT dispatch subagents or reviewers.

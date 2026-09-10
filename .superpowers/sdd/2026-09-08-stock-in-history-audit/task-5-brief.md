# Task 5 Brief — Stock-In History: Integrate into `ProductsTab.tsx` and `AdminView.tsx`

## Context
This is Task 5 of 6 in the Stock-In History & Product Audit Trail plan.

**Completed tasks:**
- Task 1: Backend GAS `handleGetStockInLogs`
- Task 2: Schema types & `api.getStockInLogs`
- Task 3: `StockInHistoryModal.tsx`
- Task 4: `ProductStockHistoryModal.tsx`

## Your Task
Integrate both modals into `src/features/admin/components/ProductsTab.tsx` and `src/features/admin/AdminView.tsx`.

## Requirements

### 1. Update `src/features/admin/components/ProductsTab.tsx`
- In `ProductsTabProps`:
  ```typescript
  onOpenStockInHistory?: () => void;
  onOpenProductHistory?: (product: ProductCatalog) => void;
  ```
- In component destructured props:
  Add `onOpenStockInHistory`, `onOpenProductHistory`.
- In header actions (next to `📥 รับของเข้าสต็อก (Stock In)` button):
  Add a button:
  ```tsx
  {onOpenStockInHistory && (
    <button
      onClick={onOpenStockInHistory}
      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
        isLight
          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
          : 'bg-[#182033] hover:bg-[#202b45] border-[#2b3a55] text-slate-200'
      }`}
      title="ดูประวัติการรับเข้าสต็อกทั้งหมดในระบบ"
    >
      <History className="w-3.5 h-3.5 text-indigo-500" />
      <span>ประวัติรับเข้าสต็อก</span>
    </button>
  )}
  ```
  (Import `History` or `FileText` / `Clock` from `lucide-react`)
- In each product table row (in the action buttons cell alongside `Quick Restock` and `Edit`):
  Add a history button:
  ```tsx
  {onOpenProductHistory && (
    <button
      onClick={() => onOpenProductHistory(product)}
      className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer mr-1 ${
        isLight 
          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200' 
          : 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/50'
      }`}
      title="ดูประวัติการรับเข้าของสินค้านี้"
    >
      <History className="w-3.5 h-3.5" />
    </button>
  )}
  ```

### 2. Update `src/features/admin/AdminView.tsx`
- Import modals:
  ```typescript
  import { StockInHistoryModal } from '../inventory/components/StockInHistoryModal.tsx';
  import { ProductStockHistoryModal } from '../inventory/components/ProductStockHistoryModal.tsx';
  ```
- Add states in `AdminView`:
  ```typescript
  const [isStockInHistoryOpen, setIsStockInHistoryOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<ProductCatalog | null>(null);
  ```
- Pass props to `<ProductsTab />`:
  ```tsx
  onOpenStockInHistory={() => setIsStockInHistoryOpen(true)}
  onOpenProductHistory={(prod) => setSelectedHistoryProduct(prod)}
  ```
- Render modals at bottom of `AdminView`:
  ```tsx
  <StockInHistoryModal
    isOpen={isStockInHistoryOpen}
    onClose={() => setIsStockInHistoryOpen(false)}
    liveSellers={liveSellers}
    liveProducts={liveProducts}
    onOpenProductHistory={(prod) => setSelectedHistoryProduct(prod)}
  />

  <ProductStockHistoryModal
    isOpen={!!selectedHistoryProduct}
    onClose={() => setSelectedHistoryProduct(null)}
    product={selectedHistoryProduct}
    liveSellers={liveSellers}
    onOpenStockIn={(barcode) => {
      setStockInBarcode(barcode);
      setIsStockInOpen(true);
    }}
  />
  ```

### 3. Verification
- Run `npx tsc --noEmit` and ensure exit code 0.

## Report File
Write your full implementation report to:
`/Users/khamseankhampang/Desktop/yoru work/.superpowers/sdd/2026-09-08-stock-in-history-audit/task-5-report.md`

## Contract
Return ONLY one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
Do NOT dispatch subagents or reviewers.

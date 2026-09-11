---
description: PX Wing 21 Core Memory Pointer & Architecture Invariants
trigger: always_on
---

# PX Wing 21 Master System Knowledge

Always adhere to the business rules and database schema documented in:
@./PROJECT_KNOWLEDGE_CONTEXT.md

## Critical Invariants:
1. Verification command: `npx tsc --noEmit && node -c backend/gas/Code.js` (Never use `npm run build` or `npm test`).
2. Always inspect current lines via `view_file` before calling `replace_file_content`.
3. Master seller `S01` must never be deleted.
4. Active seller status (`is_active`) automatically cascades to all products under that seller.
5. Communication style: Caveman Full Thai mode.

---

## 🗓️ Payroll / Deductions / Calendar Sync Hardening (2026-09-10)

**Server is the single source of truth** — Payroll Calendar, Deduction Configs and Deduction History MUST be
read/written through GAS. `localStorage` is legacy-only and used purely for one-time migration.

### New Batch Tables (provisioned automatically by `ensureBatchSheet`)
- `Payroll_Schedules`: `month_key, month_label, payday_date, cutoff_date, salary_base, auto_deduct_enabled, status`
- `Deduction_Configs`: `config_key, config_json, updated_at` (single row `items` holding the JSON array)
- `Deduction_History`: `record_id, month_period, ..., items_snapshot_json, status`

### New GAS actions
`getPayrollSchedules`, `savePayrollSchedules`, `getDeductionConfigs`, `saveDeductionConfigs`,
`getDeductionHistory`, `saveDeductionHistory`.
Frontend mirrors: `api.getPayrollSchedules / savePayrollSchedules / getDeductionConfigs / saveDeductionConfigs / getDeductionHistory / saveDeductionHistory` (+ mockBackend equivalents).

### Business rules enforced in GAS
1. `isBatchGuardExpired(batchId)` blocks expired batches in `handleBatchSalaryTopup`, `handleBatchExecuteDeductions`,
   `handleGeneratePayrollExport`, `handleSavePayrollSchedules`, `handleSaveDeductionConfigs`.
2. `handleGeneratePayrollExport` reads `salary_base` from `Payroll_Schedules` (never hardcoded 10000),
   resolves the payable month via `resolvePayrollMonth` (cutoff reached + payday not yet passed),
   upserts by `settlement_id = PAY-{batchId}-{month}-{pxCode}` (re-running never duplicates rows),
   and marks the month `PROCESSED`.
3. `handleBatchExecuteDeductions` respects `auto_deduct_enabled` for the target month, filters
   `DATE_RANGE` items by month overlap, skips items already executed (`Deduction_History.items_snapshot`),
   and logs the **actual** deducted amount (`before - after`) instead of the requested amount.
4. Salary top-up logs store `PERIOD-{yyyy-MM}` in `Credit_Logs` col 8 so top-ups and deductions reconcile per month.
5. `handleGetSoldiers` aggregates `MONTHLY_DEDUCTION` rows from `Credit_Logs` into
   `allowance_deductions_total` / `cash_deductions_total` per soldier for the Welfare "หักอื่น" breakdown.

### Frontend invariants
- Payroll cycle default: cutoff = **25th** of work month, payday = **5th of the NEXT month**, `salary_base = 10000`.
  `buildDefaultPayrollSchedules()` is the ONLY fallback source — never invent `${month}-28`.
- `computeScheduleStatus()` derives `SCHEDULED / CUTOFF_REACHED / PROCESSED / PAST` from real dates.
- `SalaryTopupModal` pre-fills amounts from `soldier.credit_limit` (fallback `batch.default_credit_limit`), never 2000.

### 📘 Usage & Data-Flow Handbook
คู่มือใช้งาน + ตัวอย่างการไหลข้อมูลแบบเห็นตัวเลขจริง: `@./docs/PAYROLL_DEDUCTIONS_CALENDAR_GUIDE.md`
(ครอบคลุม Payroll Calendar, Monthly Deductions, Salary Top-up, Batch Guard, สถานะรอบ, troubleshooting)



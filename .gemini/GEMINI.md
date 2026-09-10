---
description: Project context for PX Wing 21 POS and accounting system
trigger: always_on
---

# PX Wing 21 project context

This repository is a Vite + React + TypeScript POS and accounting system for PX
New Recruits, Wing 21. The frontend uses Zustand state, Dexie/IndexedDB local
storage, Tailwind CSS, and a Google Apps Script backend under `backend/gas/`.

## Project conventions

- Read `PRODUCT.md` and affected domain types in `src/types/` before a behavior
  or data-model change.
- Keep core business logic testable and prefer focused tests in `tests/`.
- Avoid breaking offline-first behavior, sync queue semantics, receipt/accounting
  integrity, or IndexedDB schema compatibility.
- Treat monetary values, stock quantities, transaction records, and sync status
  as correctness-sensitive. Do not use floating-point shortcuts or destructive
  migration behavior without an explicit migration plan.
- Keep UI responsive and usable with keyboard/touch input in a point-of-sale
  environment. Preserve existing visual patterns unless the task is a redesign.

## Validation

Use `npm test` for the Node test suite and `npm run build` for a production
compile check when changes affect application code. Run the narrowest relevant
check first, then broader validation when appropriate.

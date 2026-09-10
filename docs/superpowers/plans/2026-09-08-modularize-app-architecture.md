# Modular Enterprise Architecture Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the 6,950+ line monolithic `src/App.tsx` into a clean, professional, domain-driven modular architecture (`features/`, `components/`, `hooks/`, `store/`), reducing `App.tsx` to a slim root shell while preserving 100% of existing functionality and type safety.

**Architecture:** 
- **Feature-Based Modularization:** Group files by business domain (`features/pos`, `features/admin`, `features/products`, `features/soldiers`, `features/users`).
- **Shared UI & Layout:** Extract reusable UI components (`ToastContainer`, `ThemeToggle`, `Header`) into `components/common/` and `components/layout/`.
- **Custom Hooks & State Slicing:** Isolate UI logic (Toast management, Theme, Live sync) into dedicated hooks and state stores.
- **Atomic Migration:** Refactor in self-contained phases with continuous `npx tsc --noEmit` verification at each step to prevent regression.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Zustand, Lucide React, Google Apps Script.

**Spec Reference:**
- `src/types/schema.ts`
- `src/core/api.ts`
- `src/store/usePosStore.ts`
- Current Monolith: `src/App.tsx` (6,950+ lines)

## Global Constraints
- **STRICT RULE:** NEVER run `npm run build` or `npm test`. Use `npx tsc --noEmit` exclusively for type verification.
- **Zero Regression:** Every modal, hotkey, barcode scan, toast notification, Google Drive sync, and sheet routing must continue functioning identically.
- **Clean Structure:** No circular dependencies. Export shared interfaces from `src/types/` or feature index files.
- **Communication Style:** `/caveman` (Thai language, terse, dense, technically exact, zero fluff).

---

## Target Project Directory Map

```
src/
├── types/
│   ├── schema.ts                   # Database schema & entity models
│   └── ui.ts                       # UI state, Toast, Modal, Admin tab types
├── hooks/
│   ├── useToast.ts                 # Toast notifications hook & state
│   ├── useTheme.ts                 # Light/Dark mode hook
│   └── useHardwareScanner.ts       # USB barcode scanner listener hook
├── components/
│   ├── common/
│   │   ├── ToastContainer.tsx      # Floating toast notifications & loading shimmer
│   │   ├── MetricCard.tsx          # KPI metric cards with status indicator
│   │   └── ModalShell.tsx          # Reusable modal container wrapper
│   └── layout/
│       ├── Header.tsx              # Top bar, live batch badge, cashier status, theme toggle
│       └── NavigationBar.tsx       # Bottom/Top view switcher (POS, Users, Admin)
├── features/
│   ├── pos/
│   │   ├── components/
│   │   │   ├── ProductCatalogGrid.tsx  # POS Product grid & search
│   │   │   ├── CartSection.tsx         # Cart drawer & items list
│   │   │   ├── BuyerSoldierCard.tsx    # Soldier card & barcode scanner input
│   │   │   ├── PartySplitModal.tsx     # Party bill splitter modal
│   │   │   └── CheckoutModal.tsx       # Final payment confirmation modal
│   │   └── PosView.tsx                 # Full POS Terminal Page
│   ├── users/
│   │   ├── components/
│   │   │   └── UserCard.tsx            # Cashier user card
│   │   └── UsersView.tsx               # Switch cashier / shift page
│   ├── soldiers/
│   │   ├── components/
│   │   │   └── SoldierImportModal.tsx  # Soldier CSV/Excel bulk import hub
│   │   └── types.ts
│   ├── products/
│   │   ├── components/
│   │   │   ├── ProductFormModal.tsx    # Manual Add/Edit Product Modal (Single vs Pack)
│   │   │   └── ProductImportModal.tsx  # 3-Mode Smart Product Import Hub
│   │   └── types.ts
│   └── admin/
│       ├── components/
│       │   ├── WelfareTab.tsx          # Welfare balance & payroll settlement table
│       │   ├── BatchesTab.tsx          # Batch switcher & sheet management
│       │   ├── FoldersTab.tsx          # Google Drive Folder Hub
│       │   ├── ProductsTab.tsx         # Products catalog table with pack badges
│       │   ├── DebugSheetModal.tsx     # Live API Ping Diagnostics & inspector
│       │   ├── CreateBatchModal.tsx    # 1-Click Auto Batch Provisioning Modal
│       │   ├── CreateFolderModal.tsx   # Drive Subfolder Modal
│       │   └── LinkFolderModal.tsx     # Link Existing Drive Folder Modal
│       └── AdminView.tsx               # Admin Hub Page
├── App.tsx                             # Clean root component (~120 lines)
└── main.tsx
```

---

### Task 1: UI Types, Toast Hook & Common Components

**Files:**
- Create: `src/types/ui.ts`
- Create: `src/hooks/useToast.ts`
- Create: `src/hooks/useTheme.ts`
- Create: `src/components/common/ToastContainer.tsx`

**Interfaces:**
- Produces: `ToastMessage`, `ToastOptions`, `useToast()`, `useTheme()`, `<ToastContainer />`

- [ ] **Step 1: Create `src/types/ui.ts` defining Toast, Modal, Theme, and View types**
- [ ] **Step 2: Create `src/hooks/useToast.ts` for unified toast management**
- [ ] **Step 3: Create `src/hooks/useTheme.ts` for dark/light mode toggle**
- [ ] **Step 4: Create `src/components/common/ToastContainer.tsx`**
- [ ] **Step 5: Verify type safety (`npx tsc --noEmit`)**

---

### Task 2: Layout Components (Header & Navigation)

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/NavigationBar.tsx`

**Interfaces:**
- Consumes: `useTheme()`, `usePosStore()`, `useToast()`, `DriveFolder`, `BatchInfo`
- Produces: `<Header />`, `<NavigationBar />`

- [ ] **Step 1: Extract Header into `src/components/layout/Header.tsx`**
- [ ] **Step 2: Extract Navigation bar into `src/components/layout/NavigationBar.tsx`**
- [ ] **Step 3: Verify type safety (`npx tsc --noEmit`)**

---

### Task 3: Users Feature Module (`features/users`)

**Files:**
- Create: `src/features/users/components/UserCard.tsx`
- Create: `src/features/users/UsersView.tsx`

**Interfaces:**
- Consumes: `User`, `usePosStore()`, `useToast()`
- Produces: `<UsersView />`

- [ ] **Step 1: Create `src/features/users/components/UserCard.tsx`**
- [ ] **Step 2: Create `src/features/users/UsersView.tsx`**
- [ ] **Step 3: Verify type safety (`npx tsc --noEmit`)**

---

### Task 4: Soldiers Feature Module (`features/soldiers`)

**Files:**
- Create: `src/features/soldiers/components/SoldierImportModal.tsx`

**Interfaces:**
- Consumes: `api`, `downloadSoldierTemplate`, `parseSoldierFile`, `validateSoldierRows`, `useToast()`
- Produces: `<SoldierImportModal />`

- [ ] **Step 1: Extract Soldier Import Modal into `src/features/soldiers/components/SoldierImportModal.tsx`**
- [ ] **Step 2: Verify type safety (`npx tsc --noEmit`)**

---

### Task 5: Products Feature Module (`features/products`)

**Files:**
- Create: `src/features/products/components/ProductFormModal.tsx`
- Create: `src/features/products/components/ProductImportModal.tsx`

**Interfaces:**
- Consumes: `ProductCatalog`, `Seller`, `api`, `downloadProductTemplate`, `validateProductRows`, `useToast()`
- Produces: `<ProductFormModal />`, `<ProductImportModal />`

- [ ] **Step 1: Extract Manual Product Modal into `src/features/products/components/ProductFormModal.tsx` (Supporting Single vs Pack Unit Modes)**
- [ ] **Step 2: Extract Multi-Mode Smart Product Import Hub into `src/features/products/components/ProductImportModal.tsx`**
- [ ] **Step 3: Verify type safety (`npx tsc --noEmit`)**

---

### Task 6: POS Feature Module (`features/pos`)

**Files:**
- Create: `src/features/pos/components/ProductCatalogGrid.tsx`
- Create: `src/features/pos/components/CartSection.tsx`
- Create: `src/features/pos/components/BuyerSoldierCard.tsx`
- Create: `src/features/pos/components/PartySplitModal.tsx`
- Create: `src/features/pos/components/CheckoutModal.tsx`
- Create: `src/features/pos/PosView.tsx`

**Interfaces:**
- Consumes: `usePosStore()`, `ProductCatalog`, `Soldier`, `api`, `useToast()`
- Produces: `<PosView />`

- [ ] **Step 1: Create POS sub-components (`ProductCatalogGrid`, `CartSection`, `BuyerSoldierCard`)**
- [ ] **Step 2: Create POS checkout dialogs (`PartySplitModal`, `CheckoutModal`)**
- [ ] **Step 3: Assemble `src/features/pos/PosView.tsx`**
- [ ] **Step 4: Verify type safety (`npx tsc --noEmit`)**

---

### Task 7: Admin Feature Module (`features/admin`)

**Files:**
- Create: `src/features/admin/components/WelfareTab.tsx`
- Create: `src/features/admin/components/BatchesTab.tsx`
- Create: `src/features/admin/components/FoldersTab.tsx`
- Create: `src/features/admin/components/ProductsTab.tsx`
- Create: `src/features/admin/components/DebugSheetModal.tsx`
- Create: `src/features/admin/components/CreateBatchModal.tsx`
- Create: `src/features/admin/components/CreateFolderModal.tsx`
- Create: `src/features/admin/components/LinkFolderModal.tsx`
- Create: `src/features/admin/AdminView.tsx`

**Interfaces:**
- Consumes: `api`, `DriveFolder`, `BatchInfo`, `ProductCatalog`, `Soldier`, `useToast()`
- Produces: `<AdminView />`

- [ ] **Step 1: Create Admin Tab sub-components (`WelfareTab`, `BatchesTab`, `FoldersTab`, `ProductsTab`)**
- [ ] **Step 2: Create Admin Modals (`DebugSheetModal`, `CreateBatchModal`, `CreateFolderModal`, `LinkFolderModal`)**
- [ ] **Step 3: Assemble `src/features/admin/AdminView.tsx`**
- [ ] **Step 4: Verify type safety (`npx tsc --noEmit`)**

---

### Task 8: Assemble Root `src/App.tsx` & Clean Up

**Files:**
- Modify: `src/App.tsx` (Reduce from ~6,950 lines to ~120 lines)

**Interfaces:**
- Consumes: `<Header />`, `<NavigationBar />`, `<PosView />`, `<UsersView />`, `<AdminView />`, `<ToastContainer />`

- [ ] **Step 1: Rewrite `src/App.tsx` as a clean router and coordinator**
- [ ] **Step 2: Verify zero regression across all views and modals**
- [ ] **Step 3: Run full type check (`npx tsc --noEmit`)**
- [ ] **Step 4: Update `HANDOFF.md` with new folder structure**

# Admin and Seller Authentication (Login / Logout) System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, secure, and user-friendly Login/Logout Authentication system for Admin and Consignment Sellers (without Soldier login) with role-based access control, session persistence, and Google Sheets `App_Users` synchronization.

**Architecture:** Create an `AuthStore` / Session layer in `src/store/useAuthStore.ts` with LocalStorage persistence. Implement a modern `LoginView.tsx` supporting PIN and credential login with Role tabs (Admin vs Seller). Protect all routes in `App.tsx` behind an authentication barrier, and adjust `AdminSidebar` / `AdminView` to tailor views based on whether the logged-in user is an `ADMIN` or `SELLER` (scoped to their `seller_id`).

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS v4, Framer Motion, Lucide React, Google Apps Script (GAS).

**Spec:** `PROJECT_KNOWLEDGE_CONTEXT.md` & `ออกแบบระบบและโฟลว์ PX ทหารใหม่.pdf`

## Global Constraints
- Verification command: `npx tsc --noEmit && node -c backend/gas/Code.js` (Never run `npm run build` or `npm test`).
- Always view lines before modifying with `replace_file_content`.
- Communication style: Caveman Full Thai mode.
- Scope: Only **ADMIN** and **SELLER** login (Soldier login is excluded as requested).
- Inactive users (`is_active === false`) must be blocked from logging in.
- Sellers must be bound to their `seller_id` (e.g. `S01`, `S02`).

---

### Task 1: Auth Schema, User Seed Data & Zustand Auth Store

**Files:**
- Modify: `src/types/schema.ts`
- Create: `src/store/useAuthStore.ts`
- Modify: `src/mock/mockBackend.ts`

**Interfaces:**
- Consumes: `User`, `UserRole`, `Seller`
- Produces: `AuthUser`, `useAuthStore` with `currentUser`, `login()`, `logout()`, `isAuthenticated`

- [ ] **Step 1: Check and refine `User` interface in `src/types/schema.ts`**
Ensure `User` interface in `src/types/schema.ts` has:
```typescript
export interface AuthUser {
  user_id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'STAFF' | 'SELLER';
  seller_id?: string;
  avatar_url?: string;
  is_active: boolean;
}
```

- [ ] **Step 2: Create `src/store/useAuthStore.ts`**
Implement Zustand store with LocalStorage persistence under key `px_auth_session`:
- `currentUser: AuthUser | null`
- `isAuthenticated: boolean`
- `login: (user: AuthUser) => void`
- `logout: () => void`
- Initial state hydrates from `localStorage.getItem('px_auth_session')`.

- [ ] **Step 3: Update `src/mock/mockBackend.ts` with Login method & Seller accounts**
Add default seeded users in `mockBackend.users`:
- `admin` (PIN: `1234`, Role: `ADMIN`, Name: `ผู้ดูแลระบบส่วนกลาง`)
- `seller_s01` (PIN: `1234`, Role: `SELLER`, seller_id: `S01`, Name: `จ.ส.อ. สมชาย บุญมี (ร้านสวัสดิการ S01)`)
- `seller_s02` (PIN: `1234`, Role: `SELLER`, seller_id: `S02`, Name: `จ.อ. ประสิทธิ์ มีสุข (ครัวจ่าเอก S02)`)
Add `mockBackend.login(username, pin)` returning matched `AuthUser` if valid and active.

- [ ] **Step 4: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 2: Backend Google Apps Script (GAS) & API Client Authentication

**Files:**
- Modify: `backend/gas/Code.js`
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: Google Sheets `App_Users`
- Produces: `api.login(username, pin): Promise<{ success: boolean; user?: AuthUser; error?: string }>`

- [ ] **Step 1: Add `handleLogin(payload)` in `backend/gas/Code.js`**
Find matching user in `App_Users` sheet by `username` (case-insensitive) and `pin_hash` (or plain PIN).
Check `is_active !== false`. If inactive, return `{ status: 'ERROR', message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน' }`.
Return `{ status: 'SUCCESS', user: { user_id, username, full_name, role, seller_id, avatar_url, is_active } }`.

- [ ] **Step 2: Add routing in `doPost` in `backend/gas/Code.js`**
Wire `case 'login': response = handleLogin(payload); break;`.

- [ ] **Step 3: Update `src/core/api.ts` with `login` endpoint**
Add `login(username: string, pin: string): Promise<{ success: boolean; user?: AuthUser; error?: string }>` with fallback to `mockBackend.login(username, pin)`.

- [ ] **Step 4: Verify syntax**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 3: Modern Login View Component (`LoginView.tsx`)

**Files:**
- Create: `src/features/auth/LoginView.tsx`

**Interfaces:**
- Consumes: `api.login`, `useAuthStore`, `Seller` list
- Produces: `<LoginView onLoginSuccess={(user) => void} />`

- [ ] **Step 1: Build `src/features/auth/LoginView.tsx`**
- UI Design (Modern Retail POS / Military PX aesthetic):
  - Brand header: PX Wing 21 logo, "ระบบบริหารจัดการร้านค้าสวัสดิการ กองบิน 21"
  - Role switcher tab: **[🛡️ ผู้ดูแลระบบ / Admin]** vs **[🏪 ร้านค้าผู้ฝากขาย / Seller]**
  - Form Fields:
    - Username input / Seller selector
    - PIN / Password input (with show/hide toggle and on-screen Numpad for touch/tablet POS)
    - Remember session checkbox
  - Quick Demo login buttons (for fast access during testing and review):
    - `[⚡ เข้าสู่ระบบ Admin]`
    - `[🏪 เข้าสู่ระบบ ร้านสวัสดิการ (S01)]`
    - `[🍜 เข้าสู่ระบบ ครัวจ่าเอก (S02)]`
  - Theme toggle (Dark/Light) button in top corner
  - Loading spinner & error alert toasts on failure.

- [ ] **Step 2: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 4: App-level Session Management & Route Protection (`App.tsx`)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuthStore`, `LoginView`
- Produces: Protected application lifecycle where unauthenticated visitors are gated by `LoginView`.

- [ ] **Step 1: Update `src/App.tsx` with Auth Guard**
- Use `useAuthStore` for `currentUser` and `isAuthenticated`.
- If not authenticated, render `<LoginView onLoginSuccess={...} />`.
- If authenticated:
  - If role is `SELLER`, default route to `/admin` with `adminTab` set to `'products'` or `'sellers'`.
  - Pass `currentUser` to `Header`, `AdminView`, `PosView`, etc.
  - Provide global `handleLogout` function that clears session and navigates back to `/login`.

- [ ] **Step 2: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 5: Role-based Navigation & Seller Restrictions

**Files:**
- Modify: `src/features/admin/components/AdminSidebar.tsx`
- Modify: `src/features/admin/components/AdminHeader.tsx`
- Modify: `src/features/admin/AdminView.tsx`
- Modify: `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `currentUser: AuthUser`
- Produces: Contextual menu and scoped views (Sellers only see their products/sales; Admins see full system).

- [ ] **Step 1: Update `AdminSidebar.tsx` & `AdminHeader.tsx`**
- When `currentUser.role === 'SELLER'`:
  - Show Seller badge & shop name (e.g. `🏪 S01: ร้านสวัสดิการ กองบิน 21`).
  - Restrict sidebar tabs to relevant items: `สินค้าของฉัน`, `ยอดขาย/ประวัติรับเข้า`, `โปรโมชั่น`.
  - Hide Admin-only tabs like `จัดการสิทธิ์ผู้ใช้`, `จัดการผลัด`, `โฟลเดอร์ Drive`.
- Add prominent **[ออกจากระบบ (Logout)]** button with user profile avatar and confirmation.

- [ ] **Step 2: Update `Header.tsx` with User Profile & Logout**
Display current user's name, role badge (`ADMIN` / `SELLER`), and clickable Logout button.

- [ ] **Step 3: Update `AdminView.tsx` to scope data for Seller role**
If logged-in user is `SELLER`, filter `liveProducts` and `liveSellers` to match `currentUser.seller_id`.

- [ ] **Step 4: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 6: Logout Confirmation Modal & E2E Testing

**Files:**
- Create: `src/components/common/LogoutConfirmModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuthStore`
- Produces: Clean, safe logout experience preventing accidental logouts.

- [ ] **Step 1: Create `LogoutConfirmModal.tsx`**
Modal displaying "ยืนยันการออกจากระบบ", "คุณต้องการออกจากระบบ PX Wing 21 ใช่หรือไม่?", with Cancel and Confirm buttons.

- [ ] **Step 2: Integrate into `App.tsx` and Headers**
Trigger `LogoutConfirmModal` when any logout button is clicked.

- [ ] **Step 3: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 7: End-to-End Verification & Master Documentation Sync

**Files:**
- Modify: `PROJECT_KNOWLEDGE_CONTEXT.md`

- [ ] **Step 1: Run comprehensive build & syntax check**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: 0 errors (Exit code 0)

- [ ] **Step 2: Update `PROJECT_KNOWLEDGE_CONTEXT.md`**
Record the Authentication architecture, roles (`ADMIN`, `SELLER`), and session persistence mechanism.

- [ ] **Step 3: Final confirmation to user**
Deliver summary of changes in Caveman Full Thai style.

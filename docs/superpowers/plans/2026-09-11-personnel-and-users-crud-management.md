# Personnel & Users CRUD Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive, unified **Personnel & Access Management (ศูนย์จัดการผู้ใช้งานและกำลังพล)** module in the Admin panel supporting full CRUD, role-based controls, PIN/Password management, and Soldier roster administration for Admin, Staff, Seller, and Soldiers.

**Architecture:** 
- Frontend: New unified tab `PersonnelManagementTab.tsx` with dedicated sub-views for (1) System Users (Admin & Staff), (2) Seller Accounts (Consignment Sellers), (3) Soldiers Registry (Welfare & Personnel), and (4) Analytics & Access Overview.
- Reusable Modals: `UserFormModal.tsx` (create/edit user with password, PIN, avatar, linked seller, OAuth/LINE fields), `UserDeleteModal.tsx`, integrated with existing `SoldierFormModal.tsx`, `SoldierDeleteModal.tsx`, and `BatchSoldierPhotoUploadModal.tsx`.
- Backend & Storage: GAS and `mockBackend.ts` handling `Users` and `Soldiers` sheets with CRUD actions (`createUser`, `updateUser`, `deleteUser`, `toggleUserStatus`, `createSoldier`, `updateSoldier`, `deleteSoldier`, `toggleSoldierStatus`).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React, Google Apps Script (GAS)

---

## Global Constraints

- Verification command: `npx tsc --noEmit && node -c backend/gas/Code.js` (Never use `npm run build` or `npm test`).
- Always inspect current lines via `view_file` before calling `replace_file_content`.
- Master admin (`admin`) and Master seller (`S01`) must never be deleted.
- Preserved existing files: `ProductsTab.tsx`, `SellersTab.tsx`, `WelfareTab.tsx` remain intact.
- Communication style: Caveman Full Thai mode.

---

### Task 1: Backend & Mock API Layer for User & Soldier CRUD

**Files:**
- Modify: `src/types/schema.ts`
- Modify: `src/mock/mockBackend.ts`
- Modify: `src/core/api.ts`
- Modify: `backend/gas/Code.js`

**Interfaces:**
- Consumes: `User`, `Soldier`, `AuthUser` types
- Produces: 
  - `api.getUsers(): Promise<{ success: boolean; data: User[] }>`
  - `api.createUser(user: Partial<User>): Promise<{ success: boolean; data?: User; error?: string }>`
  - `api.updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; data?: User; error?: string }>`
  - `api.deleteUser(userId: string): Promise<{ success: boolean; error?: string }>`
  - `api.toggleUserStatus(userId: string): Promise<{ success: boolean; is_active?: boolean; error?: string }>`

- [x] **Step 1: Update `src/types/schema.ts`**
  - Ensure `User` interface includes all fields:
    ```typescript
    export interface User {
      user_id: string;
      username: string;
      password_hash?: string;
      pin_hash: string;
      full_name: string;
      role: 'ADMIN' | 'STAFF' | 'SELLER';
      seller_id?: string;
      avatar_url?: string;
      email?: string;
      google_id?: string;
      line_user_id?: string;
      line_notify_token?: string;
      is_active: boolean;
      created_at?: string;
      updated_at?: string;
    }
    ```

- [x] **Step 2: Update `src/mock/mockBackend.ts` and `src/core/api.ts`**
  - Implement full User CRUD methods in `mockBackend`:
    - `getUsers()`
    - `createUser(payload)`
    - `updateUser(userId, updates)`
    - `deleteUser(userId)` (protect master `USR-01` admin)
    - `toggleUserStatus(userId)`
  - Expose matching methods in `src/core/api.ts`.

- [x] **Step 3: Update `backend/gas/Code.js`**
  - Ensure `Users` sheet has columns: `['user_id', 'username', 'password_hash', 'pin_hash', 'full_name', 'role', 'seller_id', 'avatar_url', 'email', 'google_id', 'line_user_id', 'line_notify_token', 'is_active', 'created_at', 'updated_at']`
  - Wire actions in `doPost` / `doGet`:
    - `getUsers`, `createUser`, `updateUser`, `deleteUser`, `toggleUserStatus`

- [x] **Step 4: Verify with TypeScript and GAS check**
  Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
  Expected: Exit code 0.

---

### Task 2: Create `UserFormModal.tsx` & `UserDeleteModal.tsx`

**Files:**
- Create: `src/features/users/components/UserFormModal.tsx`
- Create: `src/features/users/components/UserDeleteModal.tsx`

**Interfaces:**
- Consumes: `User`, `Seller`, `DriveFolder` from `schema.ts`
- Produces: `UserFormModal` and `UserDeleteModal` React components

- [x] **Step 1: Create `src/features/users/components/UserFormModal.tsx`**
  - Props:
    ```typescript
    interface UserFormModalProps {
      isOpen: boolean;
      onClose: () => void;
      onSave: (userData: Partial<User>) => Promise<boolean>;
      initialData?: User | null;
      sellers: Seller[];
      driveFolders?: DriveFolder[];
    }
    ```
  - Form Fields:
    - Username (`username`) & Full Name (`full_name`)
    - Role selector (`ADMIN` | `STAFF` | `SELLER`) with clear visual icons
    - If `SELLER`: Searchable Seller selection dropdown (`seller_id`)
    - Password (`password_hash`) & 4-digit PIN (`pin_hash`)
    - Avatar Mode (Upload to Drive / URL input)
    - Contact Email (`email`)
    - Integration Fields (Google Account ID, LINE User ID, LINE Notify Token)
    - Active Status Switch (`is_active`)
  - Validation: Ensure non-empty username, full_name, 4-digit PIN, valid role.

- [x] **Step 2: Create `src/features/users/components/UserDeleteModal.tsx`**
  - Safety modal confirming deletion of user account.
  - Disable deletion for master admin (`USR-01` or username `admin`).
  - Warning about impact on audit logs and transaction history.

- [x] **Step 3: Verify compilation**
  Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
  Expected: Exit code 0.

---

### Task 3: Create `PersonnelManagementTab.tsx`

**Files:**
- Create: `src/features/admin/components/PersonnelManagementTab.tsx`

**Interfaces:**
- Consumes: `User`, `Soldier`, `Seller`, `BatchItem`, `DriveFolder`
- Produces: `PersonnelManagementTab` component

- [x] **Step 1: Build Top Hub Navigation & Stats**
  - 4 Sub-Tabs:
    1. 🛡️ **เจ้าหน้าที่ระบบ (Admin & Staff)**
    2. 🏪 **บัญชีผู้ฝากขาย (Seller Accounts)**
    3. 🪖 **ทะเบียนกำลังพล (Soldiers Registry)**
    4. 📊 **ภาพรวมสิทธิ์และสถิติ (Access Overview)**
  - Top Summary KPI cards:
    - ผู้ดูแลระบบ (Admins)
    - เจ้าหน้าที่แคชเชียร์ (Staff)
    - บัญชีผู้ฝากขาย (Sellers)
    - พลทหารทั้งหมด (Total Soldiers across batches)

- [x] **Step 2: Build Sub-View 1 (Admin & Staff)**
  - Filter pills: ทั้งหมด / 🛡️ แอดมิน / 🧑‍💼 สตาฟ / 🟢 เปิดใช้งาน / 🔴 ปิดใช้งาน
  - Search bar (by username, full name, email)
  - Bento Grid cards & Table view mode switcher:
    - User Avatar, Full Name, Username, Role badge
    - Quick PIN & Password status
    - LINE / Google linked badges
    - Quick Toggle Active switch
    - Action buttons: Edit (`Edit2`), Reset PIN (`Key`), Delete (`Trash2`)

- [x] **Step 3: Build Sub-View 2 (Seller Accounts)**
  - Seller accounts listing linked to `seller_id`
  - Shows linked store details (% GP, total products, contact)
  - Edit login credentials, PIN, and notifications
  - Quick Toggle Active switch

- [x] **Step 4: Build Sub-View 3 (Soldiers Registry)**
  - Batch selector dropdown & Company filter tabs (ทั้งหมด, ร้อย 1, ร้อย 2, ร้อย 3, บก.ร้อย)
  - Search by PX Code, ID Card, Name
  - Status filter (ทั้งหมด, 🟢 พร้อมใช้, 🟡 ระงับสิทธิ์, ⚪ ปลดประจำการ)
  - Table & Cards view:
    - Photo thumbnail, PX Code, Rank & Full Name, Company/Platoon
    - Credit Limit & Remaining Balance, Cash Balance, Credit Balance
    - Quick Status Dropdown toggle
    - Actions: Edit Soldier (`SoldierFormModal`), Delete Soldier (`SoldierDeleteModal`), History, Photo upload
  - Action buttons in toolbar: `+ เพิ่มทหารใหม่`, `📥 นำเข้า Excel`, `📸 อัปโหลดรูปภาพชุด`

- [x] **Step 5: Build Sub-View 4 (Access & Overview Analytics)**
  - Role breakdown distribution charts
  - Batch quota allocation and credit usage
  - Security audit summary (accounts with default PINs, inactive accounts)

- [x] **Step 6: Verify compilation**
  Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
  Expected: Exit code 0.

---

### Task 4: Integrate Personnel Hub into `AdminSidebar` & `AdminView`

**Files:**
- Modify: `src/types/ui.ts`
- Modify: `src/features/admin/components/AdminSidebar.tsx`
- Modify: `src/features/admin/AdminView.tsx`

- [x] **Step 1: Update `src/types/ui.ts`**
  - Ensure `AdminTab` includes `'personnel'`:
    ```typescript
    export type AdminTab = 'dashboard' | 'welfare' | 'batches' | 'folders' | 'products' | 'sellers' | 'catalog-hub' | 'personnel' | 'promotions' | 'orders' | 'import' | 'pos';
    ```

- [x] **Step 2: Update `src/features/admin/components/AdminSidebar.tsx`**
  - Add navigation item for `personnel`:
    ```typescript
    {
      id: 'personnel',
      label: 'จัดการผู้ใช้ & กำลังพล',
      icon: Users,
      badge: 'Hub',
      adminOnly: true,
      onSelect: () => {
        if (loadUsers) loadUsers();
      }
    }
    ```

- [x] **Step 3: Update `src/features/admin/AdminView.tsx`**
  - Add states & loaders for `users`:
    - `usersList: User[]`
    - `loadUsers()`
    - User CRUD handlers: `handleCreateUser`, `handleUpdateUser`, `handleDeleteUser`, `handleToggleUserStatus`
  - Render `PersonnelManagementTab` when `adminTab === 'personnel'` with all props wired.

- [x] **Step 4: Verify end-to-end compilation**
  Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
  Expected: Exit code 0.

---

### Task 5: Final Verification & Smoke Testing

- [x] **Step 1: Run verification check**
  Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
  Expected: 0 errors.

- [x] **Step 2: Verify git status integrity**
  Ensure existing `ProductsTab.tsx`, `SellersTab.tsx`, and `WelfareTab.tsx` remain unchanged.


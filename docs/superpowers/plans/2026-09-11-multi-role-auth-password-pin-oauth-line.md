# แผนการพัฒนา: ระบบเข้าสู่ระบบแบบรหัสผ่าน + PIN ปลดล็อคด่วน + รองรับ Google & LINE (Multi-Role Auth)

> **เป้าหมาย:** ปรับปรุงระบบยืนยันตัวตน (Authentication) ให้รองรับ:
> 1. **รหัสผ่านหลัก (Password):** สำหรับ Login เข้าสู่ระบบครั้งแรก (Username + Password)
> 2. **รหัส PIN ด่วน (Quick PIN Unlock):** 4-6 หลัก สำหรับกลับเข้าใช้งานต่อ (Screen Unlock / Session Resume) โดยไม่ต้องกรอกรหัสผ่านยาวซ้ำ
> 3. **รองรับสิทธิ์ 3 ระดับ:** `ADMIN` (ผู้ดูแลระบบ), `STAFF` (เจ้าหน้าที่ประจำการ), `SELLER` (ร้านค้า/ผู้ฝากขาย)
> 4. **ฟิลด์สำหรับ Google & LINE Integration (Future-Ready):**
>    - `email` & `google_id` (Google OAuth Sign-In)
>    - `line_user_id` & `line_notify_token` (LINE Login & แจ้งเตือนยอดขาย/สวัสดิการผ่าน LINE)
> 5. **User Management Desk:** หน้าจัดการผู้ใช้ที่สามารถกำหนด Password, PIN, Email, Google ID, LINE ID/Token ได้ครบถ้วน

---

## 1. การเปลี่ยนแปลงโครงสร้างข้อมูล (Schema & Types)

### 1.1 `src/types/schema.ts`
ปรับปรุง `User` และ `AuthUser` interface:
```typescript
export type UserRole = 'ADMIN' | 'STAFF' | 'SELLER';

export interface User {
  user_id: string;                  // PK: USR-01, USR-02
  username: string;                 // ชื่อผู้ใช้งาน (Unique)
  password_hash: string;            // รหัสผ่านหลัก (Password)
  pin_hash: string;                 // รหัส PIN ปลดล็อคด่วน 4-6 หลัก
  full_name: string;                // ยศ-ชื่อ-สกุล
  role: UserRole;                   // ADMIN | STAFF | SELLER
  seller_id?: string;               // FK Ref: Sellers.seller_id (กรณี role == 'SELLER')
  avatar_url?: string;              // URL รูปประจำตัว
  email?: string;                   // อีเมล (สำหรับเชื่อม Google OAuth)
  google_id?: string;               // Google User ID (sub)
  line_user_id?: string;            // LINE User ID (Uxxxxxxxx...)
  line_notify_token?: string;       // LINE Notify Token หรือ Channel Token สำหรับแจ้งเตือน
  is_active: boolean;               // สถานะเปิด/ปิดใช้งาน
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  user_id: string;
  username: string;
  full_name: string;
  role: UserRole;
  seller_id?: string;
  avatar_url?: string;
  email?: string;
  google_id?: string;
  line_user_id?: string;
  line_notify_token?: string;
  is_active: boolean;
}
```

---

## 2. ลำดับงานที่ต้องทำ (Execution Tasks)

### Task 1: Type Definitions & State Store Update
- **ไฟล์:** `src/types/schema.ts`, `src/store/useAuthStore.ts`
- **รายละเอียด:**
  - เพิ่มฟิลด์ `password_hash`, `pin_hash`, `email`, `google_id`, `line_user_id`, `line_notify_token` ใน `User` และ `AuthUser`.
  - ใน `useAuthStore.ts`:
    - เพิ่ม State: `isLocked: boolean` (สถานะล็อคหน้าจอชั่วคราว)
    - เพิ่ม Action: `lockScreen(): void` (ล็อคหน้าจอแต่คง Session ผู้ใช้ไว้)
    - เพิ่ม Action: `unlockWithPin(pin: string): Promise<boolean>` (ตรวจสอบ PIN กับ `currentUser.pin_hash` หรือเรียก API)
    - ปรับปรุง `login(user: AuthUser)` ให้เซ็ต `isLocked: false`
    - ปรับปรุง `logout()` ให้ล้าง session และรีเซ็ต `isLocked: false`

### Task 2: Backend GAS & API Client Updates
- **ไฟล์:** `backend/gas/Code.js`, `src/core/api.ts`
- **รายละเอียด:**
  - `backend/gas/Code.js`:
    - ปรับหัวตารางชีต `Users` ให้อัตโนมัติเป็น:
      `['user_id', 'username', 'password_hash', 'pin_hash', 'full_name', 'role', 'seller_id', 'avatar_url', 'email', 'google_id', 'line_user_id', 'line_notify_token', 'is_active']`
    - ปรับ `handleLogin(username, password)` ให้ตรวจ `password_hash` (หรือ fallback รองรับ PIN เก่าถ้ายังไม่มี password)
    - เพิ่ม `handleUnlockWithPin(userId, pin)`
    - ปรับ `handleCreateUser` และ `handleUpdateUser` ให้รองรับบันทึกทุกฟิลด์ใหม่ (password, pin, google_id, line_user_id, line_notify_token)
    - เพิ่ม action ใน `doGet` / `doPost` routing
  - `src/core/api.ts`:
    - ปรับ `login(username: string, password: string)`
    - เพิ่ม `unlockWithPin(userId: string, pin: string)`
    - ปรับ `createUser` และ `updateUser`

### Task 3: Mock Backend Updates & Default Seed Data
- **ไฟล์:** `src/mock/mockBackend.ts`
- **รายละเอียด:**
  - อัปเดต Mock Users ให้มีรหัสผ่านและ PIN เริ่มต้น:
    1. `USR-01` (ADMIN):
       - Username: `admin`
       - Password: `password123` (หรือ `123456`)
       - PIN: `1234`
       - Full Name: `ผู้ดูแลระบบส่วนกลาง (HQ Admin)`
       - Role: `ADMIN`
       - Email: `admin@wing21.af`
       - Google ID: `google_admin_001`
       - LINE User ID: `U0123456789admin`
       - LINE Notify Token: `token_admin_test`
    2. `USR-02` (STAFF):
       - Username: `staff01`
       - Password: `password123`
       - PIN: `1234`
       - Full Name: `จ.ท. สมศักดิ์ มั่นคง (เจ้าหน้าที่ธุรการ)`
       - Role: `STAFF`
    3. `USR-03` (SELLER):
       - Username: `seller_s01`
       - Password: `password123`
       - PIN: `1234`
       - Full Name: `จ.ส.อ. สมชาย บุญมี (ร้านสวัสดิการ S01)`
       - Role: `SELLER`
       - Seller ID: `S01`
  - อัปเดต Mock API methods: `login(username, password)`, `unlockWithPin(userId, pin)`, `createUser`, `updateUser`.

### Task 4: Login View & PIN Quick Unlock UI
- **ไฟล์:** `src/features/auth/LoginView.tsx`, `src/features/auth/PinUnlockModal.tsx`
- **รายละเอียด:**
  - `LoginView.tsx`:
    - ปรับฟอร์มเป็น `ชื่อผู้ใช้งาน (Username)` + `รหัสผ่าน (Password)` พร้อมปุ่มสลับแสดง/ซ่อนรหัสผ่าน
    - เพิ่มปุ่มหรือ Quick Helper สำหรับระบบจริง
    - มี badge แสดงสัญลักษณ์ความปลอดภัย
  - `PinUnlockModal.tsx` (สร้างใหม่):
    - สำหรับแสดงเมื่อ `isLocked === true` หรือผู้ใช้กดปุ่ม "ล็อคหน้าจอ"
    - แสดง Avatar, ชื่อ, และ Role ของผู้ใช้ปัจจุบัน
    - ช่องกรอก PIN 4-6 หลัก (มี Number Pad แป้นตัวเลขสัมผัสสำหรับจอสัมผัส/POS + รองรับแป้นพิมพ์)
    - ปุ่ม "ปลดล็อค (Unlock)"
    - ปุ่ม "สลับบัญชี / ออกจากระบบ (Switch Account / Sign Out)" สำหรับกรณียกเลิก session ปัจจุบัน

### Task 5: User Management Desk (UsersView & UserCard)
- **ไฟล์:** `src/features/users/UsersView.tsx`, `src/features/users/components/UserCard.tsx`
- **รายละเอียด:**
  - ฟอร์มสร้าง/แก้ไขผู้ใช้:
    - ข้อมูลหลัก: Username, Password, PIN (4 หลัก), Full Name, Role (`ADMIN`, `STAFF`, `SELLER`), Seller ID
    - ส่วนขยายระบบเชื่อมต่อ (OAuth & Notifications):
      - `อีเมล (Email)` & `Google Account ID` (รองรับ Google Login ในอนาคต)
      - `LINE User ID` & `LINE Notify Token` (รองรับแจ้งเตือนและ LINE Login ในอนาคต)
  - ตารางรายชื่อผู้ใช้งาน (`UserCard`):
    - แสดง Badge Role (ADMIN: สีคราม, STAFF: สีเขียวมรกต, SELLER: สีอำพัน)
    - แสดงสถานะการผูก Google / LINE (ไอคอนสถานะเชื่อมต่อ)
    - ปุ่มแก้ไข / รีเซ็ตรหัสผ่าน / เปิด-ปิดสถานะ

### Task 6: TopBar Lock Button & App Integration
- **ไฟล์:** `src/App.tsx`
- **รายละเอียด:**
  - เชื่อม `PinUnlockModal` เมื่อ `isLocked === true`
  - เพิ่มปุ่ม Quick Lock ใน Top Bar / Header ทุกหน้าเพื่อให้แคชเชียร์หรือแอดมินกดล็อคหน้าจอได้สะดวกรวดเร็วเมื่อลุกออกจากโต๊ะ

---

## 3. การตรวจสอบความถูกต้อง (Verification Invariant)
ทุกขั้นตอนต้องผ่านการตรวจสอบด้วยคำสั่ง:
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```
โดยต้องผ่าน 0 errors 100%.

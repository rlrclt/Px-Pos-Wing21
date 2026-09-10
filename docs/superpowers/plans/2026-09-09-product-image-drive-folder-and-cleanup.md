# Product Image Drive Folder Integration & Auto-Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ระบบอัปโหลดรูปภาพสินค้าสามารถเลือกโฟลเดอร์ Google Drive เป้าหมายจากระบบจัดการโฟลเดอร์ได้, มีระบบจดจำโฟลเดอร์เริ่มต้น (localStorage Memory), ตั้งชื่อไฟล์รูปภาพตามมาตรฐานระบบ (`PROD_{barcode}_{timestamp}.ext`), และลบไฟล์รูปเก่าออกจาก Google Drive จริงๆ อัตโนมัติเมื่อมีการเปลี่ยนรูปภาพหรือลบสินค้า เพื่อไม่ให้มีไฟล์ขยะค้างในไดรฟ์

**Architecture:**
1. **Google Apps Script Backend (`Code.js`):** เพิ่ม handler `uploadProductImage` (รับ Base64, Barcode, FolderId, สร้างชื่อไฟล์มาตรฐาน `PROD_{barcode}_{timestamp}.jpg`, บันทึกลง Folder ที่กำหนด, ตั้ง Share Public, คืน Drive Direct Thumbnail URL & File ID) และ handler `deleteDriveFile` (รับ `fileId` หรือ `fileUrl`, ดึง File ID แล้วสั่ง `file.setTrashed(true)` ย้ายลงถังขยะ Drive จริง) พร้อมผสานการลบรูปเก่าใน `handleDeleteProduct` และ `UPDATE_CATALOG`.
2. **Core API Client (`api.ts`):** เพิ่ม method `api.uploadProductImage()` และ `api.deleteDriveFile()`, พร้อม helper `extractDriveFileId(url)` ที่รองรับลิงก์ Drive ทุกรูปแบบ (`/d/{id}`, `id={id}`, `uc?id={id}`).
3. **Product Form UI (`ProductFormModal.tsx`):** เพิ่ม Drive Folder Selector Dropdown, ผูกค่าความจำโฟลเดอร์ที่เลือกล่าสุดลงใน `localStorage` (`px_default_product_image_folder_id`), รองรับปุ่ม Upload File / Drop Zone / เปลี่ยนรูป / ลบรูป พร้อมจัดการลบรูปเก่าใน Drive อัตโนมัติ.
4. **Product Delete Modal UI (`ProductDeleteModal.tsx`):** สั่งลบรูปภาพสินค้าใน Google Drive อัตโนมัติเมื่อกดยืนยันการลบสินค้าถาวร (Hard Delete).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Google Apps Script (DriveApp).

**Spec & Constraints:**
- Standard File Naming: `PROD_{barcode}_{timestamp}.{ext}` (เช่น `PROD_8850123401_1710000000000.jpg`)
- Image Format: Auto Base64 FileReader / Data URI upload to GAS DriveApp.
- Folder Memory: `localStorage` key `px_default_product_image_folder_id`.
- Auto-Cleanup Rule: เมื่อเปลี่ยนรูปสินค้า (Replace) ➜ ลบรูปเก่าใน Drive ทันที; เมื่อลบรูปสินค้า (Remove) ➜ ลบรูปใน Drive; เมื่อลบสินค้าถาวร (Hard Delete) ➜ ลบรูปใน Drive.
- TypeScript Validation: รัน `npx tsc --noEmit` เท่านั้น (ห้าม `npm run build` หรือ `npm test`).

---

### Task 1: Backend GAS API for Image Upload & Drive File Trashing

**Files:**
- Modify: `backend/gas/Code.js:70-200` (doPost routing)
- Modify: `backend/gas/Code.js:1920-2010` (handleDeleteProduct & Drive cleanup)
- Create/Append: `backend/gas/Code.js` (handleUploadProductImage, handleDeleteDriveFile, extractDriveFileId)

**Interfaces:**
- Consumes: `action: 'uploadProductImage'`, `payload: { barcode, image_base64, mime_type, file_name, folder_id }`
- Consumes: `action: 'deleteDriveFile'`, `payload: { file_id?: string, file_url?: string }`
- Produces: `{ status: 'SUCCESS', success: true, file_id: string, image_url: string, file_name: string }`

- [ ] **Step 1: Write helper and handlers in `backend/gas/Code.js`**

```javascript
/**
 * Utility: Extract Google Drive File ID from URL or Raw ID
 */
function extractDriveFileId(input) {
  if (!input) return '';
  const str = String(input).trim();
  // Match /d/{id}
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];
  // Match id={id}
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  // Match raw ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) return str;
  return '';
}

/**
 * Handle Upload Product Image to specified Google Drive Folder
 * Standardized Naming: PROD_{barcode}_{timestamp}.{ext}
 */
function handleUploadProductImage(payload) {
  if (!payload || !payload.image_base64) {
    return { status: 'ERROR', success: false, message: 'ไม่พบข้อมูลไฟล์รูปภาพ (image_base64)' };
  }

  const barcode = String(payload.barcode || 'UNKNOWN').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const mimeType = payload.mime_type || 'image/jpeg';
  let ext = 'jpg';
  if (mimeType.indexOf('png') !== -1) ext = 'png';
  else if (mimeType.indexOf('webp') !== -1) ext = 'webp';
  else if (mimeType.indexOf('gif') !== -1) ext = 'gif';

  const timestamp = new Date().getTime();
  const standardizedName = 'PROD_' + barcode + '_' + timestamp + '.' + ext;

  // Resolve target folder
  let targetFolder = null;
  const folderId = payload.folder_id ? String(payload.folder_id).trim() : '';

  if (folderId) {
    try {
      targetFolder = DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn('Could not find custom folder ' + folderId + ', falling back to root folder.');
    }
  }

  if (!targetFolder) {
    try {
      targetFolder = DriveApp.getFolderById(DEFAULT_PX_ROOT_FOLDER_ID);
    } catch (e) {
      targetFolder = DriveApp.getRootFolder();
    }
  }

  // Decode Base64
  let base64Data = payload.image_base64;
  if (base64Data.indexOf('base64,') !== -1) {
    base64Data = base64Data.split('base64,')[1];
  }

  const decodedBytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedBytes, mimeType, standardizedName);
  const file = targetFolder.createFile(blob);

  // Set permissions for public view
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.warn('Could not set public sharing: ' + e.toString());
  }

  const fileId = file.getId();
  // Standard Google Drive direct image URL
  const directImageUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  return {
    status: 'SUCCESS',
    success: true,
    file_id: fileId,
    file_name: standardizedName,
    image_url: directImageUrl,
    web_view_link: file.getUrl(),
    message: 'อัปโหลดรูปภาพสินค้าสำเร็จ (' + standardizedName + ')'
  };
}

/**
 * Handle Delete / Trash File in Google Drive
 */
function handleDeleteDriveFile(payload) {
  if (!payload || (!payload.file_id && !payload.file_url)) {
    return { status: 'ERROR', success: false, message: 'กรุณาระบุ file_id หรือ file_url ที่ต้องการลบ' };
  }

  const fileId = payload.file_id ? String(payload.file_id).trim() : extractDriveFileId(payload.file_url);
  if (!fileId) {
    return { status: 'ERROR', success: false, message: 'ไม่สามารถแยก File ID จากข้อมูลที่ระบุได้' };
  }

  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return {
      status: 'SUCCESS',
      success: true,
      file_id: fileId,
      message: 'ย้ายไฟล์ลงถังขยะ Google Drive สำเร็จ'
    };
  } catch (err) {
    return {
      status: 'ERROR',
      success: false,
      message: 'ลบไฟล์ใน Google Drive ไม่สำเร็จ: ' + err.toString()
    };
  }
}
```

- [ ] **Step 2: Add actions to `doPost` switch statement in `Code.js`**

```javascript
      case 'uploadProductImage':
        response = handleUploadProductImage(payload);
        break;
      case 'deleteDriveFile':
        response = handleDeleteDriveFile(payload);
        break;
```

- [ ] **Step 3: Update `handleDeleteProduct` to trash associated Drive image automatically**

In `handleDeleteProduct(payload)`:
```javascript
  // Extract and delete image from Google Drive if exists
  const catalogData = catalogSheet.getDataRange().getValues();
  let imageToDelete = '';
  for (let i = 1; i < catalogData.length; i++) {
    if (String(catalogData[i][0]).trim() === barcode) {
      imageToDelete = String(catalogData[i][2] || '').trim();
      catalogSheet.deleteRow(i + 1);
      foundCatalog = true;
      break;
    }
  }

  if (imageToDelete) {
    const fileId = extractDriveFileId(imageToDelete);
    if (fileId) {
      try {
        const imgFile = DriveApp.getFileById(fileId);
        imgFile.setTrashed(true);
      } catch (e) {
        console.warn('Could not trash product image: ' + e.toString());
      }
    }
  }
```

---

### Task 2: Core API Client & Types for Image Drive Operations

**Files:**
- Modify: `src/core/api.ts`

**Interfaces:**
- Produces: `api.uploadProductImage(params)`
- Produces: `api.deleteDriveFile(params)`
- Produces: `extractDriveFileId(url)`

- [ ] **Step 1: Add upload & delete drive file types and methods in `src/core/api.ts`**

```typescript
export interface UploadProductImagePayload {
  barcode: string;
  image_base64: string;
  mime_type?: string;
  file_name?: string;
  folder_id?: string;
}

export interface UploadProductImageResponse {
  status: string;
  success: boolean;
  file_id?: string;
  file_name?: string;
  image_url?: string;
  web_view_link?: string;
  message?: string;
  error?: string;
}

export interface DeleteDriveFileResponse {
  status: string;
  success: boolean;
  file_id?: string;
  message?: string;
  error?: string;
}
```

Add methods to `PXApiClient`:
```typescript
  /**
   * Upload product image directly to a specified Google Drive Folder
   */
  async uploadProductImage(payload: UploadProductImagePayload): Promise<UploadProductImageResponse> {
    try {
      const json = await this.postGas('uploadProductImage', payload);
      return {
        status: json.status || 'SUCCESS',
        success: json.success !== false && json.status !== 'ERROR',
        file_id: json.file_id,
        file_name: json.file_name,
        image_url: json.image_url,
        web_view_link: json.web_view_link,
        message: json.message,
        error: json.error || json.message
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        success: false,
        error: e.message || 'ไม่สามารถอัปโหลดรูปภาพสินค้าได้'
      };
    }
  }

  /**
   * Physically trash a file in Google Drive
   */
  async deleteDriveFile(payload: { file_id?: string; file_url?: string }): Promise<DeleteDriveFileResponse> {
    try {
      const json = await this.postGas('deleteDriveFile', payload);
      return {
        status: json.status || 'SUCCESS',
        success: json.success !== false && json.status !== 'ERROR',
        file_id: json.file_id,
        message: json.message,
        error: json.error || json.message
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        success: false,
        error: e.message || 'ไม่สามารถลบไฟล์ใน Google Drive ได้'
      };
    }
  }
```

- [ ] **Step 2: Verify `npx tsc --noEmit` on `src/core/api.ts`**

---

### Task 3: ProductFormModal Drive Folder Selection, Memory & Image Replacement Cleanup

**Files:**
- Modify: `src/features/products/components/ProductFormModal.tsx`
- Modify: `src/features/admin/AdminView.tsx` (pass `driveFolders` to `ProductFormModal`)

**Interfaces:**
- Consumes: `driveFolders: DriveFolder[]` in `ProductFormModalProps`
- State: `selectedFolderId`, `oldImageUrl`, `imageFile`, `previewUrl`, `isUploadingImage`
- Memory Key: `localStorage.getItem('px_default_product_image_folder_id')`

- [ ] **Step 1: Update `ProductFormData` & `ProductFormModalProps` to accept `image_url` and `driveFolders`**

```typescript
export interface ProductFormData {
  barcode: string;
  product_name: string;
  category: string;
  custom_category?: string;
  image_url?: string;
  unit_name: string;
  selling_price: string;
  cost_price: string;
  stock_qty: string;
  seller_id: string;
  low_stock_threshold?: string;
  is_active: boolean;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: ProductCatalog | null;
  liveProducts?: ProductCatalog[];
  liveSellers: Seller[];
  liveUOMs?: ProductUOMConversion[];
  driveFolders?: DriveFolder[];
  onRefreshUOMs?: () => void;
  onSuccess?: () => void;
}
```

- [ ] **Step 2: Add Folder Picker UI and Auto-Remember Default Folder**

Implement `useEffect` for `selectedFolderId`:
```typescript
const [selectedFolderId, setSelectedFolderId] = useState<string>(() => {
  return localStorage.getItem('px_default_product_image_folder_id') || '';
});

const handleFolderChange = (newFolderId: string) => {
  setSelectedFolderId(newFolderId);
  localStorage.setItem('px_default_product_image_folder_id', newFolderId);
};
```

- [ ] **Step 3: Implement Image Upload, Replace & Delete Handler with Drive Cleanup**

1. **File Selection / Drop Handler:**
   - Read file via `FileReader.readAsDataURL()`.
   - Show instant preview.
   - Trigger `api.uploadProductImage({ barcode, image_base64, folder_id: selectedFolderId })`.
   - On success, set `productForm.image_url = res.image_url`.
   - If `oldImageUrl` exists and differs, trigger `api.deleteDriveFile({ file_url: oldImageUrl })` to clean up Drive immediately.
2. **Remove Image Button:**
   - Prompt confirmation.
   - If `productForm.image_url` is a Google Drive URL, call `api.deleteDriveFile({ file_url: productForm.image_url })`.
   - Clear `productForm.image_url`.

- [ ] **Step 4: Update `AdminView.tsx` to pass `driveFolders={driveFolders}` into `ProductFormModal`**

- [ ] **Step 5: Run `npx tsc --noEmit` and confirm 0 errors**

---

### Task 4: Product Deletion Image Auto-Cleanup

**Files:**
- Modify: `src/features/products/components/ProductDeleteModal.tsx`

**Interfaces:**
- Consumes: `product: ProductCatalog`
- Action: Call `api.deleteDriveFile({ file_url: product.image_url })` when hard deleting product.

- [ ] **Step 1: Add Image Drive Cleanup on Hard Delete in `ProductDeleteModal.tsx`**

```typescript
// If product has image_url, clean up from Google Drive in background
if (product.image_url) {
  api.deleteDriveFile({ file_url: product.image_url }).catch(e => {
    console.warn('Could not trash drive image on product delete:', e);
  });
}
```

- [ ] **Step 2: Verify `npx tsc --noEmit`**

---

### Task 5: Verification & End-to-End Type Checking

**Files:**
- Test: Full type-check across project

- [ ] **Step 1: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Inspect code diffs and review constraints**
Check that:
- Drive folder selection dropdown displays correctly.
- `localStorage` memory saves and restores chosen folder.
- Image uploads generate `PROD_{barcode}_{timestamp}.ext`.
- Replaced and deleted images trigger Drive file trashing.
- No `npm run build` or `npm test` was run.

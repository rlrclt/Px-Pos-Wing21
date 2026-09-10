# Google Drive Folder Hub & Dynamic Batch Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive Google Drive Folder Hub in Admin to manage, create, and link Google Drive folders, allow dynamic folder selection during 1-Click Batch creation, and provide an automated verification report with direct folder and sheet URLs.

**Architecture:**
1. **Master Sheet Hub**: Table `Drive_Folders` on Master Sheet (`1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4`) stores registered Drive folders (`folder_id`, `folder_name`, `folder_url`, `parent_folder_id`, `is_default`, `created_at`).
2. **Google Apps Script Backend**: Adds `oauthScopes` in `appsscript.json` for Drive & Sheets. Implements CRUD for Drive folders (`createDriveFolder`, `linkDriveFolder`, `getDriveFolders`, `setDefaultDriveFolder`, `deleteDriveFolder`). Updates `createBatchSheet` to accept `target_folder_id`, move the file, verify its location, and return full folder metadata.
3. **Frontend Admin Hub (`/admin`)**: Adds Tab `folders` for full Drive folder management, adds Folder Selection dropdown in Batch Creation Modal, and enriches Success modal with location details and direct Drive links.

**Tech Stack:** React 19, TypeScript, TailwindCSS v4, Lucide React, Google Apps Script (V8 Engine), Google Drive API / DriveApp.

**Spec:** Option 1 selected in `/brainstorming` session on 2026-09-08.

## Global Constraints
- DO NOT run `npm run build` or `test` (explicit user rule).
- Use `/caveman` style in user communication (Thai language, terse, dense, smart).
- Zero mock data; dynamic live connection to Google Sheets & Google Drive.

---

### Task 1: Update Apps Script Scopes and Root Folder Constants

**Files:**
- Modify: `backend/gas/appsscript.json`
- Modify: `backend/gas/Code.js:130-145`

**Interfaces:**
- Produces: `oauthScopes` with Drive & Sheets permission, `DEFAULT_PX_ROOT_FOLDER_ID` constant.

- [ ] **Step 1: Update `appsscript.json` with explicit OAuth scopes**
Add `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive` to `appsscript.json`.

- [ ] **Step 2: Add Drive folder constants in `backend/gas/Code.js`**
Ensure `DEFAULT_PX_ROOT_FOLDER_ID = "1rg4IQR-f18R4sDWpNiN73bmLAVRFyY29"` is configured and exported.

---

### Task 2: Implement Drive Folder Backend Handlers in Apps Script

**Files:**
- Modify: `backend/gas/Code.js`

**Interfaces:**
- Produces:
  - `handleGetDriveFolders()`
  - `handleCreateDriveFolder(payload)`
  - `handleLinkDriveFolder(payload)`
  - `handleSetDefaultDriveFolder(payload)`
  - `handleDeleteDriveFolder(payload)`
  - Updated `handleCreateBatchSheet(payload)` with dynamic folder routing and detailed location return.
- Routes in `doGet` and `doPost`.

- [ ] **Step 1: Implement `handleGetDriveFolders()` with automatic initialization of `Drive_Folders` table**
- [ ] **Step 2: Implement `handleCreateDriveFolder(payload)` and `handleLinkDriveFolder(payload)`**
- [ ] **Step 3: Update `handleCreateBatchSheet(payload)` to route to `target_folder_id` and return full report**
- [ ] **Step 4: Register action routes in `doGet` and `doPost`**

---

### Task 3: Implement API Client Methods in Frontend

**Files:**
- Modify: `src/core/api.ts`

**Interfaces:**
- Produces:
  - `getDriveFolders()`
  - `createDriveFolder(payload)`
  - `linkDriveFolder(payload)`
  - `setDefaultDriveFolder(folderId)`
  - `deleteDriveFolder(folderId)`
  - Updated `createBatchSheet` signature and response type.

- [ ] **Step 1: Add TypeScript interfaces for `DriveFolder` and `CreateBatchSheetResult`**
- [ ] **Step 2: Add API methods to `PXApiClient`**

---

### Task 4: Build Drive Folders Management UI & Dynamic Batch Selection

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Produces:
  - Tab `folders` in `/admin` with full Drive Folders table, Create Subfolder modal, and Link Existing Folder modal.
  - Dynamic Google Drive Folder Selector in the 1-Click Batch Creation Modal.
  - Enriched Success Report Modal displaying folder name, path, direct Google Drive link, and Google Sheet link.

- [ ] **Step 1: Add Drive Folder state and loader in `App.tsx`**
- [ ] **Step 2: Build `folders` tab in `/admin` with table and CRUD modals**
- [ ] **Step 3: Update Batch Creation modal with Folder dropdown**
- [ ] **Step 4: Upgrade Batch Creation Success card with Folder & Sheet direct links**

---

### Task 5: Verification & Compilation Check

**Files:**
- Verify: `npx tsc --noEmit`
- Update: `HANDOFF.md`

- [ ] **Step 1: Run `npx tsc --noEmit` to verify type safety**
- [ ] **Step 2: Update `HANDOFF.md` with new features and deployment guide**

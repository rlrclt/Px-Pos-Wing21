import type { 
  ProductCatalog, ProductUOMConversion, Soldier, Seller, User, SoldierStatus, 
  StockInPayload, StockInResponse, StockInLogFilters, StockInLogsResponse,
  Order, OrderSplit, OrderItem, SalaryTopupRequest, Promotion, AuthUser,
  MonthlyPayrollSchedule, DeductionConfigItem, CompletedDeductionRecord
} from '../types/schema.ts';
import { mockBackend } from '../mock/mockBackend.ts';

const SCRIPT_ID = 'AKfycbzpRRVmdCBWEQ8iEXGPMwiRW6n_1sbsgTmnWMx50xocOlkWB7UDh9a1B1e8k_Kqd3xDRA';
const DEFAULT_GAS_URL = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;

export interface DriveFolder {
  folder_id: string;
  folder_name: string;
  folder_url: string;
  parent_folder_id?: string;
  is_linked?: boolean;
  is_default?: boolean;
  created_at?: string;
  drive_status?: 'ONLINE' | 'TRASHED' | 'DELETED' | 'ACCESS_DENIED' | 'ERROR';
  drive_status_message?: string;
}

export function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  const idMatch = trimmed.match(/^([a-zA-Z0-9_-]{15,})$/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return trimmed;
}

export function extractDriveFileId(input?: string): string {
  if (!input) return '';
  const str = input.trim();
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) return str;
  return '';
}

/**
 * แปลงลิงก์ Google Drive ทุกรูปแบบ (view, share, uc?id=) เป็น Direct Image Link (lh3.googleusercontent.com/d/...)
 */
export function normalizeDriveImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('googleusercontent.com/d/')) return trimmed;
  if (trimmed.includes('drive.google.com')) {
    const fileId = extractDriveFileId(trimmed);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  return trimmed;
}

export interface FileSoldierMatch {
  soldier: Soldier | null;
  matchType: 'PX_CODE' | 'NATIONAL_ID' | 'NAME' | 'INDEX' | 'MANUAL' | 'NONE';
  confidence: number;
  matchReason?: string;
}

export function matchFileToSoldier(
  fileName: string,
  soldiers: Soldier[]
): FileSoldierMatch {
  if (!fileName || !soldiers || soldiers.length === 0) {
    return { soldier: null, matchType: 'NONE', confidence: 0 };
  }

  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
  const lowerBase = baseName.toLowerCase();
  const cleanBase = lowerBase.replace(/^(พลฯ|พลทหาร|นาย|ส\.ต\.|จ\.ส\.อ\.)\s*/g, '');

  // 1. Match by PX Code
  for (const s of soldiers) {
    if (s.px_code) {
      const sPx = s.px_code.toLowerCase().trim();
      if (lowerBase === sPx || lowerBase.includes(sPx) || sPx.includes(lowerBase)) {
        return { soldier: s, matchType: 'PX_CODE', confidence: 1.0, matchReason: `ตรงกับรหัส PX: ${s.px_code}` };
      }
    }
  }

  // 2. Match by 13-digit National ID
  const idMatch = baseName.match(/\d{13}/);
  if (idMatch) {
    const found = soldiers.find(s => s.national_id && s.national_id.trim() === idMatch[0]);
    if (found) {
      return { soldier: found, matchType: 'NATIONAL_ID', confidence: 0.95, matchReason: `ตรงกับเลข ปชช.: ${found.national_id}` };
    }
  }

  // 3. Match by Full Name
  for (const s of soldiers) {
    if (s.full_name) {
      const sName = s.full_name.toLowerCase().trim();
      const sClean = sName.replace(/^(พลฯ|พลทหาร|นาย|ส\.ต\.|จ\.ส\.อ\.)\s*/g, '');
      if (cleanBase.length >= 3 && (lowerBase === sName || cleanBase === sClean || lowerBase.includes(sClean) || sClean.includes(cleanBase))) {
        return { soldier: s, matchType: 'NAME', confidence: 0.9, matchReason: `ตรงกับชื่อ: ${s.full_name}` };
      }
    }
  }

  // 4. Match by Numeric Index
  const numMatch = baseName.match(/^0*(\d{1,3})$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < soldiers.length) {
      const s = soldiers[idx];
      return { soldier: s, matchType: 'INDEX', confidence: 0.7, matchReason: `ตรงกับลำดับ #${idx + 1} (${s.full_name})` };
    }
  }

  return { soldier: null, matchType: 'NONE', confidence: 0 };
}

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

export interface ApiClientConfig {
  gasWebAppUrl?: string;
}

export class PXApiClient {
  private gasWebAppUrl: string;

  constructor(config: ApiClientConfig = {}) {
    this.gasWebAppUrl = config.gasWebAppUrl || DEFAULT_GAS_URL;
  }

  setGasUrl(gasWebAppUrl: string) {
    if (gasWebAppUrl) {
      this.gasWebAppUrl = gasWebAppUrl;
    }
  }

  getGasUrl(): string {
    return this.gasWebAppUrl;
  }

  getScriptId(): string {
    return SCRIPT_ID;
  }

  /**
   * แปลง URL เป็น Vite Proxy ในเครื่อง (/api/gas) เพื่อแก้ปัญหา CORS 100%
   */
  private getProxyUrl(targetUrl?: string): string {
    const url = targetUrl || this.gasWebAppUrl;
    if (url.startsWith('https://script.google.com/')) {
      return url.replace('https://script.google.com/', '/api/gas/');
    }
    return url;
  }

  private async safeParseJson(res: Response): Promise<any> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        throw new Error(
          'Google Apps Script ตอบกลับเป็นหน้าเว็บ HTML (Google Login) แทนที่จะเป็น JSON — เกิดจาก Deployment ยังไม่ได้ตั้งสิทธิ์ "Who has access (ผู้มีสิทธิ์เข้าถึง)" เป็น "Anyone (ทุกคน)" หรือยังไม่ได้รับสิทธิ์'
        );
      }
      throw new Error(`ไม่สามารถแปลงข้อมูล JSON ได้: ${text.slice(0, 100)}...`);
    }
  }

  private async postGas(action: string, payload: any = {}, batchId: string = '2569_1') {
    const endpoint = this.getProxyUrl();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, payload, batchId })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return this.safeParseJson(res);
  }

  // ----------------------------------------
  // 1. User Management (Global Users Table)
  // ----------------------------------------
  async login(username: string, passwordOrPin: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const json = await this.postGas('login', { username, password: passwordOrPin, pin: passwordOrPin });
      if (json.status === 'SUCCESS' && json.user) {
        return {
          success: true,
          user: json.user
        };
      }
      if (json.status === 'ERROR') {
        return { success: false, error: json.message || 'เข้าสู่ระบบไม่สำเร็จ' };
      }
      return await mockBackend.login(username, passwordOrPin);
    } catch (e: any) {
      console.warn('Backend login unavailable, falling back to mockBackend:', e);
      return await mockBackend.login(username, passwordOrPin);
    }
  }

  async unlockWithPin(userId: string, pin: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const json = await this.postGas('unlockWithPin', { userId, pin });
      if (json.status === 'SUCCESS' && json.user) {
        return {
          success: true,
          user: json.user
        };
      }
      if (json.status === 'ERROR') {
        return { success: false, error: json.message || 'รหัส PIN ไม่ถูกต้อง' };
      }
      return await mockBackend.unlockWithPin(userId, pin);
    } catch (e: any) {
      console.warn('Backend unlock unavailable, falling back to mockBackend:', e);
      return await mockBackend.unlockWithPin(userId, pin);
    }
  }

  async googleLogin(payload: { google_id?: string; email?: string; credential?: string }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const json = await this.postGas('googleLogin', payload);
      if (json.status === 'SUCCESS' && json.user) {
        return {
          success: true,
          user: json.user
        };
      }
      if (json.status === 'ERROR') {
        return { success: false, error: json.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ' };
      }
      return await mockBackend.googleLogin(payload);
    } catch (e: any) {
      console.warn('Backend googleLogin unavailable, falling back to mockBackend:', e);
      return await mockBackend.googleLogin(payload);
    }
  }

  async lineLogin(payload: { line_user_id: string }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const json = await this.postGas('lineLogin', payload);
      if (json.status === 'SUCCESS' && json.user) {
        return {
          success: true,
          user: json.user
        };
      }
      if (json.status === 'ERROR') {
        return { success: false, error: json.message || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ' };
      }
      return await mockBackend.lineLogin(payload);
    } catch (e: any) {
      console.warn('Backend lineLogin unavailable, falling back to mockBackend:', e);
      return await mockBackend.lineLogin(payload);
    }
  }

  async sendLinePushNotification(payload: { target_user_id: string; channel_access_token?: string; messages?: any[]; flex_contents?: any; text?: string; alt_text?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const json = await this.postGas('sendLinePushNotification', payload);
      if (json.status === 'SUCCESS') {
        return { success: true, message: json.message || 'ส่งการแจ้งเตือนสำเร็จ' };
      }
      if (json.status === 'ERROR') {
        return { success: false, error: json.message || 'ส่งการแจ้งเตือนไม่สำเร็จ' };
      }
      return await mockBackend.sendLinePushNotification(payload);
    } catch (e: any) {
      console.warn('Backend sendLinePushNotification unavailable, falling back to mockBackend:', e);
      return await mockBackend.sendLinePushNotification(payload);
    }
  }

  async sendLineNotifyTest(token: string, message: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const json = await this.postGas('sendLineNotifyTest', { token, message });
      if (json.status === 'SUCCESS') {
        return { success: true, message: json.message || 'ส่ง LINE Notify สำเร็จ' };
      }
      return await mockBackend.sendLineNotifyTest(token, message);
    } catch (e: any) {
      return await mockBackend.sendLineNotifyTest(token, message);
    }
  }

  async getUsers(): Promise<User[]> {
    const endpoint = `${this.getProxyUrl()}?action=getUsers`;
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ไม่สามารถดึงรายชื่อผู้ใช้จาก Google Sheets ได้`);
      }
      const json = await this.safeParseJson(res);
      return json.data || [];
    } catch (e) {
      console.warn('Backend getUsers unavailable, falling back to mockBackend:', e);
      return await mockBackend.getUsers();
    }
  }

  async createUser(user: Partial<User>): Promise<{ success: boolean; data?: User; user?: User; error?: string }> {
    try {
      const json = await this.postGas('createUser', { user });
      if (json.status === 'SUCCESS') {
        const created = { ...user, user_id: json.user_id || user.user_id } as User;
        return {
          success: true,
          data: created,
          user: created
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถสร้างผู้ใช้ได้' };
    } catch (e: any) {
      return await mockBackend.createUser(user as any);
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; data?: User; user?: User; error?: string }> {
    try {
      const json = await this.postGas('updateUser', { userId, updates });
      if (json.status === 'SUCCESS') {
        const updated = { ...updates, user_id: userId } as User;
        return { success: true, data: updated, user: updated };
      }
      return { success: false, error: json.message || 'ไม่สามารถอัปเดตผู้ใช้ได้' };
    } catch (e: any) {
      return await mockBackend.updateUser(userId, updates);
    }
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const json = await this.postGas('deleteUser', { userId });
      if (json.status === 'SUCCESS') {
        return { success: true };
      }
      return { success: false, error: json.message || 'ไม่สามารถลบผู้ใช้ได้' };
    } catch (e: any) {
      return await mockBackend.deleteUser(userId);
    }
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; is_active?: boolean; error?: string }> {
    try {
      const json = await this.postGas('toggleUserStatus', { userId });
      if (json.status === 'SUCCESS') {
        return { success: true, is_active: json.is_active };
      }
      return { success: false, error: json.message || 'ไม่สามารถเปลี่ยนสถานะได้' };
    } catch (e: any) {
      return await mockBackend.toggleUserStatus(userId);
    }
  }

  async toggleUserActive(userId: string): Promise<{ success: boolean; is_active?: boolean; error?: string }> {
    return this.toggleUserStatus(userId);
  }

  // ----------------------------------------
  // 2. Drive Folders Management
  // ----------------------------------------
  async getDriveFolders(): Promise<DriveFolder[]> {
    try {
      const endpoint = `${this.getProxyUrl()}?action=getDriveFolders`;
      const res = await fetch(endpoint);
      const json = await this.safeParseJson(res);
      return json.data || [];
    } catch (e) {
      return [];
    }
  }

  async createDriveFolder(payload: { folder_name: string; parent_folder_id?: string }): Promise<{
    success: boolean;
    folder?: DriveFolder;
    error?: string;
    message?: string;
  }> {
    try {
      const json = await this.postGas('createDriveFolder', payload);
      if (json.status === 'SUCCESS' || json.success) {
        return {
          success: true,
          folder: json.folder || json.data,
          message: json.message
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถสร้างโฟลเดอร์ใหม่ได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async linkDriveFolder(payload: { folder_url_or_id: string; folder_name?: string }): Promise<{
    success: boolean;
    folder?: DriveFolder;
    is_duplicate?: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const json = await this.postGas('linkDriveFolder', payload);
      if (json.status === 'SUCCESS' || json.success) {
        return {
          success: true,
          folder: json.folder || json.data,
          is_duplicate: json.is_duplicate,
          message: json.message
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถผูกโฟลเดอร์ได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async toggleLinkDriveFolder(folderId: string, isLinked: boolean): Promise<{
    success: boolean;
    is_linked?: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const json = await this.postGas('toggleLinkDriveFolder', { folder_id: folderId, is_linked: isLinked });
      if (json.status === 'SUCCESS' || json.success) {
        return { success: true, is_linked: isLinked, message: json.message };
      }
      return { success: false, error: json.message || 'ไม่สามารถเปลี่ยนสถานะการผูกโฟลเดอร์ได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async setDefaultDriveFolder(folderId: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const json = await this.postGas('setDefaultDriveFolder', { folder_id: folderId });
      if (json.status === 'SUCCESS' || json.success) {
        return { success: true, message: json.message };
      }
      return { success: false, error: json.message || 'ไม่สามารถตั้งเป็นโฟลเดอร์หลักได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async deleteDriveFolder(folderId: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const json = await this.postGas('deleteDriveFolder', { folder_id: folderId });
      if (json.status === 'SUCCESS' || json.success) {
        return { success: true, message: json.message };
      }
      return { success: false, error: json.message || 'ไม่สามารถลบการผูกโฟลเดอร์ได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  // ----------------------------------------
  // 3. Batches, Products, Soldiers & Sellers
  // ----------------------------------------
  async getBatches(): Promise<{
    batch_id: string;
    batch_name: string;
    spreadsheet_id?: string;
    start_date?: string;
    end_date?: string;
    default_credit_limit?: number;
    is_active_batch?: boolean;
  }[]> {
    try {
      const endpoint = `${this.getProxyUrl()}?action=getBatches`;
      const res = await fetch(endpoint);
      const json = await this.safeParseJson(res);
      return json.data || [];
    } catch (e) {
      return [];
    }
  }

  async createBatchSheet(payload: {
    batch_id: string;
    batch_name: string;
    default_credit_limit?: number;
    start_date?: string;
    end_date?: string;
    target_folder_id?: string;
  }): Promise<{
    success: boolean;
    batch_id?: string;
    batch_name?: string;
    spreadsheet_id?: string;
    sheet_url?: string;
    folder_id?: string;
    folder_name?: string;
    folder_url?: string;
    tables_created?: number;
    error?: string;
  }> {
    try {
      const json = await this.postGas('createBatchSheet', payload);
      if (json.status === 'SUCCESS' || json.success) {
        return {
          success: true,
          batch_id: json.batch_id,
          batch_name: json.batch_name,
          spreadsheet_id: json.spreadsheet_id,
          sheet_url: json.sheet_url,
          folder_id: json.folder_id,
          folder_name: json.folder_name,
          folder_url: json.folder_url,
          tables_created: json.tables_created
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถสร้างชีตผลัดใหม่ได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async deleteBatch(batchId: string, deleteFile: boolean = false, spreadsheetId?: string): Promise<{
    success: boolean;
    batch_id?: string;
    file_trashed?: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const json = await this.postGas('deleteBatch', {
        batch_id: batchId,
        delete_file: deleteFile,
        spreadsheet_id: spreadsheetId
      });
      if (json.status === 'SUCCESS' || json.success) {
        return {
          success: true,
          batch_id: json.batch_id,
          file_trashed: json.file_trashed,
          message: json.message
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถลบผลัดได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async getProducts(): Promise<ProductCatalog[]> {
    const endpoint = `${this.getProxyUrl()}?action=getProducts`;
    const res = await fetch(endpoint);
    const json = await this.safeParseJson(res);
    return json.data || [];
  }

  async getSoldiers(batchId: string = '2569_1'): Promise<(Soldier & { remaining_credit: number; cash_balance: number; credit_balance: number; soldier_id: string })[]> {
    const endpoint = `${this.getProxyUrl()}?action=getSoldiers&batchId=${encodeURIComponent(batchId)}`;
    const res = await fetch(endpoint);
    const json = await this.safeParseJson(res);
    return json.data || [];
  }

  async saveSoldier(
    batchId: string,
    soldier: Partial<Soldier>
  ): Promise<{ success: boolean; data?: Soldier; error?: string; message?: string }> {
    try {
      const json = await this.postGas('saveSoldier', soldier, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data, message: json.message || 'บันทึกข้อมูลทหารสำเร็จ' };
      }
      return { success: false, error: json.message || 'ไม่สามารถบันทึกข้อมูลทหารได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async deleteSoldier(
    batchId: string,
    pxCode: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const json = await this.postGas('deleteSoldier', { px_code: pxCode }, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, message: json.message || 'ลบข้อมูลทหารเรียบร้อย' };
      }
      return { success: false, error: json.message || 'ไม่สามารถลบข้อมูลทหารได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async toggleSoldierStatus(
    batchId: string,
    pxCode: string,
    status: SoldierStatus
  ): Promise<{ success: boolean; status_value?: string; error?: string; message?: string }> {
    try {
      const json = await this.postGas('toggleSoldierStatus', { px_code: pxCode, status }, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, status_value: json.status_value, message: json.message || 'ปรับสถานะสำเร็จ' };
      }
      return { success: false, error: json.message || 'ไม่สามารถปรับสถานะทหารได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async uploadSoldierImage(payload: {
    batch_id: string;
    px_code: string;
    image_base64: string;
    mime_type?: string;
    folder_id?: string;
  }): Promise<{
    status: string;
    success: boolean;
    file_id?: string;
    file_name?: string;
    image_url?: string;
    web_view_link?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const json = await this.postGas('uploadSoldierImage', payload);
      return {
        status: json.status || 'SUCCESS',
        success: json.success !== false && json.status !== 'ERROR',
        file_id: json.file_id,
        file_name: json.file_name,
        image_url: json.image_url,
        web_view_link: json.web_view_link,
        message: json.message,
        error: json.error || (json.status === 'ERROR' ? json.message : undefined)
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        success: false,
        error: e.message || 'ไม่สามารถอัปโหลดรูปภาพประจำตัวทหารได้'
      };
    }
  }

  async batchUpdateSoldierPhotos(
    batchId: string,
    updates: Array<{ px_code: string; photo_url: string }>
  ): Promise<{ success: boolean; updated_count?: number; error?: string; message?: string }> {
    try {
      const json = await this.postGas('batchUpdateSoldierPhotos', { batch_id: batchId, updates });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, updated_count: json.updated_count, message: json.message || 'อัปเดตรูปถ่ายพลทหารสำเร็จ' };
      }
      return { success: false, error: json.message || 'ไม่สามารถอัปเดตรูปถ่ายได้' };
    } catch (e: any) {
      return { success: false, error: e.message || e.toString() };
    }
  }

  async scanDriveFolderForSoldierPhotos(
    batchId: string,
    folderId: string
  ): Promise<{ success: boolean; matched_count?: number; matched?: any[]; error?: string; message?: string }> {
    try {
      const json = await this.postGas('scanDriveFolderSoldierPhotos', { batch_id: batchId, folder_id: folderId });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return {
          success: true,
          matched_count: json.matched_count,
          matched: json.matched,
          message: json.message || 'สแกนรูปในโฟลเดอร์สำเร็จ'
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถสแกนโฟลเดอร์ Drive ได้' };
    } catch (e: any) {
      return { success: false, error: e.message || e.toString() };
    }
  }

  async batchImportSoldiers(
    batchId: string,
    soldiers: Partial<Soldier>[],
    mode: 'SKIP_DUPLICATES' | 'UPSERT' = 'SKIP_DUPLICATES'
  ): Promise<{
    success: boolean;
    count_imported?: number;
    count_updated?: number;
    count_skipped?: number;
    total_processed?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const json = await this.postGas('batchImportSoldiers', { soldiers, mode }, batchId);
      if (json.status === 'SUCCESS' || json.success) {
        return {
          success: true,
          count_imported: json.count_imported,
          count_updated: json.count_updated,
          count_skipped: json.count_skipped,
          total_processed: json.total_processed,
          message: json.message
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถนำเข้าข้อมูลทหารได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async getSellers(): Promise<Seller[]> {
    try {
      const endpoint = `${this.getProxyUrl()}?action=getSellers`;
      const res = await fetch(endpoint);
      const json = await this.safeParseJson(res);
      return (json && json.data && Array.isArray(json.data)) ? json.data : [];
    } catch (e) {
      console.error('Failed to fetch live sellers from GAS:', e);
      return [];
    }
  }

  async createSeller(seller: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
    try {
      const json = await this.postGas('createSeller', { seller });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json?.message || json?.error || 'เกิดข้อผิดพลาดในการสร้างผู้ฝากขาย' };
    } catch (e: any) {
      console.error('Failed to create seller:', e);
      return { success: false, error: e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  }

  async updateSeller(sellerId: string, updates: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
    try {
      const json = await this.postGas('updateSeller', { seller_id: sellerId, updates });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json?.message || json?.error || 'เกิดข้อผิดพลาดในการอัปเดตผู้ฝากขาย' };
    } catch (e: any) {
      console.error('Failed to update seller:', e);
      return { success: false, error: e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  }

  async deleteSeller(sellerId: string, cascadeProducts: boolean = true): Promise<{ success: boolean; deletedProductsCount?: number; error?: string }> {
    try {
      const json = await this.postGas('deleteSeller', { seller_id: sellerId, cascade: cascadeProducts });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, deletedProductsCount: json.deletedProductsCount };
      }
      return { success: false, error: json?.message || json?.error || 'เกิดข้อผิดพลาดในการลบผู้ฝากขาย' };
    } catch (e: any) {
      console.error('Failed to delete seller:', e);
      return { success: false, error: e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  }

  async uploadSellerAvatar(payload: {
    seller_id: string;
    image_base64: string;
    mime_type?: string;
    folder_id?: string;
  }): Promise<{ status?: string; success: boolean; image_url?: string; file_id?: string; web_view_link?: string; message?: string; error?: string }> {
    try {
      const json = await this.postGas('uploadSellerAvatar', payload);
      return {
        status: json.status || 'SUCCESS',
        success: json.success !== false && json.status !== 'ERROR',
        file_id: json.file_id,
        image_url: json.image_url,
        web_view_link: json.web_view_link,
        message: json.message,
        error: json.error || (json.status === 'ERROR' ? json.message : undefined)
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        success: false,
        error: e.message || 'ไม่สามารถอัปโหลดรูปโปรไฟล์ผู้ฝากขายได้'
      };
    }
  }

  async uploadUserAvatar(payload: {
    user_id?: string;
    image_base64: string;
    mime_type?: string;
    folder_id?: string;
  }): Promise<{ status?: string; success: boolean; image_url?: string; file_id?: string; web_view_link?: string; message?: string; error?: string }> {
    try {
      const json = await this.postGas('uploadUserAvatar', payload);
      return {
        status: json.status || 'SUCCESS',
        success: json.success !== false && json.status !== 'ERROR',
        file_id: json.file_id,
        image_url: json.image_url,
        web_view_link: json.web_view_link,
        message: json.message,
        error: json.error || (json.status === 'ERROR' ? json.message : undefined)
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        success: false,
        error: e.message || 'ไม่สามารถอัปโหลดรูปโปรไฟล์ผู้ใช้ได้'
      };
    }
  }

  async uploadDriveFile(payload: {
    file_name?: string;
    image_base64: string;
    mime_type?: string;
    folder_id?: string;
  }): Promise<{ status?: string; success: boolean; image_url?: string; file_id?: string; web_view_link?: string; message?: string; error?: string }> {
    return this.uploadUserAvatar(payload);
  }

  async getProductUOMs(): Promise<ProductUOMConversion[]> {
    try {
      const endpoint = `${this.getProxyUrl()}?action=getProductUOMs`;
      const res = await fetch(endpoint);
      const json = await this.safeParseJson(res);
      return (json && json.data && Array.isArray(json.data)) ? json.data : [];
    } catch (e) {
      console.error('Failed to fetch product UOMs from GAS:', e);
      return [];
    }
  }

  async saveProductUOM(payload: Partial<ProductUOMConversion>): Promise<{ success: boolean; data?: ProductUOMConversion; error?: string; message?: string }> {
    try {
      const json = await this.postGas('saveProductUOM', payload);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data, message: json.message || 'บันทึกหน่วยนับสำเร็จ' };
      }
      return { success: false, error: json.message || 'ไม่สามารถบันทึกหน่วยนับได้' };
    } catch (e: any) {
      return { success: false, error: e.message || e.toString() };
    }
  }

  async deleteProductUOM(payload: { conversion_id?: string; barcode?: string }): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const json = await this.postGas('deleteProductUOM', payload);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, message: json.message || 'ลบหน่วยนับสำเร็จ' };
      }
      return { success: false, error: json.message || 'ไม่สามารถลบหน่วยนับได้' };
    } catch (e: any) {
      return { success: false, error: e.message || e.toString() };
    }
  }

  async deleteProduct(payload: { barcode: string; force?: boolean }): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const json = await this.postGas('deleteProduct', payload);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, message: json.message || 'ลบสินค้าเรียบร้อย' };
      }
      return { success: false, error: json.message || 'ไม่สามารถลบสินค้าได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  // ----------------------------------------
  // Promotions Management
  // ----------------------------------------
  async getPromotions(): Promise<{ success: boolean; data: Promotion[]; error?: string }> {
    try {
      const endpoint = `${this.getProxyUrl()}?action=getPromotions`;
      const res = await fetch(endpoint);
      const json = await this.safeParseJson(res);
      if (json && (json.status === 'SUCCESS' || json.success) && Array.isArray(json.data)) {
        return { success: true, data: json.data };
      }
      return mockBackend.getPromotions();
    } catch (e: any) {
      console.warn('Failed to fetch promotions from GAS, falling back to mockBackend:', e);
      return mockBackend.getPromotions();
    }
  }

  async createPromotion(payload: Partial<Promotion>): Promise<{ success: boolean; data?: Promotion; error?: string }> {
    try {
      const json = await this.postGas('createPromotion', { promotion: payload });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data };
      }
      return mockBackend.createPromotion(payload as any);
    } catch (e: any) {
      console.warn('Failed to create promotion in GAS, falling back to mockBackend:', e);
      return mockBackend.createPromotion(payload as any);
    }
  }

  async updatePromotion(promoId: string, updates: Partial<Promotion>): Promise<{ success: boolean; data?: Promotion; error?: string }> {
    try {
      const json = await this.postGas('updatePromotion', { promo_id: promoId, updates });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data };
      }
      return mockBackend.updatePromotion(promoId, updates);
    } catch (e: any) {
      console.warn('Failed to update promotion in GAS, falling back to mockBackend:', e);
      return mockBackend.updatePromotion(promoId, updates);
    }
  }

  async deletePromotion(promoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const json = await this.postGas('deletePromotion', { promo_id: promoId });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true };
      }
      return mockBackend.deletePromotion(promoId);
    } catch (e: any) {
      console.warn('Failed to delete promotion in GAS, falling back to mockBackend:', e);
      return mockBackend.deletePromotion(promoId);
    }
  }

  async togglePromotionActive(promoId: string): Promise<{ success: boolean; is_active?: boolean; error?: string }> {
    try {
      const json = await this.postGas('togglePromotionActive', { promo_id: promoId });
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, is_active: json.is_active };
      }
      return mockBackend.togglePromotionActive(promoId);
    } catch (e: any) {
      console.warn('Failed to toggle promotion active in GAS, falling back to mockBackend:', e);
      return mockBackend.togglePromotionActive(promoId);
    }
  }

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
        error: json.error || (json.status === 'ERROR' ? json.message : undefined)
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
        error: json.error || (json.status === 'ERROR' ? json.message : undefined)
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        success: false,
        error: e.message || 'ไม่สามารถลบไฟล์ใน Google Drive ได้'
      };
    }
  }

  async toggleProductActive(payload: { barcode: string; is_active: boolean }): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const json = await this.postGas('toggleProductActive', payload);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, message: json.message || 'ปรับปรุงสถานะสินค้าเรียบร้อย' };
      }
      return { success: false, error: json.message || 'ไม่สามารถปรับปรุงสถานะสินค้าได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async stockInProduct(payload: StockInPayload): Promise<StockInResponse> {
    try {
      const json = await this.postGas('stockInProduct', payload);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return {
          success: true,
          log_id: json.log_id,
          base_barcode: json.base_barcode,
          scanned_barcode: json.scanned_barcode,
          is_pack: json.is_pack,
          pack_name: json.pack_name,
          conversion_factor: json.conversion_factor,
          quantity_entered: json.quantity_entered,
          base_quantity_added: json.base_quantity_added,
          previous_stock: json.previous_stock,
          new_stock: json.new_stock,
          cost_price: json.cost_price,
          total_cost: json.total_cost,
          message: json.message || 'รับของเข้าสต็อกสำเร็จ'
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถรับสินค้าเข้าสต็อกได้' };
    } catch (e: any) {
      return { success: false, error: e.message || e.toString() };
    }
  }

  async getStockInLogs(filters?: StockInLogFilters): Promise<StockInLogsResponse> {
    const params = new URLSearchParams({ action: 'getStockInLogs' });
    if (filters?.barcode) params.set('barcode', filters.barcode);
    if (filters?.seller_id) params.set('seller_id', filters.seller_id);
    if (filters?.date_preset) params.set('date_preset', filters.date_preset);
    if (filters?.date_from) params.set('date_from', filters.date_from);
    if (filters?.date_to) params.set('date_to', filters.date_to);

    try {
      const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.error('Failed to fetch stock in logs:', err);
      return {
        status: 'ERROR',
        success: false,
        data: [],
        summary: { total_logs: 0, total_quantity: 0, total_cost_amount: 0 },
        error: err.message || 'ไม่สามารถดึงประวัติการรับเข้าสต็อกได้'
      };
    }
  }

  async getSoldierByBarcode(barcode: string, batchId: string = '2569_1'): Promise<(Soldier & { remaining_credit: number; cash_balance: number; credit_balance: number; soldier_id: string }) | null> {
    const endpoint = `${this.getProxyUrl()}?action=getSoldier&barcode=${encodeURIComponent(barcode)}&batchId=${encodeURIComponent(batchId)}`;
    const res = await fetch(endpoint);
    const json = await this.safeParseJson(res);
    return json.soldier || json.data || null;
  }

  async createOrder(payload: any, batchId: string = '2569_1'): Promise<{ success: boolean; order_id?: string; error?: string }> {
    try {
      const json = await this.postGas('createOrder', payload, batchId);
      return {
        success: json.status === 'SUCCESS',
        order_id: payload.order_id,
        error: json.status !== 'SUCCESS' ? json.message : undefined
      };
    } catch (e: any) {
      return { success: false, error: e.toString() };
    }
  }

  async topupSoldierWallet(
    soldier_id: string,
    amount: number,
    method: 'CASH' | 'TRANSFER',
    staff_user_id: string,
    batchId: string = '2569_1'
  ): Promise<{ success: boolean; new_cash_balance: number; error?: string }> {
    try {
      const json = await this.postGas('topupSoldier', { soldier_id, amount, method, staff_user_id }, batchId);
      return {
        success: json.status === 'SUCCESS',
        new_cash_balance: json.new_cash_balance,
        error: json.status !== 'SUCCESS' ? json.message : undefined
      };
    } catch (e: any) {
      return { success: false, new_cash_balance: 0, error: e.toString() };
    }
  }

  async syncBatch(batchOrders: any[], batchId: string = '2569_1'): Promise<{ success: boolean; synced_count: number }> {
    try {
      const json = await this.postGas('syncBatch', { orders: batchOrders }, batchId);
      return {
        success: json.status === 'SUCCESS',
        synced_count: json.synced_count || batchOrders.length
      };
    } catch (e) {
      return { success: false, synced_count: 0 };
    }
  }

  async generatePayrollExport(
    batchId: string = '2569_1',
    monthPeriod?: string
  ): Promise<{ success: boolean; count?: number; month_period?: string; data?: any[]; error?: string }> {
    try {
      const json = await this.postGas('GENERATE_PAYROLL_EXPORT', { month_period: monthPeriod || '' }, batchId);
      if (json.status === 'SUCCESS') {
        return {
          success: true,
          count: json.count || json.exported_count || (json.data ? json.data.length : 0),
          month_period: json.month_period,
          data: json.data || []
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถประมวลผลการตัดเงินเดือนได้' };
    } catch (e: any) {
      return { success: false, error: e.toString() };
    }
  }

  async getOrders(batchId: string = '2569_1', filters?: {
    search?: string;
    payment_method?: string;
    is_party_split?: boolean | 'ALL';
    date_preset?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    status: string;
    success: boolean;
    data: (Order & { buyer_name?: string; buyer_unit?: string; split_count?: number })[];
    summary: {
      total_sales: number;
      total_orders: number;
      party_splits: number;
      credit_sales: number;
      cash_sales: number;
    };
    error?: string;
  }> {
    const params = new URLSearchParams({ action: 'getOrders', batchId });
    if (filters?.search) params.set('search', filters.search);
    if (filters?.payment_method && filters.payment_method !== 'ALL') params.set('payment_method', filters.payment_method);
    if (filters?.is_party_split !== undefined && filters.is_party_split !== 'ALL') params.set('is_party_split', String(filters.is_party_split));
    if (filters?.date_preset) params.set('date_preset', filters.date_preset);
    if (filters?.date_from) params.set('date_from', filters.date_from);
    if (filters?.date_to) params.set('date_to', filters.date_to);

    try {
      const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      return {
        status: json.status || 'SUCCESS',
        success: json.status === 'SUCCESS' || json.success === true,
        data: json.data || [],
        summary: json.summary || { total_sales: 0, total_orders: 0, party_splits: 0, credit_sales: 0, cash_sales: 0 }
      };
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      return {
        status: 'ERROR',
        success: false,
        data: [],
        summary: { total_sales: 0, total_orders: 0, party_splits: 0, credit_sales: 0, cash_sales: 0 },
        error: err.message || 'ไม่สามารถดึงประวัติการขายได้'
      };
    }
  }

  async getOrderDetails(batchId: string = '2569_1', orderId: string): Promise<{
    status: string;
    success: boolean;
    data?: {
      order: Order;
      items: (OrderItem & { product_name?: string; unit_name?: string })[];
      splits: (OrderSplit & { soldier_name?: string; rank?: string; unit?: string })[];
      primary_buyer?: Soldier | null;
    };
    error?: string;
  }> {
    const params = new URLSearchParams({ action: 'getOrderDetails', batchId, order_id: orderId });
    try {
      const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      return {
        status: json.status || 'SUCCESS',
        success: json.status === 'SUCCESS' || json.success === true,
        data: json.data,
        error: json.message
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        success: false,
        error: err.message || 'ไม่สามารถดึงข้อมูลรายละเอียดบิลได้'
      };
    }
  }

  async voidOrder(batchId: string = '2569_1', payload: {
    order_id: string;
    void_reason: string;
    voided_by: string;
    authorized_by: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const json = await this.postGas('VOID_ORDER', payload, batchId);
      if (json.status === 'SUCCESS' || json.success) {
        return { success: true, message: json.message || 'ยกเลิกบิลสำเร็จ' };
      }
      return { success: false, error: json.message || 'ไม่สามารถยกเลิกบิลได้' };
    } catch (err: any) {
      return { success: false, error: err.message || err.toString() };
    }
  }

  async batchImportProducts(
    mode: 'NEW_PRODUCTS' | 'UPDATE_CATALOG' | 'RESTOCK',
    products: any[],
    conflictMode: 'SKIP_DUPLICATES' | 'UPSERT' = 'SKIP_DUPLICATES'
  ): Promise<{
    success: boolean;
    count_imported?: number;
    count_updated?: number;
    count_skipped?: number;
    count_logged?: number;
    total_processed?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const json = await this.postGas('batchImportProducts', { mode, products, conflictMode });
      if (json.status === 'SUCCESS' || json.success) {
        return {
          success: true,
          count_imported: json.count_imported,
          count_updated: json.count_updated,
          count_skipped: json.count_skipped,
          count_logged: json.count_logged,
          total_processed: json.total_processed,
          message: json.message
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถนำเข้าข้อมูลสินค้าได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async updateBatchConfig(payload: {
    batch_id: string;
    batch_name?: string;
    start_date?: string;
    end_date?: string;
    default_credit_limit?: number;
  }): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const json = await this.postGas('updateBatchConfig', payload);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, data: json.data, message: json.message || 'อัปเดตข้อมูลผลัดเรียบร้อย' };
      }
      return { success: false, error: json.message || 'ไม่สามารถอัปเดตข้อมูลผลัดได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async executeBatchDeductions(
    batchId: string,
    payload: {
      batch_id: string;
      month_period: string;
      deduction_items: any[];
      target_soldier_ids?: string[];
      admin_user_id: string;
      admin_name: string;
      target_wallet?: 'ALLOWANCE' | 'CASH' | 'SALARY';
    }
  ): Promise<{ success: boolean; affected_count?: number; total_deducted?: number; error?: string; message?: string }> {
    try {
      const json = await this.postGas('executeBatchDeductions', payload, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return {
          success: true,
          affected_count: json.affected_count,
          total_deducted: json.total_deducted,
          message: json.message || 'หักค่าใช้จ่ายประจำเดือนสำเร็จ'
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถหักค่าใช้จ่ายได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  // ---------------------------------------------------
  // Payroll Calendar / Deduction Configs / History (server-persisted)
  // ---------------------------------------------------
  async getPayrollSchedules(
    batchId: string
  ): Promise<{ success: boolean; data: MonthlyPayrollSchedule[]; error?: string }> {
    try {
      const params = new URLSearchParams({ action: 'getPayrollSchedules', batchId });
      const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await this.safeParseJson(res);
      return { success: true, data: json.data || [] };
    } catch (e: any) {
      return { success: false, data: [], error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async savePayrollSchedules(
    batchId: string,
    schedules: MonthlyPayrollSchedule[]
  ): Promise<{ success: boolean; saved_count?: number; error?: string; message?: string }> {
    try {
      const json = await this.postGas('savePayrollSchedules', { schedules }, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, saved_count: json.saved_count, message: json.message };
      }
      return { success: false, error: json.message || 'ไม่สามารถบันทึกปฏิทินเงินเดือนได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async getDeductionConfigs(
    batchId: string
  ): Promise<{ success: boolean; data: DeductionConfigItem[]; error?: string }> {
    try {
      const params = new URLSearchParams({ action: 'getDeductionConfigs', batchId });
      const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await this.safeParseJson(res);
      return { success: true, data: json.data || [] };
    } catch (e: any) {
      return { success: false, data: [], error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async saveDeductionConfigs(
    batchId: string,
    items: DeductionConfigItem[]
  ): Promise<{ success: boolean; saved_count?: number; error?: string; message?: string }> {
    try {
      const json = await this.postGas('saveDeductionConfigs', { items }, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, saved_count: json.saved_count, message: json.message };
      }
      return { success: false, error: json.message || 'ไม่สามารถบันทึกรายการหักเงินได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async getDeductionHistory(
    batchId: string
  ): Promise<{ success: boolean; data: CompletedDeductionRecord[]; error?: string }> {
    try {
      const params = new URLSearchParams({ action: 'getDeductionHistory', batchId });
      const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await this.safeParseJson(res);
      return { success: true, data: json.data || [] };
    } catch (e: any) {
      return { success: false, data: [], error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async saveDeductionHistory(
    batchId: string,
    record: CompletedDeductionRecord
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const json = await this.postGas('saveDeductionHistory', { record }, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return { success: true, message: json.message };
      }
      return { success: false, error: json.message || 'ไม่สามารถบันทึกประวัติการตัดยอดได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }

  async batchSalaryTopup(
    batchId: string,
    payload: SalaryTopupRequest
  ): Promise<{ success: boolean; updated_count?: number; total_amount?: number; error?: string; message?: string }> {
    try {
      const json = await this.postGas('batchSalaryTopup', payload, batchId);
      if (json && (json.status === 'SUCCESS' || json.success)) {
        return {
          success: true,
          updated_count: json.updated_count,
          total_amount: json.total_amount,
          message: json.message || 'เพิ่มเงินเดือน/เบี้ยเลี้ยงสำเร็จ'
        };
      }
      return { success: false, error: json.message || 'ไม่สามารถเพิ่มเงินได้' };
    } catch (e: any) {
      return { success: false, error: `เกิดข้อผิดพลาด: ${e.message || e.toString()}` };
    }
  }
}

export const api = new PXApiClient();

export interface ParsedSoldierRow {
  rowIndex: number;
  px_code: string;
  national_id: string;
  full_name: string;
  unit: string;
  credit_limit: number;
  deductions: number;
  photo_url?: string;
  status: SoldierStatus;
  
  // Validation info
  validationStatus: 'VALID' | 'DUPLICATE' | 'ERROR';
  errors: string[];
  warnings: string[];
  isDbDuplicate: boolean;
  isFileDuplicate: boolean;
  existingSoldier?: Soldier;
  isSelected: boolean;
}

export interface ValidationSummary {
  total: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ParsedSoldierRow[];
}

/**
 * Download Soldier Template in CSV or Excel XML format
 */
export function downloadSoldierTemplate(
  batchId: string = '2569_1',
  _batchName: string = 'ผลัด 1/2569',
  format: 'csv' | 'excel_xml' = 'csv'
) {
  const prefix = batchId.replace(/[^a-zA-Z0-9]/g, '');
  const sampleRows = [
    {
      px_code: `W21-${prefix}-001`,
      national_id: '1349900123456',
      full_name: 'พลทหาร สมชาย ใจดี',
      unit: 'ร้อย.1',
      credit_limit: 2000,
      deductions: 0,
      photo_url: '',
      status: 'ACTIVE'
    },
    {
      px_code: `W21-${prefix}-002`,
      national_id: '1349900123457',
      full_name: 'พลทหาร สมศักดิ์ รักชาติ',
      unit: 'ร้อย.2',
      credit_limit: 2000,
      deductions: 0,
      photo_url: '',
      status: 'ACTIVE'
    },
    {
      px_code: `W21-${prefix}-003`,
      national_id: '1349900123458',
      full_name: 'พลทหาร วิชัย มั่นคง',
      unit: 'บก.ร้อย',
      credit_limit: 2000,
      deductions: 0,
      photo_url: '',
      status: 'ACTIVE'
    }
  ];

  if (format === 'csv') {
    const headers = [
      'รหัสทหาร (px_code)',
      'เลขบัตรประชาชน 13 หลัก (national_id)',
      'ชื่อ-สกุล (full_name)',
      'สังกัด (unit)',
      'วงเงินสวัสดิการ (credit_limit)',
      'หักค่าใช้จ่ายคงที่ (deductions)',
      'ลิงก์รูปถ่าย (photo_url)',
      'สถานะ (status: ACTIVE/SUSPENDED/DISCHARGED)'
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(r => [
        `"${r.px_code}"`,
        `="${r.national_id}"`, // Force text format for 13-digit IDs in Excel
        `"${r.full_name}"`,
        `"${r.unit}"`,
        r.credit_limit,
        r.deductions,
        `"${r.photo_url}"`,
        `"${r.status}"`
      ].join(','))
    ].join('\r\n');

    // Add UTF-8 BOM so Excel opens Thai fonts correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `Template_Soldiers_Batch_${batchId}.csv`);
  } else {
    // Excel XML (SpreadsheetML 2003)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="TH Sarabun New" x:CharSet="222" ss:Size="14"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="TH Sarabun New" x:CharSet="222" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Text">
   <NumberFormat ss:Format="@"/>
  </Style>
  <Style ss:ID="Number">
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Soldiers_${batchId}">
  <Table ss:DefaultRowHeight="22">
   <Column ss:Width="120"/>
   <Column ss:Width="160"/>
   <Column ss:Width="180"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Row ss:Height="26" ss:StyleID="Header">
    <Cell><Data ss:Type="String">รหัสทหาร (px_code)</Data></Cell>
    <Cell><Data ss:Type="String">เลขบัตรประชาชน 13 หลัก (national_id)</Data></Cell>
    <Cell><Data ss:Type="String">ชื่อ-สกุล (full_name)</Data></Cell>
    <Cell><Data ss:Type="String">สังกัด (unit)</Data></Cell>
    <Cell><Data ss:Type="String">วงเงินสวัสดิการ (credit_limit)</Data></Cell>
    <Cell><Data ss:Type="String">หักค่าใช้จ่ายคงที่ (deductions)</Data></Cell>
    <Cell><Data ss:Type="String">ลิงก์รูปถ่าย (photo_url)</Data></Cell>
    <Cell><Data ss:Type="String">สถานะ (status)</Data></Cell>
   </Row>
   ${sampleRows.map(r => `
   <Row>
    <Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(r.px_code)}</Data></Cell>
    <Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(r.national_id)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.full_name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.unit)}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.credit_limit}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.deductions}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.photo_url)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.status)}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    triggerDownload(blob, `Template_Soldiers_Batch_${batchId}.xls`);
  }
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV or XML file into raw soldier rows
 */
export async function parseSoldierFile(file: File): Promise<any[]> {
  const text = await readFileAsText(file);
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xml') || fileName.endsWith('.xls') || text.includes('<?xml') || text.includes('<Workbook')) {
    return parseExcelXml(text);
  } else {
    return parseCsvOrTsv(text);
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function parseCsvOrTsv(text: string): any[] {
  let cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r\n|\n|\r/);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  const rawHeaders = parseCsvLine(firstLine, delimiter);
  const headerKeys = rawHeaders.map(h => normalizeHeaderKey(h));

  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line, delimiter);
    if (values.every(v => !v)) continue;

    const rowObj: any = { _rowIndex: i + 1 };
    headerKeys.forEach((key, idx) => {
      if (key) {
        let val = values[idx] || '';
        val = val.replace(/^="?|"?$/g, '').trim();
        rowObj[key] = val;
      }
    });
    results.push(rowObj);
  }

  return results;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseExcelXml(xmlText: string): any[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const rows = Array.from(xmlDoc.querySelectorAll('Row'));
  if (rows.length < 2) return [];

  const headerRow = rows[0];
  const headerCells = Array.from(headerRow.querySelectorAll('Cell'));
  const headerKeys = headerCells.map(c => normalizeHeaderKey(c.textContent || ''));

  const results: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('Cell'));
    if (cells.length === 0) continue;

    const rowObj: any = { _rowIndex: i + 1 };
    let hasData = false;

    headerKeys.forEach((key, idx) => {
      if (key && cells[idx]) {
        const val = (cells[idx].textContent || '').trim();
        if (val) hasData = true;
        rowObj[key] = val;
      }
    });

    if (hasData) {
      results.push(rowObj);
    }
  }

  return results;
}

function normalizeHeaderKey(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
  
  if (h.includes('pxcode') || h.includes('รหัสทหาร') || h.includes('รหัสบาร์โค้ด') || h.includes('รหัสpx') || h.includes('barcode') || h === 'รหัส') {
    return 'px_code';
  }
  if (h.includes('nationalid') || h.includes('เลขประจำตัวประชาชน') || h.includes('บัตรประชาชน') || h.includes('เลขบัตร') || h.includes('citizenid') || h.includes('idcard')) {
    return 'national_id';
  }
  if (h.includes('fullname') || h.includes('ชื่อสกุล') || h.includes('ชื่อ') || h.includes('ชื่อและนามสกุล') || h.includes('name')) {
    return 'full_name';
  }
  if (h.includes('unit') || h.includes('สังกัด') || h.includes('กองร้อย') || h.includes('หน่วย')) {
    return 'unit';
  }
  if (h.includes('creditlimit') || h.includes('วงเงินสวัสดิการ') || h.includes('วงเงิน') || h.includes('credit')) {
    return 'credit_limit';
  }
  if (h.includes('deduction') || h.includes('หักค่าใช้จ่าย') || h.includes('หักคงที่') || h.includes('บังคับตัด')) {
    return 'deductions';
  }
  if (h.includes('photourl') || h.includes('รูปภาพ') || h.includes('รูปถ่าย') || h.includes('photo') || h.includes('image')) {
    return 'photo_url';
  }
  if (h.includes('status') || h.includes('สถานะ')) {
    return 'status';
  }
  return '';
}

/**
 * Pre-validation engine: checks required fields, 13-digit ID, duplicates in file, duplicates in DB
 */
export function validateSoldierRows(
  rawRows: any[],
  existingSoldiers: Soldier[] = []
): ValidationSummary {
  const existingByNationalId = new Map<string, Soldier>();
  const existingByPxCode = new Map<string, Soldier>();

  existingSoldiers.forEach(s => {
    if (s.national_id) existingByNationalId.set(s.national_id.replace(/\D/g, ''), s);
    if (s.px_code) existingByPxCode.set(s.px_code.trim().toUpperCase(), s);
  });

  const filePxCodes = new Set<string>();
  const fileNationalIds = new Set<string>();

  const parsedRows: ParsedSoldierRow[] = rawRows.map((raw, idx) => {
    const rowIndex = raw._rowIndex || idx + 1;
    const px_code = (raw.px_code || '').toString().trim();
    let national_id = (raw.national_id || '').toString().replace(/\D/g, '').trim();
    const full_name = (raw.full_name || '').toString().trim();
    const unit = (raw.unit || 'บก.ร้อย').toString().trim();
    const credit_limit = parseFloat(raw.credit_limit) || 2000;
    const deductions = parseFloat(raw.deductions) || 0;
    const photo_url = (raw.photo_url || '').toString().trim();
    
    let rawStatus = (raw.status || 'ACTIVE').toString().trim().toUpperCase();
    let status: SoldierStatus = 'ACTIVE';
    if (rawStatus === 'SUSPENDED' || rawStatus === 'ระงับ') status = 'SUSPENDED';
    else if (rawStatus === 'DISCHARGED' || rawStatus === 'ปลดประจำการ' || rawStatus === 'ปลด') status = 'DISCHARGED';

    const errors: string[] = [];
    const warnings: string[] = [];
    let isFileDuplicate = false;
    let isDbDuplicate = false;
    let existingSoldier: Soldier | undefined;

    // Required fields check
    if (!px_code) {
      errors.push('ไม่มีรหัสทหาร (px_code)');
    }
    if (!full_name) {
      errors.push('ไม่มีชื่อ-สกุล (full_name)');
    }

    // National ID format check
    if (national_id) {
      if (national_id.length !== 13) {
        errors.push(`เลขบัตรประชาชนต้องมี 13 หลัก (ปัจจุบันมี ${national_id.length} หลัก)`);
      }
    }

    // File-level duplicate check
    const upperPx = px_code.toUpperCase();
    if (upperPx) {
      if (filePxCodes.has(upperPx)) {
        errors.push(`รหัสทหาร "${px_code}" ซ้ำกับรายการอื่นในไฟล์`);
        isFileDuplicate = true;
      } else {
        filePxCodes.add(upperPx);
      }
    }

    if (national_id && national_id.length === 13) {
      if (fileNationalIds.has(national_id)) {
        errors.push(`เลขบัตรประชาชน "${national_id}" ซ้ำกับรายการอื่นในไฟล์`);
        isFileDuplicate = true;
      } else {
        fileNationalIds.add(national_id);
      }
    }

    // DB-level duplicate check
    if (upperPx && existingByPxCode.has(upperPx)) {
      isDbDuplicate = true;
      existingSoldier = existingByPxCode.get(upperPx);
      warnings.push(`รหัสทหาร "${px_code}" มีอยู่แล้วในระบบ (เดิมชื่อ: ${existingSoldier?.full_name})`);
    } else if (national_id && existingByNationalId.has(national_id)) {
      isDbDuplicate = true;
      existingSoldier = existingByNationalId.get(national_id);
      warnings.push(`เลขบัตรประชาชน "${national_id}" มีอยู่แล้วในระบบ (เดิมชื่อ: ${existingSoldier?.full_name})`);
    }

    // Determine final status
    let validationStatus: 'VALID' | 'DUPLICATE' | 'ERROR' = 'VALID';
    if (errors.length > 0) {
      validationStatus = 'ERROR';
    } else if (isDbDuplicate) {
      validationStatus = 'DUPLICATE';
    }

    return {
      rowIndex,
      px_code,
      national_id,
      full_name,
      unit,
      credit_limit,
      deductions,
      photo_url,
      status,
      validationStatus,
      errors,
      warnings,
      isDbDuplicate,
      isFileDuplicate,
      existingSoldier,
      isSelected: validationStatus !== 'ERROR'
    };
  });

  const validCount = parsedRows.filter(r => r.validationStatus === 'VALID').length;
  const duplicateCount = parsedRows.filter(r => r.validationStatus === 'DUPLICATE').length;
  const errorCount = parsedRows.filter(r => r.validationStatus === 'ERROR').length;

  return {
    total: parsedRows.length,
    validCount,
    duplicateCount,
    errorCount,
    rows: parsedRows
  };
}

export type ProductImportMode = 'NEW_PRODUCTS' | 'UPDATE_CATALOG' | 'RESTOCK';

export interface ParsedProductRow {
  rowIndex: number;
  barcode: string;
  product_name: string;
  category: string;
  unit_name: string;
  selling_price: number;
  cost_price: number;
  stock_qty: number;
  seller_id: string;
  low_stock_threshold: number;
  is_active: boolean;
  quantity_added?: number;
  cost_price_unit?: number;
  invoice_ref?: string;
  received_by?: string;

  // Multi-unit pack fields
  parent_barcode?: string;
  conversion_factor?: number;
  converted_stock_qty?: number;

  // Validation info
  validationStatus: 'VALID' | 'DUPLICATE' | 'ERROR';
  errors: string[];
  warnings: string[];
  isDbDuplicate: boolean;
  isFileDuplicate: boolean;
  existingProduct?: ProductCatalog;
  isSelected: boolean;
}

export interface ProductValidationSummary {
  total: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ParsedProductRow[];
}

/**
 * Download Product Template in CSV or Excel XML format for 3 modes
 */
export function downloadProductTemplate(
  mode: ProductImportMode = 'NEW_PRODUCTS',
  format: 'csv' | 'excel_xml' = 'csv'
) {
  let filename = 'Template_New_Products.csv';
  let sheetName = 'New_Products';
  let headers: string[] = [];
  let sampleData: any[][] = [];

  if (mode === 'NEW_PRODUCTS') {
    filename = format === 'csv' ? 'Template_New_Products.csv' : 'Template_New_Products.xls';
    sheetName = 'New_Products';
    headers = [
      'บาร์โค้ดสินค้า (barcode)',
      'ชื่อสินค้า (product_name)',
      'หมวดหมู่ (category)',
      'หน่วยนับ (unit_name)',
      'ราคาขายหน้าร้าน (selling_price)',
      'ราคาทุนต่อหน่วย (cost_price)',
      'สต็อกเริ่มต้น (stock_qty)',
      'รหัสผู้ฝากขาย (seller_id เช่น S01)',
      'แจ้งเตือนขั้นต่ำ (low_stock_threshold)',
      'รหัสสินค้าตัวแม่กรณีเป็นแพ็ค (parent_barcode)',
      'อัตราแตกหน่วย (conversion_factor)'
    ];
    sampleData = [
      ['885012340101', 'น้ำดื่มสวัสดิการ 600ml', 'เครื่องดื่ม', 'ขวด', 7, 4.5, 120, 'S01', 10, '', 1],
      ['885012340102', 'นมถั่วเหลือง UHT 250ml', 'เครื่องดื่ม', 'กล่อง', 15, 11, 60, 'S01', 10, '', 1],
      ['885012340103', 'ขนมปังเนยสด อบใหม่', 'ขนม', 'ชิ้น', 20, 14, 30, 'S02', 5, '', 1],
      ['885012340104', 'นมถั่วเหลือง UHT (แพ็ค 6)', 'เครื่องดื่ม', 'แพ็ค', 85, 0, 0, 'S01', 5, '885012340102', 6]
    ];
  } else if (mode === 'UPDATE_CATALOG') {
    filename = format === 'csv' ? 'Template_Update_Catalog.csv' : 'Template_Update_Catalog.xls';
    sheetName = 'Update_Catalog';
    headers = [
      'บาร์โค้ดสินค้า (barcode)',
      'ชื่อสินค้า (product_name)',
      'หมวดหมู่ (category)',
      'หน่วยนับ (unit_name)',
      'ราคาขายหน้าร้านใหม่ (selling_price)',
      'สถานะเปิดขาย (is_active: TRUE/FALSE)'
    ];
    sampleData = [
      ['885012340101', 'น้ำดื่มสวัสดิการ 600ml', 'เครื่องดื่ม', 'ขวด', 7, 'TRUE'],
      ['885012340102', 'นมถั่วเหลือง UHT 250ml', 'เครื่องดื่ม', 'กล่อง', 15, 'TRUE']
    ];
  } else if (mode === 'RESTOCK') {
    filename = format === 'csv' ? 'Template_Restock_Batch.csv' : 'Template_Restock_Batch.xls';
    sheetName = 'Batch_Restock';
    headers = [
      'บาร์โค้ดสินค้า (barcode)',
      'ชื่อสินค้า (product_name อ้างอิง)',
      'จำนวนรับเข้า (quantity_added)',
      'ราคาทุนใหม่ต่อหน่วย (cost_price_unit)',
      'รหัสผู้ฝากขาย (seller_id เช่น S01)',
      'เลขที่ใบส่งของ/บิล (invoice_ref)',
      'ผู้ตรวจรับสต็อก (received_by)'
    ];
    sampleData = [
      ['885012340101', 'น้ำดื่มสวัสดิการ 600ml', 120, 4.5, 'S01', 'INV-2026-0901', 'จ่าสิบเอก สมชาย'],
      ['885012340102', 'นมถั่วเหลือง UHT 250ml', 48, 11, 'S01', 'INV-2026-0901', 'จ่าสิบเอก สมชาย']
    ];
  }

  if (format === 'csv') {
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        row.map(cell => {
          if (typeof cell === 'string') {
            if (/^\d{8,}$/.test(cell)) {
              return `="${cell}"`;
            }
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
  } else {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="TH Sarabun New" x:CharSet="222" ss:Size="14"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="TH Sarabun New" x:CharSet="222" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Text">
   <NumberFormat ss:Format="@"/>
  </Style>
  <Style ss:ID="Number">
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="Integer">
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table ss:DefaultRowHeight="22">
   ${headers.map(() => `<Column ss:Width="140"/>`).join('')}
   <Row ss:Height="26" ss:StyleID="Header">
    ${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
   </Row>
   ${sampleData.map(row => `
   <Row>
    ${row.map((cell, idx) => {
      if (idx === 0) {
        return `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`;
      }
      if (typeof cell === 'number') {
        const style = Number.isInteger(cell) ? 'Integer' : 'Number';
        return `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${cell}</Data></Cell>`;
      }
      return `<Cell><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`;
    }).join('')}
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    triggerDownload(blob, filename);
  }
}

/**
 * Parse product CSV / Excel file into raw objects
 */
export async function parseProductFile(file: File): Promise<any[]> {
  const text = await readFileAsText(file);
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xml') || fileName.endsWith('.xls') || text.includes('<?xml') || text.includes('<Workbook')) {
    return parseExcelXml(text);
  } else {
    return parseCsvOrTsv(text);
  }
}

/**
 * Pre-validation engine for Products (Mode A, B, C)
 */
export function validateProductRows(
  mode: ProductImportMode,
  rawRows: any[],
  existingProducts: ProductCatalog[] = [],
  existingSellers: Seller[] = []
): ProductValidationSummary {
  const existingCatalogByBarcode = new Map<string, ProductCatalog>();
  existingProducts.forEach(p => {
    if (p.barcode) existingCatalogByBarcode.set(p.barcode.trim().toUpperCase(), p);
  });

  const validSellerIds = new Set<string>();
  existingSellers.forEach(s => {
    if (s.seller_id) validSellerIds.add(s.seller_id.trim().toUpperCase());
  });

  const fileBarcodes = new Set<string>();

  const parsedRows: ParsedProductRow[] = rawRows.map((raw, idx) => {
    const rowIndex = raw._rowIndex || idx + 1;
    
    // Normalize properties
    const barcode = (raw.barcode || raw.รหัสสินค้า || raw.บาร์โค้ด || raw.px_code || '').toString().trim();
    const product_name = (raw.product_name || raw.ชื่อสินค้า || raw.รายการ || raw.full_name || raw.name || '').toString().trim();
    const category = (raw.category || raw.หมวดหมู่ || raw.หมวด || 'ทั่วไป').toString().trim();
    const unit_name = (raw.unit_name || raw.หน่วยนับ || raw.หน่วย || 'ชิ้น').toString().trim();
    const selling_price = parseFloat(raw.selling_price || raw.ราคาขายหน้าร้าน || raw.ราคาขาย || raw.ราคา || 0) || 0;
    const cost_price = parseFloat(raw.cost_price || raw.ราคาทุนต่อหน่วย || raw.ราคาทุน || raw.ทุน || 0) || 0;
    const stock_qty = parseFloat(raw.stock_qty || raw.สต็อกเริ่มต้น || raw.จำนวนสต็อก || raw.สต็อก || 0) || 0;
    const seller_id = (raw.seller_id || raw.รหัสผู้ฝากขาย || raw.ผู้ฝากขาย || 'S01').toString().trim();
    const low_stock_threshold = parseFloat(raw.low_stock_threshold || raw.แจ้งเตือนขั้นต่ำ || 5) || 5;

    const rawActive = raw.is_active !== undefined ? raw.is_active : raw.สถานะเปิดขาย;
    const is_active = rawActive !== undefined ? (rawActive === true || String(rawActive).toUpperCase() === 'TRUE') : true;

    // For Restock mode
    const quantity_added = parseFloat(raw.quantity_added || raw.จำนวนรับเข้า || raw.จำนวน || stock_qty) || 0;
    const cost_price_unit = parseFloat(raw.cost_price_unit || raw.ราคาทุนใหม่ต่อหน่วย || cost_price) || 0;
    const invoice_ref = (raw.invoice_ref || raw.เลขที่ใบส่งของ || raw.เลขที่บิล || 'RESTOCK_BATCH').toString().trim();
    const received_by = (raw.received_by || raw.ผู้ตรวจรับ || raw.ผู้รับ || 'ADMIN').toString().trim();

    // Multi-unit pack fields from raw input
    const rawParentBarcode = (raw.parent_barcode || raw.รหัสสินค้าหลัก || raw.รหัสตัวแม่ || raw.parentBarcode || '').toString().trim();
    const rawFactor = parseFloat(raw.conversion_factor || raw.อัตราแตกหน่วย || raw.จำนวนต่อแพ็ค || raw.conversionFactor || 1);
    const parsedConversionFactor = (!isNaN(rawFactor) && rawFactor > 0) ? rawFactor : 1;

    const errors: string[] = [];
    const warnings: string[] = [];
    let isFileDuplicate = false;
    let isDbDuplicate = false;
    let existingProduct: ProductCatalog | undefined;

    // Barcode check
    if (!barcode) {
      errors.push('ไม่มีรหัสบาร์โค้ดสินค้า (barcode)');
    }

    const upperBarcode = barcode.toUpperCase();
    if (upperBarcode) {
      if (fileBarcodes.has(upperBarcode)) {
        errors.push(`บาร์โค้ด "${barcode}" ซ้ำกับรายการอื่นในไฟล์`);
        isFileDuplicate = true;
      } else {
        fileBarcodes.add(upperBarcode);
      }

      if (existingCatalogByBarcode.has(upperBarcode)) {
        isDbDuplicate = true;
        existingProduct = existingCatalogByBarcode.get(upperBarcode);
      }
    }

    // Mode-specific validation rules
    if (mode === 'NEW_PRODUCTS') {
      if (!product_name) {
        errors.push('ไม่มีชื่อสินค้า (product_name)');
      }
      if (selling_price < 0) {
        errors.push('ราคาขายต้องไม่ติดลบ');
      }
      if (cost_price < 0) {
        errors.push('ราคาทุนต้องไม่ติดลบ');
      }
      if (stock_qty < 0) {
        errors.push('จำนวนสต็อกเริ่มต้นต้องไม่ติดลบ');
      }
      if (isDbDuplicate) {
        warnings.push(`บาร์โค้ด "${barcode}" มีอยู่แล้วในระบบ (เดิมชื่อ: ${existingProduct?.product_name}, ราคา: ฿${existingProduct?.selling_price})`);
      }
      if (seller_id && validSellerIds.size > 0 && !validSellerIds.has(seller_id.toUpperCase())) {
        warnings.push(`รหัสผู้ฝากขาย "${seller_id}" ไม่พบในรายชื่อ Sellers (ระบบจะใช้ S01 อัตโนมัติ)`);
      }
      if (rawParentBarcode) {
        if (rawParentBarcode.toUpperCase() === upperBarcode) {
          errors.push('รหัสสินค้าหลัก (parent_barcode) ต้องไม่ซ้ำกับรหัสบาร์โค้ดตัวเอง');
        } else {
          const parentItem = existingCatalogByBarcode.get(rawParentBarcode.toUpperCase());
          if (parentItem) {
            warnings.push(`📦 สินค้านี้ผูกเป็นแพ็คกับ "${parentItem.product_name}" (1 แพ็ค = ${parsedConversionFactor} ${parentItem.unit_name || 'ชิ้น'})`);
          } else if (!fileBarcodes.has(rawParentBarcode.toUpperCase())) {
            warnings.push(`รหัสสินค้าตัวแม่ "${rawParentBarcode}" ยังไม่พบในแคตตาล็อกระบบ`);
          }
        }
      }
    } else if (mode === 'UPDATE_CATALOG') {
      if (!isDbDuplicate) {
        warnings.push(`ไม่พบบาร์โค้ด "${barcode}" ในระบบ (หากเลือกอัปเดตทับ ระบบจะสร้างเป็นสินค้าใหม่ให้)`);
      }
      if (selling_price < 0) {
        errors.push('ราคาขายต้องไม่ติดลบ');
      }
    } else if (mode === 'RESTOCK') {
      if (quantity_added <= 0) {
        errors.push('จำนวนรับเข้าต้องมากกว่า 0');
      }
      if (!isDbDuplicate) {
        errors.push(`ไม่พบบาร์โค้ด "${barcode}" ในระบบ กรุณาลงทะเบียนสินค้าใหม่ในแคตตาล็อกก่อนรับเข้าสต็อก`);
      } else {
        warnings.push(`สินค้าเป้าหมาย: ${existingProduct?.product_name} (เดิมราคาขาย: ฿${existingProduct?.selling_price})`);

        // Check if existing product is a pack linked to a parent barcode
        const effectiveParentBarcode = (existingProduct?.parent_barcode || rawParentBarcode).trim();
        const effectiveFactor = (existingProduct?.conversion_factor && existingProduct.conversion_factor > 0)
          ? existingProduct.conversion_factor
          : parsedConversionFactor;

        if (effectiveParentBarcode && effectiveFactor > 1) {
          const converted_qty = quantity_added * effectiveFactor;
          const parentItem = existingCatalogByBarcode.get(effectiveParentBarcode.toUpperCase());
          const parentName = parentItem ? parentItem.product_name : `รหัสแม่ ${effectiveParentBarcode}`;
          const unit = parentItem?.unit_name || 'ชิ้น';
          warnings.push(`📦 สินค้าแพ็ค/ลัง (1 แพ็ค = ${effectiveFactor} ${unit}) → สต็อกจริงเข้าคลัง: ${converted_qty.toLocaleString()} ${unit} (คลังสินค้า: ${parentName})`);
        }
      }
      if (cost_price_unit < 0) {
        errors.push('ราคาทุนต่อหน่วยต้องไม่ติดลบ');
      }
    }

    let validationStatus: 'VALID' | 'DUPLICATE' | 'ERROR' = 'VALID';
    if (errors.length > 0) {
      validationStatus = 'ERROR';
    } else if (isDbDuplicate && mode === 'NEW_PRODUCTS') {
      validationStatus = 'DUPLICATE';
    }

    const effectiveParentBarcode = (existingProduct?.parent_barcode || rawParentBarcode).trim();
    const effectiveFactor = (existingProduct?.conversion_factor && existingProduct.conversion_factor > 0)
      ? existingProduct.conversion_factor
      : parsedConversionFactor;
    const converted_stock_qty = (mode === 'RESTOCK' && effectiveParentBarcode && effectiveFactor > 1)
      ? quantity_added * effectiveFactor
      : undefined;

    return {
      rowIndex,
      barcode,
      product_name: product_name || existingProduct?.product_name || barcode,
      category,
      unit_name,
      selling_price,
      cost_price,
      stock_qty,
      seller_id,
      low_stock_threshold,
      is_active,
      quantity_added,
      cost_price_unit,
      invoice_ref,
      received_by,
      parent_barcode: effectiveParentBarcode || undefined,
      conversion_factor: effectiveFactor,
      converted_stock_qty,
      validationStatus,
      errors,
      warnings,
      isDbDuplicate,
      isFileDuplicate,
      existingProduct,
      isSelected: validationStatus !== 'ERROR'
    };
  });

  const validCount = parsedRows.filter(r => r.validationStatus === 'VALID').length;
  const duplicateCount = parsedRows.filter(r => r.validationStatus === 'DUPLICATE').length;
  const errorCount = parsedRows.filter(r => r.validationStatus === 'ERROR').length;

  return {
    total: parsedRows.length,
    validCount,
    duplicateCount,
    errorCount,
    rows: parsedRows
  };
}


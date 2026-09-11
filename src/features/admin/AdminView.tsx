import React, { useState, useEffect, useMemo, useCallback } from 'react';

import type { User, Soldier, ProductCatalog, Seller, ProductUOMConversion, Promotion, AuthUser } from '../../types/schema.ts';
import type { AdminTab, RoutePath } from '../../types/ui.ts';
import { api, type DriveFolder } from '../../core/api.ts';

import { useToast } from '../../hooks/useToast.ts';

import { WelfareTab } from './components/WelfareTab.tsx';
import { BatchesTab, type BatchItem } from './components/BatchesTab.tsx';
import { FoldersTab } from './components/FoldersTab.tsx';
import { ProductsTab } from './components/ProductsTab.tsx';
import { CatalogHubTab } from './components/CatalogHubTab.tsx';
import { PersonnelManagementTab } from './components/PersonnelManagementTab.tsx';
import { PromotionsTab } from './components/PromotionsTab.tsx';
import { getTodayDateString, isPromotionActive } from '../promotions/promotionEngine.ts';
import { DebugSheetModal } from './components/DebugSheetModal.tsx';
import { CreateBatchModal } from './components/CreateBatchModal.tsx';
import { EditBatchModal } from './components/EditBatchModal.tsx';
import { MonthlyDeductionsModal } from './components/MonthlyDeductionsModal.tsx';
import { PayrollCalendarModal } from './components/PayrollCalendarModal.tsx';
import { SalaryTopupModal } from './components/SalaryTopupModal.tsx';
import { CreateFolderModal } from './components/CreateFolderModal.tsx';
import { LinkFolderModal } from './components/LinkFolderModal.tsx';
import { SoldierImportModal } from '../soldiers/components/SoldierImportModal.tsx';
import { SoldierFormModal } from '../soldiers/components/SoldierFormModal.tsx';
import { SoldierDeleteModal } from '../soldiers/components/SoldierDeleteModal.tsx';
import { BatchSoldierPhotoUploadModal } from '../soldiers/components/BatchSoldierPhotoUploadModal.tsx';
import { ProductFormModal } from '../products/components/ProductFormModal.tsx';
import { ProductImportModal } from '../products/components/ProductImportModal.tsx';
import { ProductDeleteModal } from '../products/components/ProductDeleteModal.tsx';
import { StockInModal } from '../inventory/components/StockInModal.tsx';
import { StockInHistoryModal } from '../inventory/components/StockInHistoryModal.tsx';
import { ProductStockHistoryModal } from '../inventory/components/ProductStockHistoryModal.tsx';
import { SellersTab } from './components/SellersTab.tsx';
import { AdminHeader } from './components/AdminHeader.tsx';
import { AdminSidebar } from './components/AdminSidebar.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardTab } from './components/DashboardTab.tsx';
import { OrdersTab } from './components/OrdersTab.tsx';
import { ProfileTab } from './components/ProfileTab.tsx';
import { useAuthStore } from '../../store/useAuthStore.ts';
interface AdminViewProps {
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  selectedBatchId: string;
  setSelectedBatchId: (id: string) => void;
  availableBatches: BatchItem[];
  isLoadingBatches: boolean;
  adminSoldiers: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number; soldier_id?: string })[];
  isLoadingAdmin: boolean;
  loadAdminData: (batchId: string) => void;
  driveFolders: DriveFolder[];
  isLoadingDriveFolders: boolean;
  loadDriveFolders: () => void;
  liveProducts: ProductCatalog[];
  isLoadingProducts: boolean;
  loadProducts: () => void;
  liveSellers: Seller[];
  loadSellers: () => void;
  liveUOMs?: ProductUOMConversion[];
  loadUOMs?: () => void;
  navigateTo: (path: RoutePath) => void;
  onLogout?: () => void;
  onLock?: () => void;
  currentUser?: AuthUser | { name: string; role: string } | null;
  isOnline?: boolean;
  onToggleTheme?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  adminTab,
  setAdminTab,
  selectedBatchId,
  setSelectedBatchId,
  availableBatches,
  isLoadingBatches,
  adminSoldiers,
  isLoadingAdmin,
  loadAdminData,
  driveFolders,
  isLoadingDriveFolders,
  loadDriveFolders,
  liveProducts,
  isLoadingProducts,
  loadProducts,
  liveSellers,
  loadSellers,
  liveUOMs = [],
  loadUOMs,
  navigateTo,
  onLogout = () => {},
  onLock,
  currentUser = null,
  isOnline = true,
  onToggleTheme = () => {}
}) => {
  const { showToast, dismissToast } = useToast();

  const formattedCurrentUser = useMemo(() => {
    if (!currentUser) return null;
    return {
      id: (currentUser as any).user_id || (currentUser as any).id || 'USR-01',
      name: (currentUser as any).full_name || (currentUser as any).name || 'Administrator',
      role: currentUser.role || 'ADMIN'
    };
  }, [currentUser]);

  // Admin Modals
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isLoadingPing, setIsLoadingPing] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);

  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [isMonthlyDeductionsOpen, setIsMonthlyDeductionsOpen] = useState(false);
  const [isPayrollCalendarOpen, setIsPayrollCalendarOpen] = useState(false);
  const [isSalaryTopupOpen, setIsSalaryTopupOpen] = useState(false);
  const [salaryTopupSoldier, setSalaryTopupSoldier] = useState<Soldier | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isLinkFolderOpen, setIsLinkFolderOpen] = useState(false);

  // Soldier CRUD & Import Modals
  const [isUploadSoldierOpen, setIsUploadSoldierOpen] = useState(false);
  const [isSoldierFormOpen, setIsSoldierFormOpen] = useState(false);
  const [isBatchPhotoUploadOpen, setIsBatchPhotoUploadOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [deletingSoldier, setDeletingSoldier] = useState<(Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number; soldier_id?: string }) | null>(null);

  const handleToggleSoldierStatus = async (soldier: Soldier, newStatus: any) => {
    if (!selectedBatchId) return;
    try {
      const res = await api.toggleSoldierStatus(selectedBatchId, soldier.px_code, newStatus);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'อัปเดตสถานะสำเร็จ',
          message: `เปลี่ยนสถานะ ${soldier.full_name} เป็น ${newStatus === 'ACTIVE' ? 'พร้อมใช้งาน' : newStatus === 'SUSPENDED' ? 'ระงับสิทธิ' : 'ปลดประจำการ'}`
        });
        loadAdminData(selectedBatchId);
      } else {
        showToast({ type: 'error', title: 'อัปเดตสถานะไม่สำเร็จ', message: res.error });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    }
  };

  // Product Form, Delete & Import Modals
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductCatalog | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductCatalog | null>(null);
  const [isUploadProductOpen, setIsUploadProductOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [stockInBarcode, setStockInBarcode] = useState<string | undefined>(undefined);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [isStockInHistoryOpen, setIsStockInHistoryOpen] = useState(false);
  const [stockInHistorySellerId, setStockInHistorySellerId] = useState<string | undefined>(undefined);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<ProductCatalog | null>(null);

  // Export Payroll State
  const [isExportingPayroll, setIsExportingPayroll] = useState(false);

  const handleTestPing = async () => {
    setIsLoadingPing(true);
    const startTime = performance.now();
    try {
      const endpoint = `${api.getGasUrl().replace('https://script.google.com/', '/api/gas/')}?action=getSoldiers&batchId=${selectedBatchId}`;
      const res = await fetch(endpoint);
      const latencyMs = Math.round(performance.now() - startTime);
      const json = await res.json();
      setPingResult({
        latencyMs,
        status: res.status === 200 ? '200 OK (CONNECTED)' : `HTTP ${res.status}`,
        endpoint,
        responseData: json
      });
      showToast({ type: 'success', title: 'เชื่อมต่อสำเร็จ', message: 'Google Apps Script ตอบสนองปกติ' });
    } catch (err: any) {
      setPingResult({ error: err.message });
      showToast({ type: 'error', title: 'การเชื่อมต่อล้มเหลว', message: err.message });
    } finally {
      setIsLoadingPing(false);
    }
  };

  const handleExportPayroll = async () => {
    if (!selectedBatchId) {
      showToast({ type: 'warning', title: 'กรุณาเลือกผลัดก่อนตัดยอดเงินเดือน' });
      return;
    }
    setIsExportingPayroll(true);
    const toastId = showToast({
      type: 'loading',
      title: 'กำลังส่งข้อมูลตัดเงินเดือน...',
      message: `กำลังบันทึกลงชีต Payroll_Settlement ผลัด ${selectedBatchId}`
    }, 0);

    try {
      const res = await api.generatePayrollExport(selectedBatchId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'ตัดยอดเงินเดือนสำเร็จ!',
          message: `บันทึกรายการตัดเงินเดือนผลัด ${selectedBatchId} ลง Google Sheet เรียบร้อย`
        });
        loadAdminData(selectedBatchId);
      } else {
        showToast({ type: 'error', title: 'ตัดยอดไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    } finally {
      dismissToast(toastId);
      setIsExportingPayroll(false);
    }
  };

  const handleDeleteBatch = async (batch: BatchItem) => {
    if (!window.confirm(`ยืนยันการลบผลัด "${batch.batch_name || batch.batch_id}" ออกจากระบบ?`)) return;
    try {
      const res = await api.deleteBatch(batch.batch_id, false);
      if (res.success) {
        showToast({ type: 'success', title: 'ลบผลัดสำเร็จ', message: `ลบผลัด ${batch.batch_id} เรียบร้อย` });
        loadAdminData(selectedBatchId);
      } else {
        showToast({ type: 'error', title: 'ลบผลัดไม่สำเร็จ', message: res.error });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    }
  };

  const handleSetDefaultFolder = async (folderId: string) => {
    try {
      const res = await api.setDefaultDriveFolder(folderId);
      if (res.success) {
        showToast({ type: 'success', title: 'ตั้งค่าสำเร็จ', message: 'ตั้งเป็นโฟลเดอร์เริ่มต้นเรียบร้อย' });
        loadDriveFolders();
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    }
  };

  const handleDeleteFolder = async (folder: DriveFolder) => {
    if (!window.confirm(`ยืนยันการยกเลิกการผูกโฟลเดอร์ "${folder.folder_name}"?`)) return;
    try {
      const res = await api.deleteDriveFolder(folder.folder_id);
      if (res.success) {
        showToast({ type: 'success', title: 'ยกเลิกการผูกสำเร็จ', message: `ลบโฟลเดอร์ ${folder.folder_name} ออกจากระบบ` });
        loadDriveFolders();
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    }
  };

  const handleCreateSeller = async (seller: Partial<Seller>) => {
    const toastId = showToast({ type: 'loading', title: 'กำลังเพิ่มผู้ฝากขาย...' }, 0);
    try {
      const res = await api.createSeller(seller);
      dismissToast(toastId);
      if (res.success) {
        showToast({ type: 'success', title: 'เพิ่มผู้ฝากขายสำเร็จ', message: `${seller.seller_name} (${seller.seller_id})` });
        loadSellers();
        return true;
      }
      showToast({ type: 'error', title: 'เพิ่มไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleUpdateSeller = async (sellerId: string, updates: Partial<Seller>) => {
    const toastId = showToast({ type: 'loading', title: 'กำลังอัปเดตข้อมูลผู้ฝากขาย...' }, 0);
    try {
      const res = await api.updateSeller(sellerId, updates);
      dismissToast(toastId);
      if (res.success) {
        showToast({ 
          type: 'success', 
          title: 'อัปเดตข้อมูลสำเร็จ',
          message: updates.is_active !== undefined
            ? (updates.is_active ? 'เปิดใช้งานร้านค้าและเปิดขายสินค้าทั้งหมดแล้ว' : 'ปิดใช้งานร้านค้าและซ่อนสินค้าทั้งหมดจากหน้าร้านแล้ว')
            : undefined
        });
        loadSellers();
        loadProducts();
        return true;
      }
      showToast({ type: 'error', title: 'อัปเดตไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleDeleteSeller = async (sellerId: string, cascadeProducts: boolean) => {
    const toastId = showToast({ type: 'loading', title: 'กำลังลบผู้ฝากขาย...' }, 0);
    try {
      const res = await api.deleteSeller(sellerId, cascadeProducts);
      dismissToast(toastId);
      if (res.success) {
        showToast({ 
          type: 'success', 
          title: 'ลบผู้ฝากขายสำเร็จ', 
          message: res.deletedProductsCount ? `ลบสินค้าที่เกี่ยวข้อง ${res.deletedProductsCount} รายการ` : undefined 
        });
        loadSellers();
        loadProducts();
        return true;
      }
      showToast({ type: 'error', title: 'ลบไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  // Users State & CRUD Handlers
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (userData: Partial<User>): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังสร้างบัญชีผู้ใช้...' }, 0);
    try {
      const res = await api.createUser(userData);
      dismissToast(toastId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'สร้างผู้ใช้สำเร็จ',
          message: `${userData.full_name || userData.username}`
        });
        loadUsers();
        return true;
      }
      showToast({ type: 'error', title: 'สร้างผู้ใช้ไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังอัปเดตข้อมูลผู้ใช้...' }, 0);
    try {
      const res = await api.updateUser(userId, updates);
      dismissToast(toastId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'อัปเดตผู้ใช้สำเร็จ',
          message: updates.full_name || updates.username || 'บันทึกข้อมูลเรียบร้อย'
        });
        loadUsers();
        return true;
      }
      showToast({ type: 'error', title: 'อัปเดตผู้ใช้ไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleUpdateProfile = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังบันทึกข้อมูลโปรไฟล์...' }, 0);
    try {
      const res = await api.updateUser(userId, updates);
      dismissToast(toastId);
      if (res.success) {
        useAuthStore.getState().updateCurrentUser(updates as Partial<AuthUser>);
        showToast({
          type: 'success',
          title: 'บันทึกโปรไฟล์สำเร็จ',
          message: updates.full_name || updates.username || 'อัปเดตข้อมูลผู้ใช้เรียบร้อย'
        });
        loadUsers();
        return true;
      }
      showToast({ type: 'error', title: 'บันทึกโปรไฟล์ไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleDeleteUser = async (userId: string): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังลบบัญชีผู้ใช้...' }, 0);
    try {
      const res = await api.deleteUser(userId);
      dismissToast(toastId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'ลบผู้ใช้สำเร็จ',
          message: `ลบบัญชี ${userId} เรียบร้อย`
        });
        loadUsers();
        return true;
      }
      showToast({ type: 'error', title: 'ลบผู้ใช้ไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleToggleUserStatus = async (userId: string): Promise<boolean> => {
    try {
      const res = await api.toggleUserStatus(userId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'เปลี่ยนสถานะสำเร็จ',
          message: res.is_active ? 'เปิดใช้งานบัญชีแล้ว' : 'ระงับการใช้งานบัญชีแล้ว'
        });
        loadUsers();
        return true;
      }
      showToast({ type: 'error', title: 'เปลี่ยนสถานะไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleToggleSellerStatus = async (sellerId: string, isActive: boolean) => {
    await handleUpdateSeller(sellerId, { is_active: isActive });
  };

  // Promotions State & CRUD Handlers
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [, setIsLoadingPromotions] = useState(false);

  const loadPromotions = async () => {
    setIsLoadingPromotions(true);
    try {
      const res = await api.getPromotions();
      if (res.success && res.data) {
        setPromotions(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load promotions:', err);
    } finally {
      setIsLoadingPromotions(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const activePromosCount = useMemo(() => {
    const today = getTodayDateString();
    return promotions.filter(p => isPromotionActive(p, today)).length;
  }, [promotions]);

  const handleCreatePromotion = async (promoData: Partial<Promotion>): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังสร้างโปรโมชั่น...' }, 0);
    try {
      const res = await api.createPromotion(promoData);
      dismissToast(toastId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'สร้างโปรโมชั่นสำเร็จ',
          message: promoData.promo_name
        });
        loadPromotions();
        return true;
      }
      showToast({ type: 'error', title: 'สร้างไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleUpdatePromotion = async (promoId: string, updates: Partial<Promotion>): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังอัปเดตโปรโมชั่น...' }, 0);
    try {
      const res = await api.updatePromotion(promoId, updates);
      dismissToast(toastId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'อัปเดตโปรโมชั่นสำเร็จ',
          message: updates.promo_name || 'บันทึกการเปลี่ยนแปลงเรียบร้อย'
        });
        loadPromotions();
        return true;
      }
      showToast({ type: 'error', title: 'อัปเดตไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleDeletePromotion = async (promoId: string): Promise<boolean> => {
    const toastId = showToast({ type: 'loading', title: 'กำลังลบโปรโมชั่น...' }, 0);
    try {
      const res = await api.deletePromotion(promoId);
      dismissToast(toastId);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'ลบโปรโมชั่นสำเร็จ',
          message: `ลบโปรโมชั่น ${promoId} เรียบร้อย`
        });
        loadPromotions();
        return true;
      }
      showToast({ type: 'error', title: 'ลบไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      dismissToast(toastId);
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  const handleTogglePromotionActive = async (promoId: string): Promise<boolean> => {
    try {
      const res = await api.togglePromotionActive(promoId);
      if (res.success) {
        loadPromotions();
        return true;
      }
      showToast({ type: 'error', title: 'เปลี่ยนสถานะไม่สำเร็จ', message: res.error || 'เกิดข้อผิดพลาด' });
      return false;
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      return false;
    }
  };

  // Mobile & Collapse Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // If user is SELLER, automatically redirect away from admin-only tabs
  useEffect(() => {
    if (currentUser?.role === 'SELLER') {
      const adminOnlyTabs: AdminTab[] = ['dashboard', 'personnel', 'welfare', 'batches', 'folders'];
      if (adminOnlyTabs.includes(adminTab)) {
        setAdminTab('products');
      }
    }
  }, [currentUser?.role, adminTab, setAdminTab]);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0a0d14] overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        loadDriveFolders={loadDriveFolders}
        loadProducts={loadProducts}
        loadSellers={loadSellers}
        loadPromotions={loadPromotions}
        loadUsers={loadUsers}
        activePromosCount={activePromosCount}
        currentUser={currentUser as any}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Admin Header */}
        <AdminHeader 
          currentPath="/admin"
          onNavigate={navigateTo}
          onLogout={onLogout}
          onLock={onLock}
          onOpenProfile={() => setAdminTab('profile')}
          currentUser={currentUser}
          isOnline={isOnline}
          onToggleTheme={onToggleTheme}
          toggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {adminTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileTab
                  currentUser={currentUser}
                  users={users}
                  onUpdateProfile={handleUpdateProfile}
                  driveFolders={driveFolders}
                  onRefreshUsers={loadUsers}
                />
              </motion.div>
            )}

            {adminTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardTab
                  selectedBatchId={selectedBatchId}
                  setSelectedBatchId={setSelectedBatchId}
                  availableBatches={availableBatches}
                  isLoadingBatches={isLoadingBatches}
                  isLoadingAdmin={isLoadingAdmin}
                  loadAdminData={loadAdminData}
                  adminSoldiersCount={adminSoldiers.length}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onRunTestPing={() => {
                    setIsDebugOpen(true);
                    handleTestPing();
                  }}
                  onExportPayroll={handleExportPayroll}
                  isExportingPayroll={isExportingPayroll}
                  navigateToUsers={() => navigateTo('/users')}
                  onOpenMonthlyDeductions={() => setIsMonthlyDeductionsOpen(true)}
                  onOpenPayrollCalendar={() => setIsPayrollCalendarOpen(true)}
                  onOpenSalaryTopup={() => {
                    setSalaryTopupSoldier(null);
                    setIsSalaryTopupOpen(true);
                  }}
                />
              </motion.div>
            )}

            {adminTab === 'personnel' && (
              <motion.div
                key="personnel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <PersonnelManagementTab
                  users={users}
                  isLoadingUsers={isLoadingUsers}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onToggleUserStatus={handleToggleUserStatus}
                  onRefreshUsers={loadUsers}
                  sellers={liveSellers}
                  products={liveProducts}
                  onCreateSeller={handleCreateSeller}
                  onUpdateSeller={handleUpdateSeller}
                  onDeleteSeller={handleDeleteSeller}
                  onToggleSellerStatus={handleToggleSellerStatus}
                  soldiers={adminSoldiers}
                  isLoadingSoldiers={isLoadingAdmin}
                  selectedBatchId={selectedBatchId}
                  setSelectedBatchId={(id) => {
                    setSelectedBatchId(id);
                    loadAdminData(id);
                  }}
                  availableBatches={availableBatches}
                  currentBatch={availableBatches.find(b => b.batch_id === selectedBatchId)}
                  onOpenCreateSoldier={() => {
                    setEditingSoldier(null);
                    setIsSoldierFormOpen(true);
                  }}
                  onOpenEditSoldier={(soldier) => {
                    setEditingSoldier(soldier);
                    setIsSoldierFormOpen(true);
                  }}
                  onOpenDeleteSoldier={(soldier) => setDeletingSoldier(soldier)}
                  onToggleSoldierStatus={handleToggleSoldierStatus}
                  onOpenUploadSoldiers={() => setIsUploadSoldierOpen(true)}
                  onOpenDownloadTemplate={() => setIsUploadSoldierOpen(true)}
                  onOpenBatchUploadPhotos={() => setIsBatchPhotoUploadOpen(true)}
                  onOpenSalaryTopup={(soldier) => {
                    setSalaryTopupSoldier(soldier || null);
                    setIsSalaryTopupOpen(true);
                  }}
                  onOpenMonthlyDeductions={() => setIsMonthlyDeductionsOpen(true)}
                  onOpenPayrollCalendar={() => setIsPayrollCalendarOpen(true)}
                  driveFolders={driveFolders}
                  currentUser={formattedCurrentUser}
                />
              </motion.div>
            )}

            {adminTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OrdersTab
                  selectedBatchId={selectedBatchId}
                  availableBatches={availableBatches}
                />
              </motion.div>
            )}

            {adminTab === 'welfare' && (
              <motion.div
                key="welfare"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <WelfareTab
                  selectedBatchId={selectedBatchId}
                  setSelectedBatchId={(id) => {
                    setSelectedBatchId(id);
                    loadAdminData(id);
                  }}
                  availableBatches={availableBatches}
                  currentBatch={availableBatches.find(b => b.batch_id === selectedBatchId)}
                  soldiers={adminSoldiers}
                  isLoading={isLoadingAdmin}
                  onNavigateToBatches={() => setAdminTab('batches')}
                  onOpenUploadSoldiers={() => setIsUploadSoldierOpen(true)}
                  onOpenDownloadTemplate={() => setIsUploadSoldierOpen(true)}
                  onOpenCreateSoldier={() => {
                    setEditingSoldier(null);
                    setIsSoldierFormOpen(true);
                  }}
                  onOpenEditSoldier={(soldier) => {
                    setEditingSoldier(soldier);
                    setIsSoldierFormOpen(true);
                  }}
                  onOpenDeleteSoldier={(soldier) => setDeletingSoldier(soldier)}
                  onToggleStatus={handleToggleSoldierStatus}
                  onOpenBatchUploadPhotos={() => setIsBatchPhotoUploadOpen(true)}
                  onOpenMonthlyDeductions={() => setIsMonthlyDeductionsOpen(true)}
                  onOpenPayrollCalendar={() => setIsPayrollCalendarOpen(true)}
                  onOpenSalaryTopup={(soldier) => {
                    setSalaryTopupSoldier(soldier || null);
                    setIsSalaryTopupOpen(true);
                  }}
                />
              </motion.div>
            )}

            {adminTab === 'batches' && (
              <motion.div
                key="batches"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <BatchesTab
                  batches={availableBatches}
                  selectedBatchId={selectedBatchId}
                  onSelectBatch={(batchId) => {
                    setSelectedBatchId(batchId);
                    loadAdminData(batchId);
                    setAdminTab('welfare');
                  }}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onEditBatch={(batch) => {
                    setEditingBatch(batch);
                    setIsEditBatchOpen(true);
                  }}
                  onDeleteBatch={handleDeleteBatch}
                  onOpenMonthlyDeductions={() => setIsMonthlyDeductionsOpen(true)}
                  onOpenPayrollCalendar={() => setIsPayrollCalendarOpen(true)}
                  onOpenSalaryTopup={() => {
                    setSalaryTopupSoldier(null);
                    setIsSalaryTopupOpen(true);
                  }}
                />
              </motion.div>
            )}

            {adminTab === 'folders' && (
              <motion.div
                key="folders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FoldersTab
                  driveFolders={driveFolders}
                  isLoading={isLoadingDriveFolders}
                  onRefreshFolders={loadDriveFolders}
                  onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
                  onOpenLinkFolder={() => setIsLinkFolderOpen(true)}
                  onSetDefaultFolder={handleSetDefaultFolder}
                  onDeleteFolder={handleDeleteFolder}
                />
              </motion.div>
            )}

            {adminTab === 'catalog-hub' && (
              <motion.div
                key="catalog-hub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CatalogHubTab
                  products={liveProducts}
                  sellers={liveSellers}
                  isLoading={isLoadingProducts}
                  productSearch={productSearch}
                  onSearchChange={setProductSearch}
                  categoryFilter={productCategoryFilter}
                  onCategoryFilterChange={setProductCategoryFilter}
                  onOpenAddProduct={() => {
                    setEditingProduct(null);
                    setIsProductFormOpen(true);
                  }}
                  onOpenEditProduct={(prod) => {
                    setEditingProduct(prod);
                    setIsProductFormOpen(true);
                  }}
                  onOpenDeleteProduct={(prod) => setDeletingProduct(prod)}
                  onOpenStockIn={(barcode) => {
                    setStockInBarcode(barcode);
                    setIsStockInOpen(true);
                  }}
                  onOpenImportHub={() => setIsUploadProductOpen(true)}
                  onOpenDownloadTemplate={() => setIsUploadProductOpen(true)}
                  onOpenStockInHistory={() => {
                    setStockInHistorySellerId(undefined);
                    setIsStockInHistoryOpen(true);
                  }}
                  onOpenProductHistory={(prod) => setSelectedHistoryProduct(prod)}
                  onOpenSellerHistory={(sellerId) => {
                    setStockInHistorySellerId(sellerId);
                    setIsStockInHistoryOpen(true);
                  }}
                  onCreateSeller={handleCreateSeller}
                  onUpdateSeller={handleUpdateSeller}
                  onDeleteSeller={handleDeleteSeller}
                  driveFolders={driveFolders}
                  liveUOMs={liveUOMs}
                  onRefresh={() => {
                    loadProducts();
                    loadSellers();
                  }}
                />
              </motion.div>
            )}

            {adminTab === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProductsTab
                  products={liveProducts}
                  isLoading={isLoadingProducts}
                  productSearch={productSearch}
                  onSearchChange={setProductSearch}
                  categoryFilter={productCategoryFilter}
                  onCategoryFilterChange={setProductCategoryFilter}
                  onOpenAddProduct={() => {
                    setEditingProduct(null);
                    setIsProductFormOpen(true);
                  }}
                  onOpenEditProduct={(prod) => {
                    setEditingProduct(prod);
                    setIsProductFormOpen(true);
                  }}
                  onOpenDeleteProduct={(prod) => setDeletingProduct(prod)}
                  onOpenStockIn={(barcode) => {
                    setStockInBarcode(barcode);
                    setIsStockInOpen(true);
                  }}
                  onOpenImportHub={() => setIsUploadProductOpen(true)}
                  onOpenDownloadTemplate={() => setIsUploadProductOpen(true)}
                  onOpenStockInHistory={() => {
                    setStockInHistorySellerId(undefined);
                    setIsStockInHistoryOpen(true);
                  }}
                  onOpenProductHistory={(prod) => setSelectedHistoryProduct(prod)}
                  liveUOMs={liveUOMs}
                />
              </motion.div>
            )}

            {adminTab === 'sellers' && (
              <motion.div
                key="sellers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SellersTab
                  sellers={liveSellers}
                  products={liveProducts}
                  onOpenEditProduct={(prod) => {
                    setEditingProduct(prod);
                    setIsProductFormOpen(true);
                  }}
                  onOpenDeleteProduct={(prod) => setDeletingProduct(prod)}
                  onOpenStockIn={(barcode) => {
                    setStockInBarcode(barcode);
                    setIsStockInOpen(true);
                  }}
                  onOpenProductHistory={(prod) => setSelectedHistoryProduct(prod)}
                  onOpenSellerHistory={(sellerId) => {
                    setStockInHistorySellerId(sellerId);
                    setIsStockInHistoryOpen(true);
                  }}
                  onCreateSeller={handleCreateSeller}
                  onUpdateSeller={handleUpdateSeller}
                  onDeleteSeller={handleDeleteSeller}
                  driveFolders={driveFolders}
                  liveUOMs={liveUOMs}
                />
              </motion.div>
            )}

            {adminTab === 'promotions' && (
              <motion.div
                key="promotions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <PromotionsTab
                  promotions={promotions}
                  products={liveProducts}
                  sellers={liveSellers}
                  onCreatePromotion={handleCreatePromotion}
                  onUpdatePromotion={handleUpdatePromotion}
                  onDeletePromotion={handleDeletePromotion}
                  onTogglePromotionActive={handleTogglePromotionActive}
                  onRefresh={() => {
                    loadPromotions();
                    loadProducts();
                    loadSellers();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      {/* Modals */}
      <DebugSheetModal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        isLoadingPing={isLoadingPing}
        pingResult={pingResult}
        onRunTestPing={handleTestPing}
      />

      <CreateBatchModal
        isOpen={isCreateBatchOpen}
        onClose={() => setIsCreateBatchOpen(false)}
        driveFolders={driveFolders}
        onBatchCreated={(batchId) => {
          setSelectedBatchId(batchId);
          loadAdminData(batchId);
          setAdminTab('welfare');
        }}
      />

      <EditBatchModal
        isOpen={isEditBatchOpen}
        onClose={() => {
          setIsEditBatchOpen(false);
          setEditingBatch(null);
        }}
        batch={editingBatch}
        onSuccess={(updatedBatchId) => {
          loadAdminData(updatedBatchId);
        }}
      />

      <MonthlyDeductionsModal
        isOpen={isMonthlyDeductionsOpen}
        onClose={() => setIsMonthlyDeductionsOpen(false)}
        batchId={selectedBatchId}
        currentBatch={availableBatches.find(b => b.batch_id === selectedBatchId)}
        soldiers={adminSoldiers}
        currentUser={formattedCurrentUser}
        onOpenPayrollCalendar={() => setIsPayrollCalendarOpen(true)}
        onSuccess={() => {
          if (selectedBatchId) loadAdminData(selectedBatchId);
        }}
      />

      <PayrollCalendarModal
        isOpen={isPayrollCalendarOpen}
        onClose={() => setIsPayrollCalendarOpen(false)}
        batchId={selectedBatchId}
        currentBatch={availableBatches.find(b => b.batch_id === selectedBatchId)}
        onSchedulesUpdated={() => {
          if (selectedBatchId) loadAdminData(selectedBatchId);
        }}
      />

      <SalaryTopupModal
        isOpen={isSalaryTopupOpen}
        onClose={() => {
          setIsSalaryTopupOpen(false);
          setSalaryTopupSoldier(null);
        }}
        batchId={selectedBatchId}
        currentBatch={availableBatches.find(b => b.batch_id === selectedBatchId)}
        soldiers={adminSoldiers}
        initialSoldier={salaryTopupSoldier}
        currentUser={formattedCurrentUser}
        onSuccess={() => {
          if (selectedBatchId) loadAdminData(selectedBatchId);
        }}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        driveFolders={driveFolders}
        onFolderCreated={loadDriveFolders}
      />

      <LinkFolderModal
        isOpen={isLinkFolderOpen}
        onClose={() => setIsLinkFolderOpen(false)}
        onFolderLinked={loadDriveFolders}
      />

      <SoldierImportModal
        isOpen={isUploadSoldierOpen}
        onClose={() => setIsUploadSoldierOpen(false)}
        availableBatches={availableBatches}
        currentBatchId={selectedBatchId}
        onSuccess={(batchId) => {
          if (batchId === selectedBatchId) loadAdminData(batchId);
        }}
      />

      <SoldierFormModal
        isOpen={isSoldierFormOpen}
        onClose={() => {
          setIsSoldierFormOpen(false);
          setEditingSoldier(null);
        }}
        editingSoldier={editingSoldier}
        batchId={selectedBatchId}
        driveFolders={driveFolders}
        onSuccess={() => {
          if (selectedBatchId) loadAdminData(selectedBatchId);
        }}
      />

      <SoldierDeleteModal
        isOpen={!!deletingSoldier}
        onClose={() => setDeletingSoldier(null)}
        soldier={deletingSoldier}
        batchId={selectedBatchId}
        onSuccess={() => {
          if (selectedBatchId) loadAdminData(selectedBatchId);
        }}
      />

      <BatchSoldierPhotoUploadModal
        isOpen={isBatchPhotoUploadOpen}
        onClose={() => setIsBatchPhotoUploadOpen(false)}
        batchId={selectedBatchId}
        soldiers={adminSoldiers}
        driveFolders={driveFolders}
        onSuccess={() => {
          if (selectedBatchId) loadAdminData(selectedBatchId);
        }}
      />

      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        editingProduct={editingProduct}
        liveProducts={liveProducts}
        liveSellers={liveSellers}
        liveUOMs={liveUOMs}
        driveFolders={driveFolders}
        onRefreshUOMs={loadUOMs}
        onSuccess={() => {
          loadProducts();
          if (loadUOMs) loadUOMs();
        }}
      />

      <ProductDeleteModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        product={deletingProduct}
        liveUOMs={liveUOMs}
        onSuccess={() => {
          loadProducts();
          if (loadUOMs) loadUOMs();
        }}
      />

      <ProductImportModal
        isOpen={isUploadProductOpen}
        onClose={() => setIsUploadProductOpen(false)}
        liveProducts={liveProducts}
        liveSellers={liveSellers}
        onSuccess={() => {
          loadProducts();
          if (loadUOMs) loadUOMs();
        }}
      />

      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => {
          setIsStockInOpen(false);
          setStockInBarcode(undefined);
        }}
        liveProducts={liveProducts}
        liveUOMs={liveUOMs}
        liveSellers={liveSellers}
        initialBarcode={stockInBarcode}
        onSuccess={() => {
          loadProducts();
          if (loadUOMs) loadUOMs();
        }}
      />

      <StockInHistoryModal
        isOpen={isStockInHistoryOpen}
        onClose={() => {
          setIsStockInHistoryOpen(false);
          setStockInHistorySellerId(undefined);
        }}
        liveSellers={liveSellers}
        liveProducts={liveProducts}
        liveUOMs={liveUOMs}
        initialSellerId={stockInHistorySellerId}
        onOpenProductHistory={(prod) => setSelectedHistoryProduct(prod)}
      />

      <ProductStockHistoryModal
        isOpen={!!selectedHistoryProduct}
        onClose={() => setSelectedHistoryProduct(null)}
        product={selectedHistoryProduct}
        liveSellers={liveSellers}
        liveUOMs={liveUOMs}
        onOpenStockIn={(barcode) => {
          setStockInBarcode(barcode);
          setIsStockInOpen(true);
        }}
      />
      </div>
    </div>
  );
};

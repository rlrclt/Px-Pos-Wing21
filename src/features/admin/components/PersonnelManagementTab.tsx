import React, { useState, useMemo } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  Store,
  KeyRound,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  DollarSign,
  Upload,
  Calendar,
  Calculator,
  AlertTriangle,
  UserX,
  MessageSquare,
  Globe,
  LayoutGrid,
  Table as TableIcon,
  X,
  Sparkles
} from 'lucide-react';
import type { User, Soldier, Seller, SoldierStatus, UserRole, ProductCatalog } from '../../../types/schema.ts';
import { type DriveFolder, normalizeDriveImageUrl } from '../../../core/api.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { AdminStatCard } from './ui/AdminStatCard.tsx';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';
import { UserFormModal } from '../../users/components/UserFormModal.tsx';
import { UserDeleteModal } from '../../users/components/UserDeleteModal.tsx';
import { CreateSellerModal } from './CreateSellerModal.tsx';
import { DeleteSellerModal } from './DeleteSellerModal.tsx';
import type { BatchItem } from './BatchesTab.tsx';
import { isBatchOperationAllowed } from '../../../core/dateUtils.ts';

export interface PersonnelManagementTabProps {
  // Users state & handlers
  users: User[];
  isLoadingUsers: boolean;
  onCreateUser: (userData: Partial<User>) => Promise<boolean>;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onToggleUserStatus: (userId: string) => Promise<boolean>;
  onRefreshUsers?: () => void;

  // Sellers
  sellers: Seller[];
  products?: ProductCatalog[];
  onCreateSeller?: (seller: Partial<Seller>) => Promise<boolean>;
  onUpdateSeller?: (sellerId: string, updates: Partial<Seller>) => Promise<boolean>;
  onDeleteSeller?: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>;
  onOpenCreateSeller?: () => void;
  onOpenEditSeller?: (seller: Seller) => void;
  onOpenDeleteSeller?: (seller: Seller) => void;
  onToggleSellerStatus?: (sellerId: string, isActive: boolean) => void;

  // Soldiers & Batches
  soldiers: (Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number; soldier_id?: string })[];
  isLoadingSoldiers: boolean;
  selectedBatchId: string;
  setSelectedBatchId?: (id: string) => void;
  availableBatches?: BatchItem[];
  currentBatch?: BatchItem;
  onOpenCreateSoldier?: () => void;
  onOpenEditSoldier?: (soldier: Soldier) => void;
  onOpenDeleteSoldier?: (soldier: Soldier) => void;
  onToggleSoldierStatus?: (soldier: Soldier, newStatus: SoldierStatus) => void;
  onOpenUploadSoldiers?: () => void;
  onOpenDownloadTemplate?: () => void;
  onOpenBatchUploadPhotos?: () => void;
  onOpenSalaryTopup?: (soldier?: Soldier) => void;
  onOpenMonthlyDeductions?: () => void;
  onOpenPayrollCalendar?: () => void;

  // Drive & Global
  driveFolders?: DriveFolder[];
  currentUser?: { id?: string; name?: string; role?: string } | null;
}

type SubTabKey = 'admins_staff' | 'sellers' | 'soldiers' | 'access_overview';

export const PersonnelManagementTab: React.FC<PersonnelManagementTabProps> = ({
  users = [],
  isLoadingUsers = false,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onToggleUserStatus,
  onRefreshUsers,

  sellers = [],
  products = [],
  onCreateSeller,
  onUpdateSeller,
  onDeleteSeller,
  onOpenCreateSeller,
  onOpenEditSeller,
  onOpenDeleteSeller,
  onToggleSellerStatus,

  soldiers = [],
  isLoadingSoldiers = false,
  selectedBatchId,
  setSelectedBatchId,
  availableBatches = [],
  currentBatch,
  onOpenCreateSoldier,
  onOpenEditSoldier,
  onOpenDeleteSoldier,
  onToggleSoldierStatus,
  onOpenUploadSoldiers,
  onOpenBatchUploadPhotos,
  onOpenSalaryTopup,
  onOpenMonthlyDeductions,
  onOpenPayrollCalendar,

  driveFolders = []
}) => {
  const { isLight } = useTheme();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('admins_staff');

  // User Modals State
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Seller Modals & View States
  const [isCreateSellerModalOpen, setIsCreateSellerModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [deletingSeller, setDeletingSeller] = useState<Seller | null>(null);
  const [sellerViewMode, setSellerViewMode] = useState<'grid' | 'table'>('grid');

  // Sub-View 1 (Admin & Staff) States
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'ALL' | 'ADMIN' | 'STAFF' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [staffViewMode, setStaffViewMode] = useState<'grid' | 'table'>('grid');

  // Sub-View 2 (Sellers) States
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'LINKED' | 'UNLINKED'>('ALL');

  // Sub-View 3 (Soldiers) States
  const [soldierSearch, setSoldierSearch] = useState('');
  const [soldierStatusFilter, setSoldierStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DISCHARGED'>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [previewSoldierPhoto, setPreviewSoldierPhoto] = useState<Soldier | null>(null);

  // Batch Guard check
  const batchGuard = isBatchOperationAllowed(currentBatch?.start_date, currentBatch?.end_date);

  // ==========================================
  // KPI CALCULATIONS
  // ==========================================
  const totalAdmins = useMemo(() => users.filter(u => u.role === 'ADMIN').length, [users]);
  const totalStaff = useMemo(() => users.filter(u => u.role === 'STAFF').length, [users]);
  // Consignment sellers only (excludes S01 which is the internal HQ/Admin PX store)
  const consignmentSellers = useMemo(() => {
    return sellers.filter(s => s.seller_id !== 'S01');
  }, [sellers]);
  const totalSellerUsers = useMemo(() => users.filter(u => u.role === 'SELLER' && u.seller_id !== 'S01').length, [users]);
  const activeUsersCount = useMemo(() => users.filter(u => u.is_active !== false).length, [users]);

  // Security audit stats
  const defaultPinUsersCount = useMemo(() => users.filter(u => u.pin_hash === '1234').length, [users]);
  const lineConnectedCount = useMemo(() => users.filter(u => !!u.line_user_id || !!u.line_notify_token).length, [users]);

  // Soldiers & Financial calculations
  const totalSoldiers = soldiers.length;
  const totalCreditLimit = useMemo(() => soldiers.reduce((sum, s) => sum + (Number(s.credit_limit) || 0), 0), [soldiers]);

  // Units list for soldiers
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    soldiers.forEach(s => {
      if (s.unit && s.unit.trim()) {
        units.add(s.unit.trim());
      }
    });
    return Array.from(units);
  }, [soldiers]);

  // ==========================================
  // FILTERED DATA
  // ==========================================
  // 1. Admin & Staff Filter
  const filteredStaffUsers = useMemo(() => {
    return users
      .filter(u => u.role === 'ADMIN' || u.role === 'STAFF')
      .filter(u => {
        if (staffRoleFilter === 'ADMIN') return u.role === 'ADMIN';
        if (staffRoleFilter === 'STAFF') return u.role === 'STAFF';
        if (staffRoleFilter === 'ACTIVE') return u.is_active !== false;
        if (staffRoleFilter === 'INACTIVE') return u.is_active === false;
        return true;
      })
      .filter(u => {
        if (!staffSearch.trim()) return true;
        const q = staffSearch.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          u.user_id.toLowerCase().includes(q)
        );
      });
  }, [users, staffRoleFilter, staffSearch]);

  // 2. Seller Accounts Filter (consignment sellers only, excluding S01)
  const sellerAccountsList = useMemo(() => {
    return consignmentSellers.map(seller => {
      const linkedUser = users.find(u => u.role === 'SELLER' && u.seller_id === seller.seller_id);
      return {
        seller,
        linkedUser
      };
    }).filter(item => {
      if (sellerFilter === 'ACTIVE') return item.seller.is_active !== false;
      if (sellerFilter === 'INACTIVE') return item.seller.is_active === false;
      if (sellerFilter === 'LINKED') return !!item.linkedUser;
      if (sellerFilter === 'UNLINKED') return !item.linkedUser;
      return true;
    }).filter(item => {
      if (!sellerSearch.trim()) return true;
      const q = sellerSearch.toLowerCase();
      return (
        item.seller.seller_name.toLowerCase().includes(q) ||
        item.seller.seller_id.toLowerCase().includes(q) ||
        (item.linkedUser?.username && item.linkedUser.username.toLowerCase().includes(q)) ||
        (item.linkedUser?.full_name && item.linkedUser.full_name.toLowerCase().includes(q))
      );
    });
  }, [consignmentSellers, users, sellerFilter, sellerSearch]);

  // 3. Soldiers Filter
  const filteredSoldiers = useMemo(() => {
    return soldiers.filter(s => {
      if (soldierStatusFilter !== 'ALL' && (s.status || 'ACTIVE') !== soldierStatusFilter) {
        return false;
      }
      if (selectedUnit !== 'ALL' && s.unit !== selectedUnit) {
        return false;
      }
      if (!soldierSearch.trim()) return true;
      const q = soldierSearch.toLowerCase();
      return (
        (s.px_code && s.px_code.toLowerCase().includes(q)) ||
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.national_id && s.national_id.toLowerCase().includes(q)) ||
        (s.unit && s.unit.toLowerCase().includes(q))
      );
    });
  }, [soldiers, soldierStatusFilter, selectedUnit, soldierSearch]);

  // ==========================================
  // MODAL & ACTION HANDLERS
  // ==========================================
  const handleOpenCreateUser = (presetRole?: UserRole, presetSellerId?: string) => {
    setEditingUser(presetRole ? {
      user_id: '',
      username: '',
      pin_hash: '1234',
      full_name: '',
      role: presetRole,
      seller_id: presetSellerId,
      is_active: true
    } : null);
    setIsUserFormOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleOpenDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleTriggerCreateSeller = () => {
    if (onOpenCreateSeller) {
      onOpenCreateSeller();
    } else {
      setEditingSeller(null);
      setIsCreateSellerModalOpen(true);
    }
  };

  const handleTriggerEditSeller = (seller: Seller) => {
    if (onOpenEditSeller) {
      onOpenEditSeller(seller);
    } else {
      setEditingSeller(seller);
      setIsCreateSellerModalOpen(true);
    }
  };

  const handleTriggerDeleteSeller = (seller: Seller) => {
    if (onOpenDeleteSeller) {
      onOpenDeleteSeller(seller);
    } else {
      setDeletingSeller(seller);
    }
  };

  const handleTriggerToggleSellerStatus = async (sellerId: string, isCurrentlyActive: boolean) => {
    if (onToggleSellerStatus) {
      onToggleSellerStatus(sellerId, !isCurrentlyActive);
    } else if (onUpdateSeller) {
      await onUpdateSeller(sellerId, { is_active: !isCurrentlyActive });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. TOP HEADER & SUB-TABS NAVIGATION PILLS */}
      <div className={`p-4 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#21262d]">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isLight ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ศูนย์จัดการผู้ใช้งานและกำลังพล (Personnel & Access Hub)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  v2.5 CRUD
                </span>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                บริหารจัดการบัญชีผู้ดูแลระบบ แคชเชียร์ ร้านค้าฝากขาย และทะเบียนพลทหารทุกผลัดในจุดเดียว
              </p>
            </div>
          </div>

          {/* Refresh button */}
          {onRefreshUsers && (
            <button
              onClick={onRefreshUsers}
              disabled={isLoadingUsers}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 self-start lg:self-auto ${
                isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
              }`}
              title="รีเฟรชข้อมูลผู้ใช้"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-blue-500' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          )}
        </div>

        {/* 4 Sub-Tabs Navigation Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
          {/* Sub-Tab 1 */}
          <button
            type="button"
            onClick={() => setActiveSubTab('admins_staff')}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'admins_staff'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/20'
                : isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="truncate">🛡️ เจ้าหน้าที่ระบบ ({totalAdmins + totalStaff})</span>
          </button>

          {/* Sub-Tab 2 */}
          <button
            type="button"
            onClick={() => setActiveSubTab('sellers')}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'sellers'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                : isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span className="truncate">🏪 บัญชีผู้ฝากขาย ({consignmentSellers.length})</span>
          </button>

          {/* Sub-Tab 3 */}
          <button
            type="button"
            onClick={() => setActiveSubTab('soldiers')}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'soldiers'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/20'
                : isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">🪖 ทะเบียนกำลังพล ({soldiers.length})</span>
          </button>

          {/* Sub-Tab 4 */}
          <button
            type="button"
            onClick={() => setActiveSubTab('access_overview')}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'access_overview'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20'
                : isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">📊 สิทธิ์และความปลอดภัย</span>
          </button>
        </div>
      </div>

      {/* 2. TOP KPI BENTO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="เจ้าหน้าที่ระบบ (Admin / Staff)"
          value={`${totalAdmins + totalStaff} บัญชี`}
          subtitle={`ผู้ดูแล ${totalAdmins} • แคชเชียร์ ${totalStaff} • ใช้งานอยู่ ${activeUsersCount}`}
          icon={Shield}
          accentColor="#3B82F6"
        />

        <AdminStatCard
          title="ร้านค้าผู้ฝากขาย (Sellers)"
          value={`${consignmentSellers.length} ร้านค้า`}
          subtitle={`ผูกล็อกอินแล้ว ${totalSellerUsers} ร้าน • เปิดขาย ${consignmentSellers.filter(s => s.is_active !== false).length} ร้าน`}
          icon={Store}
          accentColor="#10B981"
        />

        <AdminStatCard
          title="ทะเบียนพลทหาร (ผลัดปัจจุบัน)"
          value={selectedBatchId ? `${totalSoldiers.toLocaleString()} นาย` : '-'}
          subtitle={selectedBatchId ? `วงเงินสวัสดิการรวม ฿${totalCreditLimit.toLocaleString()}` : 'กรุณาเลือกผลัด'}
          icon={Users}
          accentColor="#6366F1"
        />

        <AdminStatCard
          title="ความปลอดภัย & การเชื่อมต่อ"
          value={defaultPinUsersCount > 0 ? `⚠️ PIN เริ่มต้น ${defaultPinUsersCount}` : '🛡️ ปลอดภัย'}
          subtitle={`LINE แจ้งเตือน ${lineConnectedCount} บัญชี • Google OAuth พร้อม`}
          icon={KeyRound}
          accentColor={defaultPinUsersCount > 0 ? '#F59E0B' : '#8B5CF6'}
        />
      </div>

      {/* 3. SUB-VIEW 1: ADMIN & STAFF (เจ้าหน้าที่ระบบ) */}
      {activeSubTab === 'admins_staff' && (
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
          isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
        }`}>
          <AdminSectionHeader
            title="จัดการผู้ดูแลระบบ & เจ้าหน้าที่แคชเชียร์ (Admin & Staff Management)"
            description="กำหนดสิทธิ์การเข้าถึง POS, แผงควบคุมระบบ, รหัสผ่าน, และรหัส PIN ด่วน"
            icon={Shield}
            badge={`${filteredStaffUsers.length} บัญชี`}
            actions={
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenCreateUser('STAFF')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] min-h-[40px]"
                >
                  <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
                </button>
              </div>
            }
          />

          {/* Controls Bar: Search, Filters & View Mode */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className={`relative flex-1 rounded-xl border flex items-center px-3 py-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <Search className={`w-4 h-4 mr-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="ค้นหาชื่อผู้ใช้, ชื่อ-สกุล, อีเมล..."
                className={`w-full text-xs bg-transparent border-none outline-none ${
                  isLight ? 'text-slate-800 placeholder-slate-400' : 'text-slate-200 placeholder-slate-500'
                }`}
              />
              {staffSearch && (
                <button onClick={() => setStaffSearch('')} className="p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'ADMIN', 'STAFF', 'ACTIVE', 'INACTIVE'] as const).map((filterKey) => {
                const labels: Record<string, string> = {
                  ALL: 'ทั้งหมด',
                  ADMIN: '🛡️ แอดมิน',
                  STAFF: '🧑‍💼 แคชเชียร์',
                  ACTIVE: '🟢 เปิดใช้งาน',
                  INACTIVE: '🔴 ปิดใช้งาน'
                };
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setStaffRoleFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                      staffRoleFilter === filterKey
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-400'
                    }`}
                  >
                    {labels[filterKey]}
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle */}
            <div className={`flex items-center p-1 rounded-xl border text-xs shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <button
                type="button"
                onClick={() => setStaffViewMode('grid')}
                className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  staffViewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">การ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setStaffViewMode('table')}
                className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  staffViewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ตาราง</span>
              </button>
            </div>
          </div>

          {/* Content Loading / Empty / Grid / Table */}
          {isLoadingUsers ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-500" />
              <p className="text-xs">กำลังโหลดรายชื่อผู้ใช้งานจากฐานข้อมูล...</p>
            </div>
          ) : filteredStaffUsers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className={`w-12 h-12 mx-auto mb-3 opacity-30 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
              <h4 className="text-sm font-bold">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</h4>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ลองปรับตัวกรองค้นหา หรือกดปุ่มเพิ่มผู้ใช้งานใหม่
              </p>
            </div>
          ) : staffViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaffUsers.map((user) => {
                const isMasterAdmin = user.user_id === 'USR-01' || user.username?.toLowerCase() === 'admin';
                const hasDefaultPin = user.pin_hash === '1234';

                return (
                  <div
                    key={user.user_id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all relative flex flex-col justify-between ${
                      isLight
                        ? 'bg-white border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md'
                        : 'bg-[#141824] border-[#252C3D] hover:border-blue-500/50'
                    }`}
                  >
                    {/* Top Row: Avatar + Role Badge + Active Toggle */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 ${
                            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#181D2C] border-[#262A36]'
                          }`}>
                            {user.avatar_url ? (
                              <img
                                src={normalizeDriveImageUrl(user.avatar_url)}
                                alt={user.full_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=User';
                                }}
                              />
                            ) : (
                              <Users className={`w-6 h-6 opacity-30 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              {user.role === 'ADMIN' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                  <Shield className="w-3 h-3" /> ADMIN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                                  <UserCheck className="w-3 h-3" /> STAFF
                                </span>
                              )}
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {user.user_id}
                              </span>
                            </div>
                            <h4 className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {user.full_name}
                            </h4>
                          </div>
                        </div>

                        {/* Active status pill */}
                        <button
                          type="button"
                          onClick={() => onToggleUserStatus(user.user_id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer select-none ${
                            user.is_active !== false
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25'
                          }`}
                          title="คลิกเพื่อสลับสถานะเปิด/ปิดการใช้งาน"
                        >
                          {user.is_active !== false ? '🟢 ใช้งาน' : '🔴 ระงับ'}
                        </button>
                      </div>

                      {/* Info & Badges */}
                      <div className={`p-3 rounded-xl border text-xs space-y-1.5 mb-4 ${
                        isLight ? 'bg-slate-50/70 border-slate-200/80' : 'bg-[#181B22]/70 border-[#262A36]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-mono text-[11px]">@{user.username}</span>
                          {user.email && (
                            <span className="text-slate-400 truncate max-w-[130px] text-[11px]">{user.email}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-[#262A36]">
                          {/* PIN Badge */}
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            hasDefaultPin
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            <KeyRound className="w-3 h-3" />
                            <span>{hasDefaultPin ? 'PIN เริ่มต้น (1234)' : 'PIN ตั้งแล้ว'}</span>
                          </div>

                          {/* LINE connection */}
                          {(user.line_user_id || user.line_notify_token) && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                              <MessageSquare className="w-3 h-3" />
                              <span>LINE</span>
                            </div>
                          )}

                          {/* Google OAuth */}
                          {user.google_id && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                              <Globe className="w-3 h-3" />
                              <span>Google</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#262A36]">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(user)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-500" /> แก้ไข
                      </button>

                      {!isMasterAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteUser(user)}
                          className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
                            isLight ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                          }`}
                          title="ลบบัญชีนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#262A36]">
              <table className="w-full text-left text-xs">
                <thead className={`text-[11px] uppercase tracking-wider border-b ${
                  isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#181B22] text-slate-400 border-[#262A36]'
                }`}>
                  <tr>
                    <th className="py-3 px-3.5">ผู้ใช้งาน</th>
                    <th className="py-3 px-3.5">Username</th>
                    <th className="py-3 px-3.5">บทบาท (Role)</th>
                    <th className="py-3 px-3.5">ความปลอดภัย</th>
                    <th className="py-3 px-3.5 text-center">สถานะ</th>
                    <th className="py-3 px-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
                  {filteredStaffUsers.map((user) => {
                    const isMasterAdmin = user.user_id === 'USR-01' || user.username?.toLowerCase() === 'admin';
                    return (
                      <tr key={user.user_id} className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181B22]/60'
                      }`}>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${
                              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
                            }`}>
                              {user.avatar_url ? (
                                <img
                                  src={normalizeDriveImageUrl(user.avatar_url)}
                                  alt={user.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{user.user_id} {user.email ? `• ${user.email}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-blue-500">
                          @{user.username}
                        </td>
                        <td className="py-3 px-3.5">
                          {user.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              <Shield className="w-3 h-3" /> ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                              <UserCheck className="w-3 h-3" /> STAFF
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              user.pin_hash === '1234' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              PIN: {user.pin_hash === '1234' ? '1234 (ค่าเริ่มต้น)' : '••••'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => onToggleUserStatus(user.user_id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer select-none ${
                              user.is_active !== false
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            }`}
                          >
                            {user.is_active !== false ? 'เปิดใช้งาน' : 'ระงับ'}
                          </button>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                              }`}
                              title="แก้ไขผู้ใช้งาน"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            {!isMasterAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteUser(user)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  isLight ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                                }`}
                                title="ลบผู้ใช้งาน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. SUB-VIEW 2: SELLER ACCOUNTS (บัญชีผู้ฝากขาย) */}
      {activeSubTab === 'sellers' && (
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
          isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
        }`}>
          <AdminSectionHeader
            title="จัดการบัญชีร้านค้าฝากขาย (Seller Accounts & Store Logins)"
            description="ผูกบัญชีเข้าใช้งานระบบสำหรับผู้ฝากขาย กำหนดส่วนแบ่ง GP จัดการสิทธิ์การล็อกอิน และระงับ/เปิดใช้งานร้านค้า"
            icon={Store}
            badge={`${consignmentSellers.length} ร้านค้า`}
            actions={
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTriggerCreateSeller}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] min-h-[40px]"
                >
                  <Plus className="w-4 h-4" /> เพิ่มร้านค้าผู้ฝากขาย
                </button>
              </div>
            }
          />

          {/* Controls Bar: Search, Filters & View Mode */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className={`relative flex-1 rounded-xl border flex items-center px-3 py-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <Search className={`w-4 h-4 mr-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder="ค้นหาร้านค้า, รหัสร้าน, บัญชีล็อกอิน..."
                className={`w-full text-xs bg-transparent border-none outline-none ${
                  isLight ? 'text-slate-800 placeholder-slate-400' : 'text-slate-200 placeholder-slate-500'
                }`}
              />
              {sellerSearch && (
                <button onClick={() => setSellerSearch('')} className="p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'ACTIVE', 'INACTIVE', 'LINKED', 'UNLINKED'] as const).map((key) => {
                const labels: Record<string, string> = {
                  ALL: 'ทั้งหมด',
                  ACTIVE: '🟢 เปิดขาย',
                  INACTIVE: '🔴 ระงับ/ปิดร้าน',
                  LINKED: '🔗 ผูกล็อกอินแล้ว',
                  UNLINKED: '⚠️ ยังไม่ผูกล็อกอิน'
                };
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSellerFilter(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                      sellerFilter === key
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-400'
                    }`}
                  >
                    {labels[key]}
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher */}
            <div className={`flex items-center p-1 rounded-xl border shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <button
                type="button"
                onClick={() => setSellerViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
                  sellerViewMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold text-[11px]">การ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setSellerViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
                  sellerViewMode === 'table'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="มุมมองตาราง"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold text-[11px]">ตาราง</span>
              </button>
            </div>
          </div>

          {/* Render Sellers based on View Mode */}
          {sellerAccountsList.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${
              isLight ? 'bg-slate-50/50 border-slate-200 text-slate-400' : 'bg-[#141824]/40 border-[#252C3D] text-slate-500'
            }`}>
              <Store className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลร้านค้าผู้ฝากขายตามเงื่อนไขที่เลือก</p>
            </div>
          ) : sellerViewMode === 'grid' ? (
            /* Bento Grid Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sellerAccountsList.map(({ seller, linkedUser }) => {
                const fee = typeof seller.default_fee_pct === 'number'
                  ? (seller.default_fee_pct < 1 ? seller.default_fee_pct * 100 : seller.default_fee_pct)
                  : 0;
                const isMasterSeller = seller.seller_id === 'S01';

                return (
                  <div
                    key={seller.seller_id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-md ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#262A36]'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Avatar, Store Name, Status Toggle */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 ${
                            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                          }`}>
                            {seller.avatar_url ? (
                              <img
                                src={seller.avatar_url}
                                alt={seller.seller_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Store className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {seller.seller_name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {seller.seller_id}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#181B22] text-slate-600 dark:text-slate-300">
                                GP {fee}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Store Active Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleTriggerToggleSellerStatus(seller.seller_id, seller.is_active !== false)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer select-none flex items-center gap-1 shrink-0 ${
                            seller.is_active !== false
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                          }`}
                          title="คลิกสลับสถานะเปิดขาย / ระงับร้านค้า"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${seller.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {seller.is_active !== false ? 'เปิดขาย' : 'ระงับชั่วคราว'}
                        </button>
                      </div>

                      {/* Contact Info */}
                      {seller.contact_info && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 px-1">
                          📞 {seller.contact_info}
                        </div>
                      )}

                      {/* Linked User Account Info Box */}
                      <div className={`p-3 rounded-xl border text-xs space-y-2 mb-4 ${
                        isLight ? 'bg-slate-50/70 border-slate-200/80' : 'bg-[#181B22]/70 border-[#262A36]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            บัญชีเข้าใช้งาน
                          </span>
                          {linkedUser && (
                            <span className="font-mono text-[11px] text-blue-500 font-bold">
                              @{linkedUser.username}
                            </span>
                          )}
                        </div>

                        {linkedUser ? (
                          <div className="space-y-1.5">
                            <div className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              {linkedUser.full_name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-[#262A36]">
                              {/* PIN Badge */}
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                linkedUser.pin_hash === '1234'
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                <KeyRound className="w-3 h-3" />
                                <span>{linkedUser.pin_hash === '1234' ? 'PIN เริ่มต้น (1234)' : 'PIN ตั้งแล้ว'}</span>
                              </div>

                              {/* LINE connection */}
                              {(linkedUser.line_user_id || linkedUser.line_notify_token) && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>LINE</span>
                                </div>
                              )}

                              {/* User Status */}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                linkedUser.is_active !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {linkedUser.is_active !== false ? 'User: Active' : 'User: Inactive'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateUser('SELLER', seller.seller_id)}
                              className="w-full py-1.5 px-3 rounded-lg border border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> + สร้างบัญชีล็อกอินให้ร้านนี้
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-[#262A36]">
                      <div className="flex items-center gap-1.5">
                        {/* Edit Store Info */}
                        <button
                          type="button"
                          onClick={() => handleTriggerEditSeller(seller)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                            isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                          }`}
                          title="แก้ไขข้อมูลร้านค้า, GP, ข้อมูลติดต่อ"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-500" /> แก้ไขร้าน
                        </button>

                        {/* Edit / Manage User Login */}
                        {linkedUser && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(linkedUser)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              isLight ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400'
                            }`}
                            title="แก้ไขชื่อผู้ใช้, รหัสผ่าน, และรหัส PIN ด่วน"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-500" /> บัญชี & PIN
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Delete User Login button */}
                        {linkedUser && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteUser(linkedUser)}
                            className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
                              isLight ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400'
                            }`}
                            title="ลบบัญชีผู้ใช้ล็อกอิน (ไม่ลบร้านค้า)"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Store button */}
                        {!isMasterSeller && (
                          <button
                            type="button"
                            onClick={() => handleTriggerDeleteSeller(seller)}
                            className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
                              isLight ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                            }`}
                            title="ลบร้านค้านี้ออกจากระบบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#262A36]">
              <table className="w-full text-left text-xs">
                <thead className={`text-[11px] uppercase tracking-wider border-b ${
                  isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#181B22] text-slate-400 border-[#262A36]'
                }`}>
                  <tr>
                    <th className="py-3 px-3.5">ร้านค้า (Seller)</th>
                    <th className="py-3 px-3.5">รหัสร้าน</th>
                    <th className="py-3 px-3.5 text-center">ค่า GP</th>
                    <th className="py-3 px-3.5">บัญชีเข้าใช้งาน (User Login)</th>
                    <th className="py-3 px-3.5">ความปลอดภัย & การแจ้งเตือน</th>
                    <th className="py-3 px-3.5 text-center">สถานะร้าน</th>
                    <th className="py-3 px-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
                  {sellerAccountsList.map(({ seller, linkedUser }) => {
                    const fee = typeof seller.default_fee_pct === 'number'
                      ? (seller.default_fee_pct < 1 ? seller.default_fee_pct * 100 : seller.default_fee_pct)
                      : 0;
                    const isMasterSeller = seller.seller_id === 'S01';

                    return (
                      <tr key={seller.seller_id} className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181B22]/60'
                      }`}>
                        {/* Store Info */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${
                              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'
                            }`}>
                              {seller.avatar_url ? (
                                <img
                                  src={seller.avatar_url}
                                  alt={seller.seller_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Store className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {seller.seller_name}
                              </div>
                              <div className="text-[10px] text-slate-400">{seller.contact_info || 'ไม่มีข้อมูลติดต่อ'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Seller ID */}
                        <td className="py-3 px-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {seller.seller_id}
                        </td>

                        {/* GP Fee */}
                        <td className="py-3 px-3.5 text-center font-mono font-bold">
                          {fee}%
                        </td>

                        {/* Linked User Account */}
                        <td className="py-3 px-3.5">
                          {linkedUser ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                @{linkedUser.username}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({linkedUser.full_name})
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateUser('SELLER', seller.seller_id)}
                              className="px-2.5 py-1 rounded-lg border border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/10 transition cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> สร้างบัญชีล็อกอิน
                            </button>
                          )}
                        </td>

                        {/* Security / Notifications */}
                        <td className="py-3 px-3.5">
                          {linkedUser ? (
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded font-mono ${
                                linkedUser.pin_hash === '1234' ? 'bg-amber-500/15 text-amber-500 font-bold' : 'bg-slate-500/10 text-slate-400'
                              }`}>
                                PIN: {linkedUser.pin_hash === '1234' ? '1234' : '••••'}
                              </span>
                              {(linkedUser.line_user_id || linkedUser.line_notify_token) && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold flex items-center gap-0.5">
                                  <MessageSquare className="w-2.5 h-2.5" /> LINE
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Active status */}
                        <td className="py-3 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTriggerToggleSellerStatus(seller.seller_id, seller.is_active !== false)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              seller.is_active !== false
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            }`}
                            title="คลิกสลับสถานะเปิด/ระงับร้านค้า"
                          >
                            {seller.is_active !== false ? 'เปิดขาย' : 'ระงับร้าน'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Store Info */}
                            <button
                              type="button"
                              onClick={() => handleTriggerEditSeller(seller)}
                              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                              }`}
                              title="แก้ไขข้อมูลร้านค้า"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                            </button>

                            {/* Edit / Manage User Login */}
                            {linkedUser ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(linkedUser)}
                                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                  isLight ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400'
                                }`}
                                title="แก้ไขสิทธิ์/รหัสผ่านและ PIN บัญชีร้านนี้"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                            ) : null}

                            {/* Delete Store */}
                            {!isMasterSeller && (
                              <button
                                type="button"
                                onClick={() => handleTriggerDeleteSeller(seller)}
                                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                  isLight ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                                }`}
                                title="ลบร้านค้านี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-VIEW 3: SOLDIERS REGISTRY (ทะเบียนกำลังพล) */}
      {activeSubTab === 'soldiers' && (
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
          isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
        }`}>
          <AdminSectionHeader
            title={
              currentBatch 
                ? `ทะเบียนพลทหาร & สวัสดิการ (ผลัด ${currentBatch.batch_name || selectedBatchId})` 
                : selectedBatchId 
                  ? `ทะเบียนพลทหาร & สวัสดิการ (ผลัด ${selectedBatchId})` 
                  : "ทะเบียนพลทหาร & สวัสดิการ (ยังไม่ได้เลือกผลัด)"
            }
            description="จัดการรายชื่อกำลังพล วงเงินสวัสดิการ สรุปยอดตัดเงินเดือน และสถานะประจำการ"
            icon={Users}
            badge={selectedBatchId ? `${soldiers.length} นาย` : 'ไม่ได้เลือกผลัด'}
            actions={
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Batch Selector Dropdown */}
                {availableBatches.length > 0 && setSelectedBatchId && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border min-h-[40px] ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#181B22] border-[#262A36]'
                  }`}>
                    <span className={`text-[11px] font-semibold whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      ผลัด:
                    </span>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className={`bg-transparent text-xs sm:text-sm font-black focus:outline-none cursor-pointer ${
                        isLight ? 'text-blue-700' : 'text-blue-400'
                      }`}
                    >
                      <option value="" disabled>-- เลือกผลัด --</option>
                      {availableBatches.map((b) => (
                        <option key={b.batch_id} value={b.batch_id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#111622] text-white'}>
                          {b.batch_name || b.batch_id} {(b.is_active_batch || b.is_active) ? '(🟢 ปัจจุบัน)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Salary Topup */}
                {onOpenSalaryTopup && (
                  <button
                    onClick={() => onOpenSalaryTopup()}
                    disabled={!selectedBatchId || !batchGuard.allowed}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DollarSign className="w-4 h-4" /> เติมเงินเดือน
                  </button>
                )}

                {/* Monthly Deductions */}
                {onOpenMonthlyDeductions && (
                  <button
                    onClick={onOpenMonthlyDeductions}
                    disabled={!selectedBatchId || !batchGuard.allowed}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight 
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900' 
                        : 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/40 text-amber-300'
                    }`}
                  >
                    <Calculator className="w-4 h-4 text-amber-500" /> หักประจำเดือน
                  </button>
                )}

                {/* Payroll Calendar */}
                {onOpenPayrollCalendar && (
                  <button
                    onClick={onOpenPayrollCalendar}
                    disabled={!selectedBatchId || !batchGuard.allowed}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight 
                        ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900' 
                        : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-800/40 text-blue-300'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-blue-500" /> ปฏิทินเงินเดือน
                  </button>
                )}

                {/* Add Soldier */}
                {onOpenCreateSoldier && (
                  <button
                    onClick={onOpenCreateSoldier}
                    disabled={!selectedBatchId}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 select-none active:scale-[0.98] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มพลทหาร
                  </button>
                )}

                {/* Bulk Photo Upload */}
                {onOpenBatchUploadPhotos && (
                  <button
                    onClick={onOpenBatchUploadPhotos}
                    disabled={!selectedBatchId}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700' : 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-800/40 text-purple-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> รูปภาพชุด
                  </button>
                )}

                {/* Import Excel */}
                {onOpenUploadSoldiers && (
                  <button
                    onClick={onOpenUploadSoldiers}
                    disabled={!selectedBatchId}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> นำเข้า Excel
                  </button>
                )}
              </div>
            }
          />

          {/* Search, Company/Unit Filter Pills & Status Filter */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className={`relative flex-1 rounded-xl border flex items-center px-3 py-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
              }`}>
                <Search className={`w-4 h-4 mr-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={soldierSearch}
                  onChange={(e) => setSoldierSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัส PX, เลขบัตรประชาชน..."
                  disabled={!selectedBatchId}
                  className={`w-full text-xs bg-transparent border-none outline-none disabled:opacity-50 ${
                    isLight ? 'text-slate-800 placeholder-slate-400' : 'text-slate-200 placeholder-slate-500'
                  }`}
                />
              </div>

              <select
                value={soldierStatusFilter}
                onChange={(e) => setSoldierStatusFilter(e.target.value as any)}
                disabled={!selectedBatchId}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-hidden min-h-[40px] disabled:opacity-50 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-slate-200'
                }`}
              >
                <option value="ALL">สถานะ: ทั้งหมด</option>
                <option value="ACTIVE">🟢 พร้อมใช้งาน</option>
                <option value="SUSPENDED">🟡 ระงับสิทธิ</option>
                <option value="DISCHARGED">🔴 ปลดประจำการ</option>
              </select>
            </div>

            {/* Company / Unit Filter Pills */}
            {availableUnits.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className={`text-[11px] font-semibold mr-1 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  กองร้อย:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUnit('ALL')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                    selectedUnit === 'ALL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      : 'bg-[#181B22] hover:bg-[#202738] text-slate-300 border-[#262A36]'
                  }`}
                >
                  ทั้งหมด ({soldiers.length})
                </button>
                {availableUnits.map(unit => {
                  const count = soldiers.filter(s => s.unit === unit).length;
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setSelectedUnit(unit)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                        selectedUnit === unit
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          : 'bg-[#181B22] hover:bg-[#202738] text-slate-300 border-[#262A36]'
                      }`}
                    >
                      {unit} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Soldiers Table */}
          {!selectedBatchId ? (
            <div className="py-16 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-500 opacity-60" />
              <h4 className="text-sm font-bold">ยังไม่ได้เลือกผลัดทหาร</h4>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                กรุณาเลือกผลัดทหารจากตัวเลือกด้านบนเพื่อดูรายชื่อและจัดการสิทธิ
              </p>
            </div>
          ) : isLoadingSoldiers ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-500" />
              <p className="text-xs">กำลังโหลดข้อมูลทะเบียนทหาร...</p>
            </div>
          ) : filteredSoldiers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">ไม่พบข้อมูลทหารที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#262A36]">
              <table className="w-full text-left text-xs">
                <thead className={`text-[11px] uppercase tracking-wider border-b ${
                  isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#181B22] text-slate-400 border-[#262A36]'
                }`}>
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3 text-center">รูปถ่าย</th>
                    <th className="py-3 px-3">รหัส PX</th>
                    <th className="py-3 px-3">ชื่อ - สกุล</th>
                    <th className="py-3 px-3">สังกัด</th>
                    <th className="py-3 px-3 text-right">วงเงิน</th>
                    <th className="py-3 px-3 text-right">คงเหลือ</th>
                    <th className="py-3 px-3 text-right text-blue-500">ใช้ไป</th>
                    <th className="py-3 px-3 text-right text-rose-500">หักอื่น</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-500">เงินสด</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                    <th className="py-3 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
                  {filteredSoldiers.map((soldier, idx) => {
                    const limit = Number(soldier.credit_limit) || 0;
                    const remaining = Number(soldier.credit_allowance_balance !== undefined ? soldier.credit_allowance_balance : soldier.remaining_credit) || 0;
                    const used = Math.max(0, limit - remaining);
                    const deduct = Number(soldier.deductions) || 0;
                    const allowanceDeduct = Number(soldier.allowance_deductions_total) || 0;
                    const cashDeduct = Number(soldier.cash_deductions_total) || 0;
                    const otherDeduct = deduct + allowanceDeduct + cashDeduct;
                    const cash = Number(soldier.cash_wallet_balance || soldier.cash_balance) || 0;

                    return (
                      <tr key={soldier.soldier_id || soldier.px_code || idx} className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#181B22]/60'
                      }`}>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        
                        {/* Photo */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => soldier.photo_url && setPreviewSoldierPhoto(soldier)}
                              className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 dark:border-[#262A36] bg-slate-100 dark:bg-[#181B22] flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                            >
                              {soldier.photo_url ? (
                                <img
                                  src={normalizeDriveImageUrl(soldier.photo_url)}
                                  alt={soldier.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=PX';
                                  }}
                                />
                              ) : (
                                <Users className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* PX Code */}
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {soldier.px_code}
                        </td>

                        {/* Full Name */}
                        <td className="py-3 px-3 font-semibold">
                          {soldier.full_name}
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {soldier.unit || '-'}
                        </td>

                        {/* Credit Limit */}
                        <td className="py-3 px-3 text-right font-mono">
                          ฿{limit.toLocaleString()}
                        </td>

                        {/* Remaining */}
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          ฿{remaining.toLocaleString()}
                        </td>

                        {/* Used */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          ฿{used.toLocaleString()}
                        </td>

                        {/* Other Deductions */}
                        <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                          ฿{otherDeduct.toLocaleString()}
                        </td>

                        {/* Cash */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ฿{cash.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            soldier.status === 'ACTIVE' 
                              ? 'bg-emerald-500/15 text-emerald-500' 
                              : soldier.status === 'SUSPENDED'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}>
                            {soldier.status === 'ACTIVE' ? 'พร้อม' : soldier.status === 'SUSPENDED' ? 'ระงับ' : 'ปลด'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onOpenSalaryTopup && (
                              <button
                                type="button"
                                onClick={() => onOpenSalaryTopup(soldier)}
                                disabled={!batchGuard.allowed}
                                className={`p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-40 ${
                                  isLight ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                                }`}
                                title="เติมเงินให้รายบุคคล"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onOpenEditSoldier && (
                              <button
                                type="button"
                                onClick={() => onOpenEditSoldier(soldier)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                                }`}
                                title="แก้ไขข้อมูลทหาร"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                            )}

                            {onToggleSoldierStatus && (
                              <button
                                type="button"
                                onClick={() => onToggleSoldierStatus(soldier, soldier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  soldier.status === 'ACTIVE'
                                    ? isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                                    : isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                                }`}
                                title={soldier.status === 'ACTIVE' ? 'ระงับสิทธิ์' : 'เปิดใช้งาน'}
                              >
                                {soldier.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {onOpenDeleteSoldier && (
                              <button
                                type="button"
                                onClick={() => onOpenDeleteSoldier(soldier)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  isLight ? 'bg-white hover:bg-rose-50 border-slate-200 text-rose-600' : 'bg-[#181B22] hover:bg-rose-950/40 border-[#262A36] text-rose-400'
                                }`}
                                title="ลบข้อมูลทหาร"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. SUB-VIEW 4: ACCESS & OVERVIEW ANALYTICS (ภาพรวมสิทธิ์และสถิติ) */}
      {activeSubTab === 'access_overview' && (
        <div className="space-y-5">
          <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
            isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
          }`}>
            <AdminSectionHeader
              title="ภาพรวมสิทธิ์การเข้าถึง & การตรวจสอบความปลอดภัย (Security & Audit Overview)"
              description="สถิติการกระจายสิทธิ์ของผู้ใช้งานในระบบ ตรวจสอบบัญชีเสี่ยง และสถานะการเชื่อมต่อภายนอก"
              icon={Sparkles}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {/* Role Distribution Card */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141824] border-[#252C3D]'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-500" /> สัดส่วนผู้ใช้งานตามบทบาท (Roles)
                  </h4>
                  <span className="text-xs font-mono font-bold">{users.length} บัญชี</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* ADMIN */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-bold text-rose-500">ผู้ดูแลระบบ (ADMIN)</span>
                      <span className="font-mono">{totalAdmins} ({users.length ? Math.round((totalAdmins / users.length) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#1E2436] overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${users.length ? (totalAdmins / users.length) * 100 : 0}%` }} />
                    </div>
                  </div>

                  {/* STAFF */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-bold text-blue-500">เจ้าหน้าที่แคชเชียร์ (STAFF)</span>
                      <span className="font-mono">{totalStaff} ({users.length ? Math.round((totalStaff / users.length) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#1E2436] overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${users.length ? (totalStaff / users.length) * 100 : 0}%` }} />
                    </div>
                  </div>

                  {/* SELLER */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-bold text-emerald-500">ผู้ฝากขาย (SELLER)</span>
                      <span className="font-mono">{totalSellerUsers} ({users.length ? Math.round((totalSellerUsers / users.length) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#1E2436] overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${users.length ? (totalSellerUsers / users.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Audit Card */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141824] border-[#252C3D]'
              }`}>
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
                  <KeyRound className="w-4 h-4" /> ตรวจสอบความปลอดภัยรหัสผ่าน
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    defaultPinUsersCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <div>
                      <div className="font-bold">รหัส PIN เริ่มต้น (1234)</div>
                      <div className="text-[10px] opacity-80">ควรแจ้งให้เปลี่ยนรหัสเพื่อความปลอดภัย</div>
                    </div>
                    <span className="text-sm font-black font-mono">{defaultPinUsersCount} บัญชี</span>
                  </div>

                  <div className="p-2.5 rounded-xl border bg-slate-100/70 dark:bg-[#181B22] border-slate-200 dark:border-[#262A36] flex items-center justify-between">
                    <div>
                      <div className="font-bold">บัญชีที่ถูกระงับ (Inactive)</div>
                      <div className="text-[10px] text-slate-400">เข้าสู่ระบบไม่ได้ชั่วคราว</div>
                    </div>
                    <span className="text-sm font-black font-mono">{users.length - activeUsersCount} บัญชี</span>
                  </div>
                </div>
              </div>

              {/* Integrations Card */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141824] border-[#252C3D]'
              }`}>
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-indigo-500">
                  <Globe className="w-4 h-4" /> สถานะการเชื่อมต่อภายนอก
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-[#181B22]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <span>LINE Messaging & Token</span>
                    </div>
                    <span className="font-bold font-mono text-emerald-500">{lineConnectedCount} บัญชี</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-[#181B22]">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-500" />
                      <span>Google Account OAuth</span>
                    </div>
                    <span className="font-bold font-mono text-indigo-500">
                      {users.filter(u => !!u.google_id).length} บัญชี
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-[#181B22]">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-500" />
                      <span>ร้านค้าฝากขายที่ผูกล็อกอิน</span>
                    </div>
                    <span className="font-bold font-mono text-amber-500">
                      {totalSellerUsers} / {consignmentSellers.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODALS */}
      {/* 7.1 User Create / Edit Modal */}
      <UserFormModal
        isOpen={isUserFormOpen}
        onClose={() => {
          setIsUserFormOpen(false);
          setEditingUser(null);
        }}
        onSave={async (userData) => {
          if (editingUser?.user_id) {
            return await onUpdateUser(editingUser.user_id, userData);
          } else {
            return await onCreateUser(userData);
          }
        }}
        initialData={editingUser}
        sellers={sellers}
        driveFolders={driveFolders}
      />

      {/* 7.2 User Delete Modal */}
      <UserDeleteModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirmDelete={async (userId) => {
          return await onDeleteUser(userId);
        }}
        user={deletingUser}
      />

      {/* 7.3 Seller Create / Edit Modal */}
      <CreateSellerModal
        isOpen={isCreateSellerModalOpen}
        onClose={() => {
          setIsCreateSellerModalOpen(false);
          setEditingSeller(null);
        }}
        onSave={async (sellerData) => {
          if (editingSeller?.seller_id) {
            return onUpdateSeller ? await onUpdateSeller(editingSeller.seller_id, sellerData) : false;
          } else {
            return onCreateSeller ? await onCreateSeller(sellerData) : false;
          }
        }}
        initialData={editingSeller}
        existingSellers={sellers}
        driveFolders={driveFolders}
      />

      {/* 7.4 Seller Delete Safety Modal */}
      <DeleteSellerModal
        isOpen={!!deletingSeller}
        onClose={() => setDeletingSeller(null)}
        onConfirmDelete={async (sellerId, cascade) => {
          if (onDeleteSeller) {
            return await onDeleteSeller(sellerId, cascade);
          }
          return false;
        }}
        seller={deletingSeller}
        linkedProducts={products.filter(p => p.seller_id === deletingSeller?.seller_id)}
      />

      {/* 7.3 Soldier Photo Preview Modal */}
      {previewSoldierPhoto && previewSoldierPhoto.photo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setPreviewSoldierPhoto(null)}
        >
          <div
            className={`relative max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={normalizeDriveImageUrl(previewSoldierPhoto.photo_url)}
                alt={previewSoldierPhoto.full_name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPreviewSoldierPhoto(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 text-center space-y-1">
              <div className="font-bold text-sm">{previewSoldierPhoto.full_name}</div>
              <div className="text-xs text-slate-400 font-mono">
                {previewSoldierPhoto.px_code} {previewSoldierPhoto.unit ? `• ${previewSoldierPhoto.unit}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

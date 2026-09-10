import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import type { RoutePath, AdminTab } from './types/ui.ts';
import type { Soldier, ProductCatalog, Seller, User, UserRole, ProductUOMConversion, Promotion } from './types/schema.ts';
import { api, type DriveFolder } from './core/api.ts';
import { useTheme } from './hooks/useTheme.ts';
import { useToast } from './hooks/useToast.ts';
import { usePosStore } from './store/usePosStore.ts';
import { useAuthStore } from './store/useAuthStore.ts';

import { Header } from './components/layout/Header.tsx';
import { ToastContainer } from './components/common/ToastContainer.tsx';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal.tsx';
import { LoginView } from './features/auth/LoginView.tsx';
import { UsersView } from './features/users/UsersView.tsx';
import { AdminView } from './features/admin/AdminView.tsx';
import { PosView } from './features/pos/PosView.tsx';
import type { BatchItem } from './features/admin/components/BatchesTab.tsx';

export function App() {
  const { theme, toggleTheme, isLight } = useTheme();
  const { showToast } = useToast();
  const { isOnline, setIsOnline } = usePosStore();
  const { currentUser, isAuthenticated, logout } = useAuthStore();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Route & Navigation State
  const getInitialPath = (): RoutePath => {
    const path = window.location.pathname;
    if (path === '/') return '/admin';
    if (['/admin', '/users', '/pos'].includes(path)) {
      return path as RoutePath;
    }
    return '404';
  };

  const [currentPath, setCurrentPath] = useState<RoutePath>(getInitialPath);

  const navigateTo = (path: RoutePath) => {
    setCurrentPath(path);
    const targetUrl = path === '404' ? window.location.pathname : path;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Online / Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // Master Data State
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    return localStorage.getItem('px_selected_batch_id') || '';
  });
  const [availableBatches, setAvailableBatches] = useState<BatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  const [adminSoldiers, setAdminSoldiers] = useState<(Soldier & { remaining_credit?: number; cash_balance?: number; credit_balance?: number; soldier_id?: string })[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  const [adminTab, setAdminTab] = useState<AdminTab>('welfare');
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [isLoadingDriveFolders, setIsLoadingDriveFolders] = useState(false);

  const [liveProducts, setLiveProducts] = useState<ProductCatalog[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [liveUOMs, setLiveUOMs] = useState<ProductUOMConversion[]>([]);
  const [isLoadingUOMs, setIsLoadingUOMs] = useState(false);

  const [liveSellers, setLiveSellers] = useState<Seller[]>([]);
  
  const [livePromotions, setLivePromotions] = useState<Promotion[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);

  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Data Loading Callbacks
  const loadBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const res = await api.getBatches();
      const batches = res || [];
      setAvailableBatches(batches);
      
      setSelectedBatchId(prev => {
        if (batches.length === 0) return '';
        if (prev && batches.some(b => b.batch_id === prev)) return prev;
        const active = batches.find(b => b.is_active_batch) || batches[0];
        const newId = active ? active.batch_id : '';
        if (newId) {
          localStorage.setItem('px_selected_batch_id', newId);
        }
        return newId;
      });
    } catch (e: any) {
      console.error('Failed to load batches:', e);
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  const loadAdminData = useCallback(async (batchId?: string) => {
    const targetBatchId = batchId !== undefined ? batchId : selectedBatchId;
    if (!targetBatchId) {
      setAdminSoldiers([]);
      return;
    }
    setIsLoadingAdmin(true);
    try {
      const list = await api.getSoldiers(targetBatchId);
      setAdminSoldiers(list || []);
    } catch (e: any) {
      console.error('Failed to load soldiers:', e);
    } finally {
      setIsLoadingAdmin(false);
    }
  }, [selectedBatchId]);

  const loadDriveFolders = useCallback(async () => {
    setIsLoadingDriveFolders(true);
    try {
      const folders = await api.getDriveFolders();
      setDriveFolders(folders || []);
    } catch (e: any) {
      console.error('Failed to load drive folders:', e);
    } finally {
      setIsLoadingDriveFolders(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await api.getProducts();
      setLiveProducts(res || []);
    } catch (e: any) {
      console.error('Failed to load products:', e);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const loadUOMs = useCallback(async () => {
    setIsLoadingUOMs(true);
    try {
      const uoms = await api.getProductUOMs();
      setLiveUOMs(uoms || []);
    } catch (e: any) {
      console.error('Failed to load UOMs:', e);
    } finally {
      setIsLoadingUOMs(false);
    }
  }, []);

  const loadSellers = useCallback(async () => {
    try {
      const sellers = await api.getSellers();
      setLiveSellers(sellers || []);
    } catch (e: any) {
      console.error('Failed to load sellers:', e);
    }
  }, []);

  const loadPromotions = useCallback(async () => {
    setIsLoadingPromotions(true);
    try {
      const res = await api.getPromotions();
      if (res && res.success && Array.isArray(res.data)) {
        setLivePromotions(res.data);
      } else {
        setLivePromotions([]);
      }
    } catch (e: any) {
      console.error('Failed to load promotions:', e);
    } finally {
      setIsLoadingPromotions(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setLoadError(null);
    try {
      const list = await api.getUsers();
      setUsersList(list || []);
    } catch (e: any) {
      setLoadError(e.message || 'ไม่สามารถโหลดข้อมูล Users ได้');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Initial Boot Data Loading
  useEffect(() => {
    loadBatches();
    loadDriveFolders();
    loadProducts();
    loadUOMs();
    loadSellers();
    loadPromotions();
    loadUsers();
  }, [loadBatches, loadDriveFolders, loadProducts, loadUOMs, loadSellers, loadPromotions, loadUsers]);

  // Load Soldiers whenever selectedBatchId changes
  useEffect(() => {
    if (selectedBatchId) {
      localStorage.setItem('px_selected_batch_id', selectedBatchId);
      loadAdminData(selectedBatchId);
    } else {
      setAdminSoldiers([]);
    }
  }, [selectedBatchId, loadAdminData]);



  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await api.toggleUserActive(userId);
      if (res.success) {
        showToast({ type: 'success', title: 'อัปเดตสถานะสำเร็จ' });
        loadUsers();
      }
    } catch (e: any) {
      showToast({ type: 'error', title: 'อัปเดตไม่สำเร็จ', message: e.message });
    }
  };

  const handleCreateUser = async (userForm: {
    username: string;
    pin_hash: string;
    full_name: string;
    role: UserRole;
    seller_id?: string;
    avatar_url?: string;
  }) => {
    try {
      const newUser: User = {
        user_id: 'USR-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        is_active: true,
        ...userForm
      };
      const res = await api.createUser(newUser);
      if (res.success) {
        showToast({ type: 'success', title: 'สร้างผู้ใช้สำเร็จ!' });
        loadUsers();
        return true;
      }
      showToast({ type: 'error', title: 'สร้างผู้ใช้ไม่สำเร็จ', message: res.error });
      return false;
    } catch (e: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
      return false;
    }
  };

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/admin');
    }
  }, []);



  const handleConfirmLogout = () => {
    logout();
    navigateTo('/admin');
    showToast({ type: 'info', title: 'ออกจากระบบเรียบร้อยแล้ว' });
  };

  // 1. Auth Guard: If not authenticated, intercept and render LoginView
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950">
        <LoginView 
          onLoginSuccess={(user) => {
            showToast({ 
              type: 'success', 
              title: 'เข้าสู่ระบบสำเร็จ', 
              message: `ยินดีต้อนรับ ${user.full_name} (${user.role})` 
            });
            navigateTo('/admin');
          }} 
        />
        <ToastContainer />
      </div>
    );
  }

  // 2. Users Management Route (Admin Only)
  if (currentPath === '/users') {
    if (currentUser.role === 'SELLER') {
      navigateTo('/admin');
      return null;
    }

    return (
      <div className={`min-h-screen transition-colors ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0a0d14] text-slate-100'}`}>
        <UsersView 
          usersList={usersList}
          isLoadingUsers={isLoadingUsers}
          loadError={loadError}
          loadUsers={loadUsers}
          onNavigate={navigateTo}
          onSelectRole={(path) => {
            navigateTo(path);
          }}
          onToggleStatus={handleToggleUserStatus}
          onCreateUser={handleCreateUser}
        />
        <ToastContainer isLoading={isLoadingUsers} />
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleConfirmLogout}
          userName={currentUser.full_name}
          userRole={currentUser.role}
        />
      </div>
    );
  }

  // 3. POS Sell Screen Route
  if (currentPath === '/pos') {
    return (
      <div className={`min-h-screen transition-colors ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0a0d14] text-slate-100'}`}>
        <PosView
          soldiers={adminSoldiers}
          products={liveProducts}
          liveUOMs={liveUOMs}
          sellers={liveSellers}
          promotions={livePromotions}
          selectedBatchId={selectedBatchId}
          setSelectedBatchId={setSelectedBatchId}
          availableBatches={availableBatches}
          currentBatch={availableBatches.find(b => b.batch_id === selectedBatchId)}
          onNavigate={navigateTo}
          onRefreshData={() => {
            if (selectedBatchId) loadAdminData(selectedBatchId);
            loadProducts();
            loadUOMs();
            loadPromotions();
          }}
        />
        <ToastContainer isLoading={isLoadingAdmin || isLoadingProducts || isLoadingUOMs || isLoadingPromotions} />
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleConfirmLogout}
          userName={currentUser.full_name}
          userRole={currentUser.role}
        />
      </div>
    );
  }

  // 4. 404 Route
  if (currentPath === '404') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e131f] text-white p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black">404 - ไม่พบหน้าที่เรียก</h1>
          <p className="text-sm text-slate-400">เส้นทางที่คุณระบุไม่มีอยู่ในระบบ กรุณาตรวจสอบ URL หรือกลับไปยังหน้าหลัก</p>
          <button 
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            <Home className="w-4 h-4" />
            กลับสู่หน้าหลัก
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0a0d14] text-slate-100'
    }`}>
      {currentPath !== '/admin' && (
        <Header 
          currentPath={currentPath}
          onNavigate={navigateTo}
          onLogout={() => setIsLogoutModalOpen(true)}
          currentUser={currentUser ? { 
            name: currentUser.full_name, 
            role: currentUser.role,
            seller_id: currentUser.seller_id,
            avatar_url: currentUser.avatar_url
          } as any : null}
          isOnline={isOnline}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {currentPath === '/admin' && (
        <AdminView 
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          selectedBatchId={selectedBatchId}
          setSelectedBatchId={setSelectedBatchId}
          availableBatches={availableBatches}
          isLoadingBatches={isLoadingBatches}
          adminSoldiers={adminSoldiers}
          isLoadingAdmin={isLoadingAdmin}
          loadAdminData={loadAdminData}
          driveFolders={driveFolders}
          isLoadingDriveFolders={isLoadingDriveFolders}
          loadDriveFolders={loadDriveFolders}
          liveProducts={liveProducts}
          isLoadingProducts={isLoadingProducts}
          loadProducts={loadProducts}
          liveSellers={liveSellers}
          loadSellers={loadSellers}
          liveUOMs={liveUOMs}
          loadUOMs={loadUOMs}
          navigateTo={navigateTo}
          onLogout={() => setIsLogoutModalOpen(true)}
          currentUser={currentUser}
          isOnline={isOnline}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        userName={currentUser?.full_name}
        userRole={currentUser?.role}
      />

      {/* Global Notifications & Shimmer Bar */}
      <ToastContainer isLoading={isLoadingAdmin || isLoadingUsers || isLoadingBatches || isLoadingProducts || isLoadingUOMs || isLoadingPromotions} />
    </div>
  );
}
export default App;

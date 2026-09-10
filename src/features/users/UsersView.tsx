import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  Plus, 
  Check, 
  X, 
  Users, 
  UserPlus 
} from 'lucide-react';
import type { User, UserRole } from '../../types/schema.ts';
import type { RoutePath } from '../../types/ui.ts';
import { UserCard } from './components/UserCard.tsx';

interface UsersViewProps {
  usersList: User[];
  isLoadingUsers: boolean;
  loadError: string | null;
  loadUsers: () => void;
  onNavigate: (path: RoutePath) => void;
  onSelectRole: (path: RoutePath, userName: string) => void;
  onToggleStatus: (userId: string) => void;
  onCreateUser: (userForm: {
    username: string;
    pin_hash: string;
    full_name: string;
    role: UserRole;
    seller_id?: string;
    avatar_url?: string;
  }) => Promise<boolean>;
}

export function UsersView({
  usersList,
  isLoadingUsers,
  loadError,
  loadUsers,
  onNavigate,
  onSelectRole,
  onToggleStatus,
  onCreateUser
}: UsersViewProps) {
  const [userForm, setUserForm] = useState<{
    username: string;
    pin_hash: string;
    full_name: string;
    role: UserRole;
    seller_id: string;
    avatar_url: string;
  }>({
    username: '',
    pin_hash: '',
    full_name: '',
    role: 'STAFF',
    seller_id: '',
    avatar_url: ''
  });
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.pin_hash.trim() || !userForm.full_name.trim()) {
      setFormMsg({ type: 'error', text: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
      return;
    }

    setIsSubmitting(true);
    setFormMsg(null);
    try {
      const success = await onCreateUser(userForm);
      if (success) {
        setFormMsg({ type: 'success', text: `สร้างผู้ใช้ "${userForm.username}" สำเร็จเรียบร้อย` });
        setUserForm({
          username: '',
          pin_hash: '',
          full_name: '',
          role: 'STAFF',
          seller_id: '',
          avatar_url: ''
        });
      } else {
        setFormMsg({ type: 'error', text: 'ไม่สามารถสร้างผู้ใช้ได้ กรุณาลองใหม่' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-[#e6edf3] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/')}
              className="p-2 rounded-xl bg-[#141e30] border border-[#23324d] text-slate-400 hover:text-white transition-all cursor-pointer"
              title="กลับหน้าหลัก"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-cyan-400" />
                จัดการและสร้างผู้ใช้งานระบบ (User Creator Desk)
              </h1>
              <p className="text-xs text-slate-400">โหมดทดสอบ: สร้าง แก้ไข และเข้าใช้งานด้วยบัญชีต่างๆ ได้ทันที</p>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() => onNavigate('/')}
              className="px-4 py-2 bg-[#162032] border border-[#23324d] text-slate-300 rounded-xl text-xs font-semibold hover:bg-[#1f2d47] transition-all cursor-pointer"
            >
              หน้าหลัก
            </button>
          </div>
        </div>

        {/* Backend Connection & Google Sheets Sync Bar */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  สถานะการเชื่อมต่อ:
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 Live Google Sheets (เชื่อมต่อชีตจริง 100%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>ตาราง Master:</span>
                  <a 
                    href="https://docs.google.com/spreadsheets/d/1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4/edit" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                  >
                    1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadUsers}
                disabled={isLoadingUsers}
                className="px-3 py-1.5 bg-[#162032] hover:bg-[#202d45] border border-[#2b3a55] rounded-xl text-xs text-cyan-300 font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                {isLoadingUsers ? 'กำลังโหลดจากชีต...' : 'ดึงข้อมูลล่าสุดจากชีต'}
              </button>
            </div>
          </div>

          {loadError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Create User Form */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-xl h-fit">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              สร้างบัญชีผู้ใช้ใหม่
            </h2>

            {formMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                formMsg.type === 'success' 
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
              }`}>
                {formMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชื่อผู้ใช้ (Username) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น cashier03, ja_wit"
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full bg-[#162032] border border-[#2b3a55] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  รหัส PIN / Password (4 หลัก) *
                </label>
                <input
                  type="text"
                  placeholder="1234"
                  value={userForm.pin_hash}
                  onChange={e => setUserForm({ ...userForm, pin_hash: e.target.value })}
                  className="w-full bg-[#162032] border border-[#2b3a55] rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ยศ-ชื่อ-สกุล (Full Name) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น จ.อ. สมนึก สุขสำราญ"
                  value={userForm.full_name}
                  onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full bg-[#162032] border border-[#2b3a55] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  บทบาท (Role) *
                </label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full bg-[#162032] border border-[#2b3a55] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="STAFF">STAFF (แคชเชียร์ / จ่าเวร POS)</option>
                  <option value="ADMIN">ADMIN (ฝ่ายการเงิน / ผู้ดูแลระบบ)</option>
                  <option value="SELLER">SELLER (ร้านค้าฝากขาย)</option>
                </select>
              </div>

              {userForm.role === 'SELLER' && (
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    รหัสร้านค้าผู้ฝากขาย (Seller ID)
                  </label>
                  <input
                    type="text"
                    placeholder="S01, S02"
                    value={userForm.seller_id}
                    onChange={e => setUserForm({ ...userForm, seller_id: e.target.value })}
                    className="w-full bg-[#162032] border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  รูปโปรไฟล์ (Avatar URL - ตัวเลือก)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={userForm.avatar_url}
                  onChange={e => setUserForm({ ...userForm, avatar_url: e.target.value })}
                  className="w-full bg-[#162032] border border-[#2b3a55] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและสร้างผู้ใช้ใหม่'}
              </button>
            </form>
          </div>

          {/* Right: Existing Users Table */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e293b]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  รายชื่อผู้ใช้ทั้งหมดในระบบ ({usersList.length})
                </h2>
                <p className="text-xs text-slate-400">ตาราง Users (Global Master Schema)</p>
              </div>
              <button
                onClick={loadUsers}
                className="px-3 py-1.5 bg-[#162032] hover:bg-[#202d45] border border-[#2b3a55] rounded-lg text-xs text-slate-300 transition-all cursor-pointer"
              >
                รีเฟรช
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e293b] text-slate-400">
                    <th className="py-3 px-3">ผู้ใช้งาน</th>
                    <th className="py-3 px-3">Username</th>
                    <th className="py-3 px-3">PIN</th>
                    <th className="py-3 px-3">บทบาท</th>
                    <th className="py-3 px-3">สถานะ</th>
                    <th className="py-3 px-3 text-right">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {usersList.map(u => (
                    <UserCard
                      key={u.user_id}
                      user={u}
                      onToggleStatus={onToggleStatus}
                      onSelectRole={onSelectRole}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

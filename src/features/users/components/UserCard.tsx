import { LogIn, ShoppingCart } from 'lucide-react';
import type { User } from '../../../types/schema.ts';
import type { RoutePath } from '../../../types/ui.ts';

interface UserCardProps {
  user: User;
  onToggleStatus: (userId: string) => void;
  onSelectRole: (path: RoutePath, userName: string) => void;
}

export function UserCard({ user, onToggleStatus, onSelectRole }: UserCardProps) {
  return (
    <tr className="hover:bg-[#141e30] transition-colors">
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt=""
            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
          />
          <div>
            <div className="font-bold text-white">{user.full_name}</div>
            <div className="text-[10px] text-slate-400">{user.user_id} {user.seller_id ? `(Ref: ${user.seller_id})` : ''}</div>
          </div>
        </div>
      </td>

      <td className="py-3 px-3 font-mono text-cyan-300">
        {user.username}
      </td>

      <td className="py-3 px-3 font-mono text-amber-300 font-bold">
        {user.pin_hash}
      </td>

      <td className="py-3 px-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          user.role === 'ADMIN' 
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
            : user.role === 'STAFF'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }`}>
          {user.role}
        </span>
      </td>

      <td className="py-3 px-3">
        <button
          onClick={() => onToggleStatus(user.user_id)}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            user.is_active 
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
          }`}
        >
          {user.is_active ? 'ACTIVE' : 'INACTIVE'}
        </button>
      </td>

      <td className="py-3 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onSelectRole('/pos', user.full_name)}
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
            title="เข้าสู่หน้าขาย POS"
          >
            <ShoppingCart className="w-3 h-3" />
            POS
          </button>
          <button
            onClick={() => onSelectRole('/admin', user.full_name)}
            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
            title="เข้าสู่หน้าจัดการระบบ Admin"
          >
            <LogIn className="w-3 h-3" />
            Admin
          </button>
        </div>
      </td>
    </tr>
  );
}

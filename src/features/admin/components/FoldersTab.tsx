import React, { useState } from 'react';
import { 
  FolderOpen, Folder, RefreshCw, Link as LinkIcon, Plus, 
  ExternalLink, Trash2, Check, AlertTriangle, Copy 
} from 'lucide-react';
import type { DriveFolder } from '../../../core/api.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { AdminSectionHeader } from './ui/AdminSectionHeader.tsx';

interface FoldersTabProps {
  driveFolders: DriveFolder[];
  isLoading: boolean;
  onRefreshFolders: () => void;
  onOpenCreateFolder: () => void;
  onOpenLinkFolder: () => void;
  onSetDefaultFolder: (folderId: string) => void;
  onDeleteFolder: (folder: DriveFolder) => void;
}

export const FoldersTab: React.FC<FoldersTabProps> = ({
  driveFolders,
  isLoading,
  onRefreshFolders,
  onOpenCreateFolder,
  onOpenLinkFolder,
  onSetDefaultFolder,
  onDeleteFolder
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    showToast({ type: 'success', title: 'คัดลอกเรียบร้อย', message: text });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-[#0F1115] border-[#21262d]'
      }`}>
        <AdminSectionHeader
          title="จัดการโฟลเดอร์ Google Drive"
          description="ผูกโฟลเดอร์สำหรับจัดเก็บไฟล์ Google Sheets ประจำผลัดและใบเสร็จ"
          icon={FolderOpen}
          badge={`${driveFolders.length} โฟลเดอร์`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onRefreshFolders}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px] select-none active:scale-[0.98] ${
                  isLight 
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                    : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                }`}
                title="โหลดข้อมูลโฟลเดอร์ใหม่"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
              </button>

              <button
                onClick={onOpenLinkFolder}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.98] min-h-[40px] ${
                  isLight 
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                    : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-slate-300'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> ผูกโฟลเดอร์เดิม
              </button>

              <button
                onClick={onOpenCreateFolder}
                className="px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 select-none active:scale-[0.98] min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" /> + สร้างโฟลเดอร์ใน Drive
              </button>
            </div>
          }
        />

        {/* Folders Table */}
        <div className="overflow-x-auto mt-5 rounded-xl border border-slate-200 dark:border-[#262A36]">
          <table className="w-full text-left text-xs">
            <thead className={`text-[11px] uppercase tracking-wider border-b ${
              isLight ? 'bg-slate-50 text-slate-600 border-slate-200 font-bold' : 'bg-[#181B22] text-slate-400 border-[#262A36]'
            }`}>
              <tr>
                <th className="py-3 px-3.5">ชื่อโฟลเดอร์ (Folder Name)</th>
                <th className="py-3 px-3.5">Folder ID</th>
                <th className="py-3 px-3.5">โฟลเดอร์แม่</th>
                <th className="py-3 px-3.5 text-center">สถานะการผูก</th>
                <th className="py-3 px-3.5 text-center">สถานะ Google Drive</th>
                <th className="py-3 px-3.5">วันที่สร้าง / ผูก</th>
                <th className="py-3 px-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
              {driveFolders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span>กำลังตรวจสอบการเชื่อมต่อและดึงข้อมูลจาก Google Drive...</span>
                      </div>
                    ) : (
                      <div>
                        <Folder className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p>ยังไม่มีโฟลเดอร์ที่บันทึกไว้ในระบบ กดปุ่ม <strong>&quot;+ สร้างโฟลเดอร์ใน Drive&quot;</strong> หรือ <strong>&quot;ผูกโฟลเดอร์เดิม&quot;</strong> เพื่อเริ่มต้น</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                driveFolders.map((f, idx) => {
                  const parentFolder = f.parent_folder_id ? driveFolders.find(p => p.folder_id === f.parent_folder_id) : null;
                  const isLinked = f.is_linked ?? f.is_default ?? true;
                  const driveStatus = f.drive_status || 'ONLINE';
                  const isProblem = driveStatus === 'DELETED' || driveStatus === 'TRASHED';
                  return (
                    <tr key={`folder_row_${f.folder_id}_${idx}`} className={`transition-colors ${
                      isProblem
                        ? isLight ? 'bg-rose-50/60 font-medium' : 'bg-rose-950/20 font-medium'
                        : isLinked
                          ? isLight ? 'hover:bg-slate-50/80 font-medium' : 'hover:bg-[#181B22]/60 font-medium'
                          : isLight ? 'hover:bg-slate-50 text-slate-400' : 'hover:bg-[#181B22]/50 text-slate-400'
                    }`}>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          {isProblem ? (
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
                          ) : (
                            <Folder className={`w-4 h-4 shrink-0 ${isLinked ? 'text-blue-500' : 'text-slate-400'}`} />
                          )}
                          <span className={`font-semibold ${isProblem ? 'text-rose-600 dark:text-rose-400' : isLinked ? isLight ? 'text-slate-900' : 'text-white' : 'text-slate-400'}`}>
                            {f.folder_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-blue-500">
                        <div className="flex items-center gap-1.5">
                          <code className="text-slate-500 select-all">{f.folder_id.slice(0, 14)}...</code>
                          <button
                            onClick={() => copyToClipboard(f.folder_id, `folder_${f.folder_id}`)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-[#283550] rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="คัดลอก Folder ID"
                          >
                            {copiedField === `folder_${f.folder_id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                        {parentFolder ? `📁 ${parentFolder.folder_name}` : f.parent_folder_id ? `ID: ${f.parent_folder_id.slice(0, 8)}...` : 'โฟลเดอร์หลัก PX'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          f.is_default 
                            ? isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-950 text-blue-400 border border-blue-800'
                            : isLinked 
                              ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : isLight ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {f.is_default ? 'DEFAULT ★' : isLinked ? 'LINKED' : 'UNLINKED'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          driveStatus === 'ONLINE'
                            ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : driveStatus === 'TRASHED'
                              ? isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                              : isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}>
                          {driveStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 text-[11px] font-mono">
                        {f.created_at ? f.created_at.split('T')[0] : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!f.is_default && (
                            <button
                              onClick={() => onSetDefaultFolder(f.folder_id)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[32px] select-none active:scale-[0.95] ${
                                isLight ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              ตั้งเป็น Default
                            </button>
                          )}
                          {f.folder_url && (
                            <a
                              href={f.folder_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all min-h-[32px] min-w-[32px] select-none active:scale-[0.95] ${
                                isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#181B22] hover:bg-[#232732] border-[#262A36] text-blue-400'
                              }`}
                              title="เปิดดูโฟลเดอร์บน Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => onDeleteFolder(f)}
                            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center select-none active:scale-[0.95] ${
                              isLight ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                            }`}
                            title="ยกเลิกการผูกโฟลเดอร์นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

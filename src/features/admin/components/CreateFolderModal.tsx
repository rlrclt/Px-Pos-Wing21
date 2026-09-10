import React, { useState } from 'react';
import { X, FolderPlus, RefreshCw, AlertTriangle } from 'lucide-react';
import { api, type DriveFolder } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveFolders: DriveFolder[];
  onFolderCreated: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  driveFolders,
  onFolderCreated
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [folderName, setFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setErrorMsg('กรุณาระบุชื่อโฟลเดอร์');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const toastId = showToast({
      type: 'loading',
      title: 'กำลังสร้างโฟลเดอร์ใน Google Drive...',
      message: `สร้าง "${folderName}" ใน Google Drive`
    }, 0);

    try {
      const res = await api.createDriveFolder({
        folder_name: folderName.trim(),
        parent_folder_id: parentFolderId || undefined
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'สร้างโฟลเดอร์สำเร็จ!',
          message: `สร้างโฟลเดอร์ "${folderName}" ใน Google Drive เรียบร้อย`
        });
        setFolderName('');
        onFolderCreated();
        onClose();
      } else {
        setErrorMsg(res.error || 'สร้างโฟลเดอร์ไม่สำเร็จ');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        <div className={`flex items-center justify-between p-5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
            }`}>
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                สร้างโฟลเดอร์ย่อยใน Google Drive
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ระบบจะเรียก Google Drive API เพื่อสร้างโฟลเดอร์จริง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              ชื่อโฟลเดอร์ (Folder Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ปี 2569, ผลัด 1-69"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                  : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
              }`}
            />
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              โฟลเดอร์แม่ (Parent Folder)
            </label>
            <select
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                  : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
              }`}
            >
              <option value="">📁 โฟลเดอร์ Root เริ่มต้น (PX Root)</option>
              {driveFolders.map((f, idx) => (
                <option key={`create_parent_${f.folder_id}_${idx}`} value={f.folder_id}>
                  📁 {f.folder_name}
                </option>
              ))}
            </select>
          </div>

          <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
            isLight ? 'border-slate-200' : 'border-[#21262d]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
              }`}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                isLight 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  สร้างโฟลเดอร์
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

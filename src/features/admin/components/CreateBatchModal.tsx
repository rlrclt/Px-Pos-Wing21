import React, { useState } from 'react';
import { 
  X, FolderPlus, CheckCircle2, Layers, Folder, FolderOpen, 
  ExternalLink, FileSpreadsheet, Check, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { api, type DriveFolder } from '../../../core/api.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveFolders: DriveFolder[];
  onBatchCreated: (batchId: string) => void;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  isOpen,
  onClose,
  driveFolders,
  onBatchCreated
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [createBatchError, setCreateBatchError] = useState<string | null>(null);
  const [createBatchSuccess, setCreateBatchSuccess] = useState<{
    batch_id: string;
    batch_name: string;
    spreadsheet_id?: string;
    sheet_url?: string;
    folder_id?: string;
    folder_name?: string;
    folder_url?: string;
  } | null>(null);

  const [newBatchForm, setNewBatchForm] = useState({
    batch_id: '',
    batch_name: '',
    default_credit_limit: 1000,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    target_folder_id: driveFolders.find(f => f.is_default)?.folder_id || driveFolders[0]?.folder_id || ''
  });

  if (!isOpen) return null;

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchForm.batch_id.trim()) {
      setCreateBatchError('กรุณาระบุรหัสผลัด');
      return;
    }
    if (newBatchForm.end_date && newBatchForm.start_date && newBatchForm.end_date < newBatchForm.start_date) {
      setCreateBatchError('วันที่สิ้นสุดผลัดต้องไม่เกิดขึ้นก่อนวันที่เริ่มต้นผลัด');
      return;
    }

    setIsCreatingBatch(true);
    setCreateBatchError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'กำลังสร้างชีตผลัดและจัดโครงสร้าง...',
      message: `กำลังสร้าง Google Sheet "${newBatchForm.batch_name || newBatchForm.batch_id}" พร้อม 8 ตารางมาตรฐาน`
    }, 0);

    try {
      const res = await api.createBatchSheet({
        batch_id: newBatchForm.batch_id.trim(),
        batch_name: newBatchForm.batch_name.trim() || `ผลัด ${newBatchForm.batch_id}`,
        default_credit_limit: newBatchForm.default_credit_limit,
        start_date: newBatchForm.start_date,
        end_date: newBatchForm.end_date,
        target_folder_id: newBatchForm.target_folder_id
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'สร้าง Google Sheet ผลัดใหม่สำเร็จ!',
          message: `สร้างและผูกชีตประจำผลัด ${newBatchForm.batch_id} เรียบร้อย`
        });
        setCreateBatchSuccess({
          batch_id: newBatchForm.batch_id.trim(),
          batch_name: newBatchForm.batch_name.trim() || `ผลัด ${newBatchForm.batch_id}`,
          spreadsheet_id: res.spreadsheet_id,
          sheet_url: res.sheet_url,
          folder_id: res.folder_id,
          folder_name: res.folder_name,
          folder_url: res.folder_url
        });
      } else {
        setCreateBatchError(res.error || 'ไม่สามารถสร้างชีตได้');
        showToast({
          type: 'error',
          title: 'สร้างชีตล้มเหลว',
          message: res.error || 'เกิดข้อผิดพลาดในการสร้าง Google Sheet'
        });
      }
    } catch (err: any) {
      setCreateBatchError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถติดต่อ Google Apps Script ได้'
      });
    } finally {
      dismissToast(toastId);
      setIsCreatingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
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
                สร้าง Google Sheet ผลัดใหม่อัตโนมัติ
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ระบบจะสร้างไฟล์ชีตใน Google Drive, สร้าง 8 ตารางมาตรฐาน และผูกระบบให้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isCreatingBatch) {
                onClose();
                setCreateBatchSuccess(null);
                setCreateBatchError(null);
              }
            }}
            disabled={isCreatingBatch}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createBatchSuccess ? (
          <div className="p-6 space-y-4">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">🟢 สร้างผลัดและชีตสำเร็จ!</div>
                <p className="text-xs mt-1">
                  Google Sheet ประจำผลัด <strong>{createBatchSuccess.batch_name}</strong> ({createBatchSuccess.batch_id}) ถูกสร้างและลงทะเบียนเข้าตาราง <code>Batch_Config</code> เรียบร้อยแล้ว
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
            }`}>
              <div className="font-semibold text-slate-400 text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                8 ตารางมาตรฐานที่สร้างให้อัตโนมัติ:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Soldiers', 'Orders', 'Splits', 'Items', 'Credit_Logs', 'Shifts', 'Payroll', 'Void'].map(table => (
                  <span key={table} className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                    isLight 
                      ? 'bg-blue-50 border-blue-200 text-blue-800' 
                      : 'bg-indigo-950/60 border-indigo-500/30 text-indigo-300'
                  }`}>
                    ✓ {table}
                  </span>
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-3 text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
            }`}>
              <div className="space-y-1.5 pb-2.5 border-b border-slate-200 dark:border-[#21262d]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    📍 ตำแหน่งจัดเก็บใน Google Drive:
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {createBatchSuccess.folder_name || 'โฟลเดอร์หลัก PX Root'}
                  </span>
                </div>
                {createBatchSuccess.folder_url && (
                  <a
                    href={createBatchSuccess.folder_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      isLight 
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800' 
                        : 'bg-[#1c2438] hover:bg-[#283550] border-[#2b3a55] text-amber-300'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    📁 เปิดดูโฟลเดอร์ใน Google Drive
                    <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
                  </a>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    📊 Google Sheet ประจำผลัด:
                  </span>
                  <code className="font-mono text-[10px] text-cyan-400">
                    {createBatchSuccess.spreadsheet_id ? `${createBatchSuccess.spreadsheet_id.slice(0, 14)}...` : '-'}
                  </code>
                </div>
                {createBatchSuccess.sheet_url && (
                  <a
                    href={createBatchSuccess.sheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      isLight 
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800' 
                        : 'bg-[#1c2438] hover:bg-[#283550] border-[#2b3a55] text-emerald-300'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    📑 เปิดดู Google Sheet ผลัด
                    <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  setCreateBatchSuccess(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] border-[#2b3a55] text-slate-300'
                }`}
              >
                ปิดหน้าต่าง
              </button>

              <button
                onClick={() => {
                  onBatchCreated(createBatchSuccess.batch_id);
                  onClose();
                  setCreateBatchSuccess(null);
                }}
                className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                <Check className="w-4 h-4" />
                สลับไปจัดการผลัดนี้ทันที
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateBatch} className="p-6 space-y-4 text-xs">
            {createBatchError && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{createBatchError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  รหัสผลัด (Batch ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 2569_2"
                  value={newBatchForm.batch_id}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                    setNewBatchForm({ 
                      ...newBatchForm, 
                      batch_id: val,
                      batch_name: newBatchForm.batch_name || (val ? `ผลัด ${val}` : '')
                    });
                  }}
                  disabled={isCreatingBatch}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">ใช้เป็นคีย์อ้างอิงตาราง เช่น 2569_2</span>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ชื่อผลัด (Batch Name)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ผลัด 2/69 (กองพัน 1)"
                  value={newBatchForm.batch_name}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, batch_name: e.target.value })}
                  disabled={isCreatingBatch}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">ชื่อที่แสดงในเมนูเลือกผลัด</span>
              </div>
            </div>

            {/* Google Drive Folder Selector */}
            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                📁 จัดเก็บในโฟลเดอร์ Google Drive
              </label>
              <select
                value={newBatchForm.target_folder_id}
                onChange={(e) => setNewBatchForm({ ...newBatchForm, target_folder_id: e.target.value })}
                disabled={isCreatingBatch}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                    : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                }`}
              >
                {driveFolders.length === 0 ? (
                  <option value="">📁 โฟลเดอร์ Root เริ่มต้น (PX Database Root)</option>
                ) : (
                  driveFolders.map((f, idx) => (
                    <option key={`batch_target_${f.folder_id}_${idx}`} value={f.folder_id}>
                      📁 {f.folder_name} {f.is_default ? '(Default)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  วงเงินสวัสดิการเริ่มต้น (฿)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={newBatchForm.default_credit_limit}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, default_credit_limit: Number(e.target.value) || 0 })}
                  disabled={isCreatingBatch}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-semibold focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  วันที่เริ่มต้นผลัด <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newBatchForm.start_date}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, start_date: e.target.value })}
                  disabled={isCreatingBatch}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  วันที่สิ้นสุดผลัด <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newBatchForm.end_date}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, end_date: e.target.value })}
                  disabled={isCreatingBatch}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
              isLight ? 'border-slate-200' : 'border-[#21262d]'
            }`}>
              <button
                type="button"
                onClick={onClose}
                disabled={isCreatingBatch}
                className={`px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
                }`}
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isCreatingBatch}
                className={`px-5 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isCreatingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังสร้างชีตและ 8 ตาราง...
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    สร้าง Google Sheet ผลัดใหม่
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

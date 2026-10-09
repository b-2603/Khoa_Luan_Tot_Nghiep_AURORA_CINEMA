import React, { useState } from 'react';
import { X, Key, CheckCircle, Info } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../services/openai';

interface OpenAiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenAiKeyModal: React.FC<OpenAiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Key className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Cấu hình OpenAI API Key</h3>
            <p className="text-xs text-slate-400">Dành cho tính năng Soạn Đề Khảo Thí & Phân Ca Tự Động</p>
          </div>
        </div>


        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              OpenAI API Key (sk-...)
            </label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Đã Lưu thành công!</span>
                </>
              ) : (
                <span>Lưu Cấu Hình API</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

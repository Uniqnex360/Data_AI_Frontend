import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { BusinessRule } from '../../types/database.types';

interface DeleteProps {
  rule: BusinessRule;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteConfirmModal({ rule, onClose, onConfirm }: DeleteProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Delete Rule?</h3>
        </div>
        
        <p className="text-slate-600 mb-6">
          Are you sure you want to delete <span className="font-semibold text-slate-900">"{rule.title}"</span>? 
          This action cannot be undone and may affect active automated tasks.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
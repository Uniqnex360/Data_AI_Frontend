// src/components/BusinessModal/StatusConfirmModal.tsx

import { useState } from "react";
import { Loader2, AlertTriangle, Power, PowerOff } from "lucide-react";
import type { BusinessRule, RulePrompt, RuleStatus } from "../../types/business-rules.types";
import BaseModal from "./BaseModal";

interface Props {
  target: { type: 'rule' | 'prompt'; item: BusinessRule | RulePrompt };
  newStatus: RuleStatus;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function StatusConfirmModal({ target, newStatus, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

  const isRule = target.type === 'rule';
  const itemName = isRule ? (target.item as BusinessRule).title : (target.item as RulePrompt).prompt_name;
  
  const isDeactivating = newStatus === 'inactive';
  const actionText = isDeactivating ? 'Deactivate' : 'Activate';
  const ActionIcon = isDeactivating ? PowerOff : Power;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    // setLoading(false); // No need, as the modal closes on success
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title={`${actionText} ${isRule ? 'Rule' : 'Prompt'}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${isDeactivating ? 'bg-amber-100' : 'bg-green-100'} sm:mx-0 sm:h-10 sm:w-10`}>
            <ActionIcon className={`h-6 w-6 ${isDeactivating ? 'text-amber-600' : 'text-green-600'}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-slate-600">
              Are you sure you want to {actionText.toLowerCase()} the {target.type}: <strong className="font-semibold text-slate-900">"{itemName}"</strong>?
            </p>
            {isRule && isDeactivating && (
              <p className="mt-2 text-sm text-amber-700 font-medium">
                This will also deactivate all associated prompts.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-md disabled:opacity-50 ${isDeactivating ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm {actionText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
import { toast } from "sonner";

export const notify = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 3000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },

  confirm: ({
    message,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    duration = 6000,
  }: {
    message: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    duration?: number;
  }) => {
    toast(message, {
      description,
      duration,
      action: {
        label: confirmLabel,
        onClick: onConfirm,
      },
      cancel: {
        label: cancelLabel,
        onClick: () => onCancel?.(),
      },
    });
  },

  promise: async (
    promise: Promise<any>,
    {
      loading = "Processing data...",
      success = "Operation successful",
      error = "An error occured",
    }: {
      loading?: string;
      success?: string;
      error?: string;
    },
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },
};
import { extractionService } from '../src/services/extractionService';
import { notify } from '../src/lib/notifications';

export const pollBatchStatus = (
  batchId: string,
  onComplete?: () => Promise<void>,
  onFailed?: () => Promise<void>
) => {
  const interval = setInterval(async () => {
    try {
      const status = await extractionService.getBatchStatus(batchId);
      
      if (status.status === "completed") {
        clearInterval(interval);
        notify.success(
          "Extraction Complete",
          "Products have been added successfully."
        );
        if (onComplete) await onComplete();
      } else if (status.status === "failed") {
        clearInterval(interval);
        notify.error("Extraction Failed", status.source_metadata?.error || "Unknown error");
        if (onFailed) await onFailed();
      }
    } catch (error) {
      console.error("Polling error:", error);
      clearInterval(interval);
      notify.error("Status Check Failed", "Could not check extraction status");
    }
  }, 3000);
  
  // Return cleanup function
  return () => clearInterval(interval);
};
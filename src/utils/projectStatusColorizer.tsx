import { CheckCircle2, Clock, Loader2, AlertCircle, XCircle } from 'lucide-react';

export const getStatusBadge = (status: string, iconOnly?: boolean) => {
  const displayStatus = status?.trim() || "Yet to Start";
  
  switch (status?.trim()) {  
    case "Completed":
    case "completed":
      return (
        <span 
          title="Completed"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
        >
          <CheckCircle2 className="w-3 h-3" /> {!iconOnly && "Completed"}
        </span>
      );

    case "In Progress":
    case "processing":
      return (
        <span 
          title="In Progress"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
        >
          <Loader2 className="w-3 h-3 animate-spin" /> {!iconOnly && "In Progress"}
        </span>
      );

    case "failed":
    case "Failed":
      return (
        <span 
          title="Failed"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
        >
          <XCircle className="w-3 h-3" /> {!iconOnly && "Failed"}
        </span>
      );

    case "Partially Completed": 
    case "partially_completed":
      return (
        <span 
          title="Partially Completed"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
        >
          <AlertCircle className="w-3 h-3" /> {!iconOnly && "Partially Completed"}
        </span>
      );

    case "Yet to Start":
    case "pending":
    case "idle":
    case "":
    case undefined:
    case null:
      return (
        <span 
          title="Yet to Start"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
        >
          <Clock className="w-3 h-3" /> {!iconOnly && "Yet to Start"}
        </span>
      );

    default:
      return (
        <span 
          title={displayStatus}
          className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
        >
          {displayStatus}
        </span>
      );
  }
};
export const getProductStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          Completed
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Pending
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          Failed
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </span>
      );
    default:
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};
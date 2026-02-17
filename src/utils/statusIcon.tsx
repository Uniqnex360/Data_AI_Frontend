import { CheckCircle, XCircle, Clock } from 'lucide-react';
 export const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="w-5 h-5 text-green-600" />;
        case 'failed':
          return <XCircle className="w-5 h-5 text-red-600" />;
        case 'processing':
          return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
        default:
          return <Clock className="w-5 h-5 text-slate-400" />;
      }
    };
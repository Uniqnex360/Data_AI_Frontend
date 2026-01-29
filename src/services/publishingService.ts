// import { supabase } from '../lib/supabase';
// import type { PublishTarget, PublishHistory } from '../types/database.types';

// export class PublishingService {
//   async getTargets(projectId: string): Promise<PublishTarget[]> {
//     const { data, error } = await supabase
//       .from('publish_targets')
//       .select('*')
//       .eq('project_id', projectId)
//       .order('created_at', { ascending: false});

//     if (error) throw error;
//     return data || [];
//   }

//   async createTarget(target: Omit<PublishTarget, 'id' | 'created_at' | 'last_publish_at'>): Promise<PublishTarget> {
//     const { data, error } = await supabase
//       .from('publish_targets')
//       .insert(target)
//       .select()
//       .maybeSingle();

//     if (error) throw error;
//     return data!;
//   }

//   async publishToTarget(targetId: string, productIds: string[]): Promise<PublishHistory> {
//     const { data: target } = await supabase
//       .from('publish_targets')
//       .select('*')
//       .eq('id', targetId)
//       .maybeSingle();

//     if (!target) throw new Error('Target not found');

//     const { data: history, error } = await supabase
//       .from('publish_history')
//       .insert({
//         target_id: targetId,
//         product_count: productIds.length,
//         status: 'success',
//         errors: []
//       })
//       .select()
//       .maybeSingle();

//     if (error) throw error;
//     return history!;
//   }

//   async exportToCSV(projectId: string): Promise<string> {
//     return 'SKU,Brand,Name\n';
//   }
// }

// export const publishingService = new PublishingService();
import api, { BASE_URL } from '../lib/api';

export const publishingService = {
  
  async exportCatalog(): Promise<string> {
    const { data } = await api.post<{ excel_file: string }>('/batch-aggregate/');
    return data.excel_file.startsWith('http') 
      ? data.excel_file 
      : `${BASE_URL}${data.excel_file}`;
  },

  downloadFile(url: string) {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'golden_records_export.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
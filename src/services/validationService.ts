// import { supabase } from '../lib/supabase';
// import type { ValidationQueue } from '../types/database.types';

import api from "../lib/api.ts";

// export class ValidationService {
//   async getQueueItems(projectId: string, status?: string): Promise<ValidationQueue[]> {
//     let query = supabase
//       .from('validation_queue')
//       .select('*')
//       .eq('project_id', projectId);

//     if (status) {
//       query = query.eq('status', status);
//     }

//     const { data, error } = await query.order('created_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }

//   async updateStatus(queueId: string, status: 'approved' | 'rejected' | 'flagged' | 'in_review', notes?: string) {
//     const updates: any = {
//       status,
//       reviewed_at: new Date().toISOString()
//     };

//     if (notes) {
//       updates.notes = notes;
//     }

//     const { error } = await supabase
//       .from('validation_queue')
//       .update(updates)
//       .eq('id', queueId);

//     if (error) throw error;
//   }

//   async bulkApprove(queueIds: string[]) {
//     const { error } = await supabase
//       .from('validation_queue')
//       .update({
//         status: 'approved',
//         reviewed_at: new Date().toISOString()
//       })
//       .in('id', queueIds);

//     if (error) throw error;
//   }

//   async getQueueStats(projectId: string) {
//     const { data, error } = await supabase
//       .from('validation_queue')
//       .select('status')
//       .eq('project_id', projectId);

//     if (error) throw error;

//     const items = data || [];

//     return {
//       total: items.length,
//       pending: items.filter(i => i.status === 'pending').length,
//       in_review: items.filter(i => i.status === 'in_review').length,
//       approved: items.filter(i => i.status === 'approved').length,
//       rejected: items.filter(i => i.status === 'rejected').length,
//       flagged: items.filter(i => i.status === 'flagged').length
//     };
//   }
// }

// export const validationService = new ValidationService();
import type { ValidationQueue } from '../types/database.types';

export const validationService = {
  async getQueueItems(projectId: string, status?: string): Promise<ValidationQueue[]> {
    try {
      const { data } = await api.get('/hitl/pending', {
        params: { project_id: projectId, status }
      });
      return data || [];
    } catch (error) {
      console.log(`Failed to get queue items, ${projectId}`);
      throw new Error("Failed to get queue items!");
    }
  },

  async updateStatus(queueId: string, status: string, notes?: string): Promise<void> {
    try {
      const action = status === 'approved' ? 'approve' : "reject";
      await api.post(`/hitl/${action}`, null, {
        params: { queue_id: queueId, notes }
      });
    } catch (error) {
      console.log(`Failed to update status of ${queueId}`, error);
      throw new Error("Failed to update status of queue");
    }
  },

  async getQueueStats(projectId: string) {
    try {
      const { data } = await api.get(`/hitl/stats/${projectId}`);
      return data;
    } catch (error) {
      console.error(`Failed to get the queue status of ${projectId}`, error);
      throw new Error("Failed to get the queue status!");
    }
  }
};
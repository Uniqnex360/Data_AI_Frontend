// import { supabase } from '../lib/supabase';
// import type { SourcePriority } from '../types/database.types';

import api from "../lib/api.ts";

// export class SourcePriorityService {
//   async getProjectPriorities(projectId: string): Promise<SourcePriority[]> {
//     const { data, error } = await supabase
//       .from('source_priority')
//       .select('*, sources(*)')
//       .eq('project_id', projectId)
//       .order('priority_rank', { ascending: true });

//     if (error) throw error;
//     return data || [];
//   }

//   async updatePriority(priorityId: string, updates: Partial<SourcePriority>): Promise<void> {
//     const { error } = await supabase
//       .from('source_priority')
//       .update(updates)
//       .eq('id', priorityId);

//     if (error) throw error;
//   }

//   async updatePriorityRanks(projectId: string, rankings: Array<{ sourceId: string; rank: number }>): Promise<void> {
//     for (const ranking of rankings) {
//       const { data: existing } = await supabase
//         .from('source_priority')
//         .select('id')
//         .eq('project_id', projectId)
//         .eq('source_id', ranking.sourceId)
//         .maybeSingle();

//       if (existing) {
//         await supabase
//           .from('source_priority')
//           .update({ priority_rank: ranking.rank })
//           .eq('id', existing.id);
//       } else {
//         await supabase
//           .from('source_priority')
//           .insert({
//             project_id: projectId,
//             source_id: ranking.sourceId,
//             priority_rank: ranking.rank,
//             reliability_score: 0.5,
//             freshness_weight: 0.5,
//             auto_select_enabled: true
//           });
//       }
//     }
//   }

//   async setAttributePriority(
//     priorityId: string,
//     attributeName: string,
//     priority: number
//   ): Promise<void> {
//     const { data: current } = await supabase
//       .from('source_priority')
//       .select('attribute_priorities')
//       .eq('id', priorityId)
//       .maybeSingle();

//     if (!current) throw new Error('Priority record not found');

//     const attributePriorities = current.attribute_priorities as Record<string, number>;
//     attributePriorities[attributeName] = priority;

//     await supabase
//       .from('source_priority')
//       .update({ attribute_priorities: attributePriorities })
//       .eq('id', priorityId);
//   }

//   async updateReliabilityScore(sourceId: string, projectId: string, score: number): Promise<void> {
//     const { data: existing } = await supabase
//       .from('source_priority')
//       .select('id')
//       .eq('project_id', projectId)
//       .eq('source_id', sourceId)
//       .maybeSingle();

//     if (existing) {
//       await supabase
//         .from('source_priority')
//         .update({ reliability_score: score })
//         .eq('id', existing.id);
//     }
//   }

//   async calculateSourceMetrics(sourceId: string) {
//     const { data: extractions } = await supabase
//       .from('raw_extractions')
//       .select('confidence, raw_attributes')
//       .eq('source_id', sourceId);

//     if (!extractions || extractions.length === 0) {
//       return {
//         avgConfidence: 0,
//         completeness: 0,
//         totalAttributes: 0
//       };
//     }

//     const avgConfidence = extractions.reduce((sum, e) => sum + e.confidence, 0) / extractions.length;

//     const allAttributes = new Set<string>();
//     extractions.forEach(e => {
//       if (e.raw_attributes && typeof e.raw_attributes === 'object') {
//         Object.keys(e.raw_attributes).forEach(key => allAttributes.add(key));
//       }
//     });

//     const completeness = allAttributes.size > 0 ? (allAttributes.size / 20) : 0;

//     return {
//       avgConfidence,
//       completeness: Math.min(completeness, 1),
//       totalAttributes: allAttributes.size
//     };
//   }
// }

// export const sourcePriorityService = new SourcePriorityService();

export const sourcePriorityService={
  async getProjectPriorities(projectId:string):Promise<SourcePriorityTab[]>
  {
    try {
      const {data}=await api.get(`/sources/priorities/${projectId}`)
      return data
    } catch (error) {
      console.log(`Failed to fetch project priorities${projectId}`)
      throw new Error("Failed to fetch project priorities")
    }
  },
  async calculateSourceMetrics(sourceId:string)
  {
    try {
      const {data}=await api.get(`/sources/${sourceId}/metrics`)
      return data
    } catch (error) {
      return {avgConfidence:0,completeness:0,totalAttributes:0}
    }
  },
  async setAttributePriority(priorityId:string,attributeName:string,priority:number):Promise<void>{
    try {
      await api.post(`/sources/priorities/${priorityId}/attribute`,{
        attribute_name:attributeName,
        priority_score:priority
      })
    } catch (error) {
      console.error(`Failed to set attribute priority,${attributeName}`)
      throw new Error('Failed to set attribute priority')
    }
  }

}
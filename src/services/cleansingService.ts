// import { supabase } from '../lib/supabase';
// import type { CleansingIssue, IssueType } from '../types/database.types';

import api from "../lib/api.ts";
import { CleansingIssue } from "../types/database.types.ts";

// export class CleansingService {
//   async performCleansing(productId: string) {
//     const { data: attributes } = await supabase
//       .from('aggregated_attributes')
//       .select('*')
//       .eq('product_id', productId);

//     if (!attributes) return;

//     for (const attr of attributes) {
//       const issues = this.detectIssues(attr);

//       for (const issue of issues) {
//         await supabase
//           .from('cleansing_issues')
//           .insert({
//             product_id: productId,
//             attribute_name: attr.attribute_name,
//             issue_type: issue.type,
//             details: issue.details,
//             resolved: false
//           });
//       }

//       await supabase
//         .from('audit_trail')
//         .insert({
//           product_id: productId,
//           attribute_name: attr.attribute_name,
//           selected_value: '',
//           source_used: '',
//           reason: `Detected ${issues.length} issues during cleansing`,
//           stage: 'cleansing'
//         });
//     }
//   }

//   private detectIssues(attribute: any): Array<{ type: IssueType; details: string }> {
//     const issues: Array<{ type: IssueType; details: string }> = [];
//     const values = attribute.values as Array<{ value: string }>;

//     if (!values || values.length === 0) {
//       issues.push({
//         type: 'missing',
//         details: 'No values found for attribute'
//       });
//       return issues;
//     }

//     const uniqueValues = new Set(values.map(v => v.value));
//     if (uniqueValues.size < values.length) {
//       issues.push({
//         type: 'duplicate',
//         details: `Found ${values.length - uniqueValues.size} duplicate values`
//       });
//     }

//     for (const val of values) {
//       if (!val.value || val.value.trim() === '') {
//         issues.push({
//           type: 'invalid',
//           details: 'Empty or whitespace-only value detected'
//         });
//       }

//       if (attribute.attribute_name.toLowerCase().includes('price')) {
//         const numVal = parseFloat(val.value);
//         if (isNaN(numVal) || numVal <= 0) {
//           issues.push({
//             type: 'invalid',
//             details: 'Price must be a positive number'
//           });
//         }
//       }

//       if (attribute.attribute_name.toLowerCase().includes('email')) {
//         if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.value)) {
//           issues.push({
//             type: 'invalid',
//             details: 'Invalid email format'
//           });
//         }
//       }
//     }

//     return issues;
//   }

//   async getCleansingIssues(productId: string): Promise<CleansingIssue[]> {
//     const { data, error } = await supabase
//       .from('cleansing_issues')
//       .select('*')
//       .eq('product_id', productId)
//       .order('detected_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }

//   async resolveIssue(issueId: string) {
//     const { error } = await supabase
//       .from('cleansing_issues')
//       .update({ resolved: true })
//       .eq('id', issueId);

//     if (error) throw error;
//   }

//   async getAllIssues(): Promise<CleansingIssue[]> {
//     const { data, error } = await supabase
//       .from('cleansing_issues')
//       .select('*')
//       .order('detected_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }
// }

// export const cleansingService = new CleansingService();

export const cleansingService = {
  async getAllIssues(): Promise<CleansingIssue[]> {
    try {
      const { data } = await api.get<CleansingIssue[]>('/cleansing/issues');
      return data || [];
    } catch (error) {
      console.error('Service Error: Failed to fetch cleansing issues', error);
      return [];
    }
  },

  async resolveIssue(issueId: string): Promise<void> {
    try {
      await api.post(`/cleansing/resolve/${issueId}`);
    } catch (error) {
      console.error(`Service Error: Failed to resolve issue ${issueId}`, error);
      throw new Error('Could not update issue status.');
    }
  }
};
// import { supabase } from '../lib/supabase';
// import type { GoldenRecord } from '../types/database.types';
import api from '../lib/api';

// export class GoldenRecordService {
//   async generateGoldenRecord(productId: string): Promise<GoldenRecord> {
//     const { data: product } = await supabase
//       .from('products')
//       .select('*')
//       .eq('id', productId)
//       .maybeSingle();

//     if (!product) throw new Error('Product not found');

//     const { data: standardizedAttrs } = await supabase
//       .from('standardized_attributes')
//       .select('*')
//       .eq('product_id', productId);

//     const { data: enrichment } = await supabase
//       .from('enrichments')
//       .select('*')
//       .eq('product_id', productId)
//       .maybeSingle();

//     const { data: validations } = await supabase
//       .from('rule_validations')
//       .select('*')
//       .eq('product_id', productId);

//     const attributes: Record<string, any> = {};
//     for (const attr of standardizedAttrs || []) {
//       attributes[attr.attribute_name] = {
//         value: attr.standard_value,
//         format: attr.standard_format,
//         sources: attr.derived_from
//       };
//     }

//     const allValidationsPassed = validations?.every(v => v.status === 'pass') ?? false;

//     const goldenRecordData = {
//       product_id: productId,
//       sku: product.sku,
//       brand: product.brand,
//       attributes,
//       assets: {},
//       enrichment: enrichment ? {
//         seo_title: enrichment.seo_title,
//         bullets: enrichment.bullets,
//         tags: enrichment.tags,
//         inferred_attributes: enrichment.inferred_attributes
//       } : {},
//       ready_for_publish: allValidationsPassed,
//       updated_at: new Date().toISOString()
//     };

//     const { data, error } = await supabase
//       .from('golden_records')
//       .upsert(goldenRecordData)
//       .select()
//       .maybeSingle();

//     if (error) throw error;

//     await supabase
//       .from('audit_trail')
//       .insert({
//         product_id: productId,
//         attribute_name: 'golden_record',
//         selected_value: 'generated',
//         source_used: 'golden_record_engine',
//         reason: `Generated golden record - Ready: ${allValidationsPassed}`,
//         stage: 'enrichment'
//       });

//     return data!;
//   }

//   async publishGoldenRecord(productId: string) {
//     const { error } = await supabase
//       .from('golden_records')
//       .update({
//         published_at: new Date().toISOString(),
//         ready_for_publish: true
//       })
//       .eq('product_id', productId);

//     if (error) throw error;

//     await supabase
//       .from('audit_trail')
//       .insert({
//         product_id: productId,
//         attribute_name: 'golden_record',
//         selected_value: 'published',
//         source_used: 'golden_record_engine',
//         reason: 'Golden record published to production',
//         stage: 'enrichment'
//       });
//   }

//   async getGoldenRecord(productId: string): Promise<GoldenRecord | null> {
//     const { data, error } = await supabase
//       .from('golden_records')
//       .select('*')
//       .eq('product_id', productId)
//       .maybeSingle();

//     if (error) throw error;
//     return data;
//   }

//   async getAllGoldenRecords(): Promise<GoldenRecord[]> {
//     const { data, error } = await supabase
//       .from('golden_records')
//       .select('*')
//       .order('updated_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }

//   async getPublishableRecords(): Promise<GoldenRecord[]> {
//     const { data, error } = await supabase
//       .from('golden_records')
//       .select('*')
//       .eq('ready_for_publish', true)
//       .is('published_at', null)
//       .order('updated_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }
// }

// export const goldenRecordService = new GoldenRecordService();
import type { GoldenRecord } from '../types/database.types';

export const goldenRecordService = {
  async generateGoldenRecord(productId: string): Promise<GoldenRecord> {
    try {
      const { data } = await api.post<GoldenRecord>(`/products/${productId}/generate-golden`);
      return data;
    } catch (error) {
      console.error('Golden record generation failed:', error);
      throw new Error('Failed to assemble golden record.');
    }
  },

  async publishGoldenRecord(productId: string): Promise<void> {
    try {
      await api.post(`/products/${productId}/publish`);
    } catch (error) {
      console.error('Publishing failed:', error);
      throw new Error('Could not publish record to production.');
    }
  },

  async getAllGoldenRecords(): Promise<GoldenRecord[]> {
    try {
      const { data } = await api.get<GoldenRecord[]>('/golden-records');
      return data || [];
    } catch (error) {
      console.error('Failed to fetch golden records:', error);
      return [];
    }
  },

  async getPublishableRecords(): Promise<GoldenRecord[]> {
    try {
      const { data } = await api.get<GoldenRecord[]>('/golden-records/publishable');
      return data || [];
    } catch (error) {
      console.error('Failed to fetch publishable records:', error);
      return [];
    }
  }
};
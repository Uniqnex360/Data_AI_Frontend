// import { supabase } from '../lib/supabase';
// import type { SourceType, RawExtraction } from '../types/database.types';

import api from "../lib/api.ts";
import { Source } from "../types/database.types.ts";
import { RawExtraction, ExtractionInput } from '../types/database.types';

// interface ExtractionInput {
//   sourceType: SourceType;
//   content: string;
//   sourceUrl: string;
// }

// interface ExtractionResult {
//   source_type: SourceType;
//   source_id: string;
//   product_keys: {
//     sku?: string;
//     mpn?: string;
//     brand?: string;
//   };
//   raw_attributes: Record<string, unknown>;
//   confidence: number;
// }

// export class ExtractionService {
//   async createSource(sourceType: SourceType, sourceUrl: string, metadata: Record<string, unknown> = {}) {
//     const { data, error } = await supabase
//       .from('sources')
//       .insert({
//         source_type: sourceType,
//         source_url: sourceUrl,
//         metadata,
//         status: 'pending'
//       })
//       .select()
//       .maybeSingle();

//     if (error) throw error;
//     return data;
//   }

//   async updateSourceStatus(sourceId: string, status: 'pending' | 'processing' | 'completed' | 'failed') {
//     const { error } = await supabase
//       .from('sources')
//       .update({ status })
//       .eq('id', sourceId);

//     if (error) throw error;
//   }

//   async extractFromSource(input: ExtractionInput): Promise<ExtractionResult> {
//     const source = await this.createSource(input.sourceType, input.sourceUrl);

//     await this.updateSourceStatus(source.id, 'processing');

//     try {
//       const extraction = await this.performExtraction(input);

//       const { data, error } = await supabase
//         .from('raw_extractions')
//         .insert({
//           source_id: source.id,
//           product_keys: extraction.product_keys,
//           raw_attributes: extraction.raw_attributes,
//           confidence: extraction.confidence
//         })
//         .select()
//         .maybeSingle();

//       if (error) throw error;

//       await this.updateSourceStatus(source.id, 'completed');

//       return {
//         ...extraction,
//         source_id: source.id
//       };
//     } catch (error) {
//       await this.updateSourceStatus(source.id, 'failed');
//       throw error;
//     }
//   }

//   private async performExtraction(input: ExtractionInput): Promise<Omit<ExtractionResult, 'source_id'>> {
//     const attributes: Record<string, unknown> = {};
//     const productKeys: { sku?: string; mpn?: string; brand?: string } = {};

//     const lines = input.content.split('\n');
//     for (const line of lines) {
//       if (line.toLowerCase().includes('sku:')) {
//         productKeys.sku = line.split(':')[1]?.trim();
//       } else if (line.toLowerCase().includes('mpn:')) {
//         productKeys.mpn = line.split(':')[1]?.trim();
//       } else if (line.toLowerCase().includes('brand:')) {
//         productKeys.brand = line.split(':')[1]?.trim();
//       } else if (line.includes(':')) {
//         const [key, value] = line.split(':');
//         if (key && value) {
//           attributes[key.trim()] = value.trim();
//         }
//       }
//     }

//     return {
//       source_type: input.sourceType,
//       product_keys: productKeys,
//       raw_attributes: attributes,
//       confidence: 0.85
//     };
//   }

//   async getRawExtractions(sourceId?: string): Promise<RawExtraction[]> {
//     let query = supabase.from('raw_extractions').select('*');

//     if (sourceId) {
//       query = query.eq('source_id', sourceId);
//     }

//     const { data, error } = await query;
//     if (error) throw error;
//     return data || [];
//   }

//   async getAllSources() {
//     const { data, error } = await supabase
//       .from('sources')
//       .select('*')
//       .order('uploaded_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }
// }

// export const extractionService = new ExtractionService();

export const extractionService={
  async extractFromSource(input:ExtractionInput):Promise<any>{
    try {
      const {data}=await api.post('/extract/',input)
      return data
    } catch (error) {
      console.error("Extraction failed",error)
      throw new Error('AI extraction failed to process source')
    }
  },
  async getAllSources():Promise<Source[]>{
    try {
      const {data}=await api.get<Source[]>('/sources/')
      return data||[]

    } catch (error) {
      console.error("Failed to fetch sources",error)
      return []
    }
  },
  async getRawExtractions(sourceId?:string):Promise<RawExtraction[]>{
    try {
      const {data}=await api.get<RawExtraction[]>('/extraction/',{
        params:{source_id:sourceId}
      })
      return data||[]
    } catch (error) {
      console.error('Failed to fetch extractions',error)
      return []
    }
  },
}
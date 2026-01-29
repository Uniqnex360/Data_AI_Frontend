// import { supabase } from '../lib/supabase';
// import type { StandardizedAttribute } from '../types/database.types';
import api from '../lib/api.ts';
import { StandardizedAttribute } from '../types/database.types';

// const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
//   length: {
//     'mm': 1,
//     'cm': 10,
//     'm': 1000,
//     'in': 25.4,
//     'ft': 304.8
//   },
//   weight: {
//     'g': 1,
//     'kg': 1000,
//     'lb': 453.592,
//     'oz': 28.3495
//   }
// };

// const CONTROLLED_VOCABULARIES: Record<string, string[]> = {
//   'ip_rating': ['IP20', 'IP44', 'IP54', 'IP65', 'IP67', 'IP68'],
//   'mounting_type': ['Surface Mount', 'Recessed', 'Pendant', 'Track', 'Wall Mount'],
//   'color_temp': ['2700K', '3000K', '3500K', '4000K', '5000K', '6500K']
// };

// export class StandardizationService {
//   async performStandardization(productId: string) {
//     const { data: attributes } = await supabase
//       .from('aggregated_attributes')
//       .select('*')
//       .eq('product_id', productId)
//       .eq('has_conflict', false);

//     if (!attributes) return;

//     for (const attr of attributes) {
//       const standardized = this.standardizeAttribute(attr);

//       await supabase
//         .from('standardized_attributes')
//         .upsert({
//           product_id: productId,
//           attribute_name: attr.attribute_name,
//           standard_value: standardized.value,
//           standard_format: standardized.format,
//           derived_from: attr.values.map((v: any) => v.source_id)
//         });

//       await supabase
//         .from('audit_trail')
//         .insert({
//           product_id: productId,
//           attribute_name: attr.attribute_name,
//           selected_value: standardized.value,
//           source_used: attr.values[0]?.source_id || '',
//           reason: standardized.reason,
//           stage: 'standardization'
//         });
//     }
//   }

//   private standardizeAttribute(attribute: any): { value: string; format: string; reason: string } {
//     const attrName = attribute.attribute_name.toLowerCase();
//     const values = attribute.values as Array<{ value: string; confidence: number }>;

//     if (!values || values.length === 0) {
//       return { value: '', format: 'none', reason: 'No values available' };
//     }

//     const bestValue = values.sort((a, b) => b.confidence - a.confidence)[0];

//     if (CONTROLLED_VOCABULARIES[attrName]) {
//       const vocab = CONTROLLED_VOCABULARIES[attrName];
//       const match = vocab.find(term =>
//         bestValue.value.toLowerCase().includes(term.toLowerCase())
//       );

//       if (match) {
//         return {
//           value: match,
//           format: 'enum',
//           reason: `Matched to controlled vocabulary: ${match}`
//         };
//       }
//     }

//     if (attrName.includes('dimension') || attrName.includes('length') || attrName.includes('width') || attrName.includes('height')) {
//       const normalized = this.normalizeUnit(bestValue.value, 'length');
//       return {
//         value: normalized.value,
//         format: normalized.unit,
//         reason: `Normalized unit from ${bestValue.value} to ${normalized.value}${normalized.unit}`
//       };
//     }

//     if (attrName.includes('weight')) {
//       const normalized = this.normalizeUnit(bestValue.value, 'weight');
//       return {
//         value: normalized.value,
//         format: normalized.unit,
//         reason: `Normalized unit from ${bestValue.value} to ${normalized.value}${normalized.unit}`
//       };
//     }

//     return {
//       value: bestValue.value,
//       format: 'string',
//       reason: 'Used highest confidence value as-is'
//     };
//   }

//   private normalizeUnit(value: string, type: 'length' | 'weight'): { value: string; unit: string } {
//     const match = value.match(/^([\d.]+)\s*([a-zA-Z]+)$/);

//     if (!match) {
//       return { value, unit: 'unknown' };
//     }

//     const [, numStr, unit] = match;
//     const num = parseFloat(numStr);
//     const conversions = UNIT_CONVERSIONS[type];

//     if (!conversions || !conversions[unit.toLowerCase()]) {
//       return { value, unit };
//     }

//     const baseUnit = type === 'length' ? 'mm' : 'g';
//     const baseValue = num * conversions[unit.toLowerCase()];

//     return {
//       value: baseValue.toFixed(2),
//       unit: baseUnit
//     };
//   }

//   async getStandardizedAttributes(productId: string): Promise<StandardizedAttribute[]> {
//     const { data, error } = await supabase
//       .from('standardized_attributes')
//       .select('*')
//       .eq('product_id', productId);

//     if (error) throw error;
//     return data || [];
//   }
// }

// export const standardizationService = new StandardizationService();
export const standardizationService={
  async getStandardizedAttribute(productId:string):Promise<StandardizedAttribute[]>{
    try {
      const {data}=await api.get(`/standardization/${productId}`)
      return data.map((item:any)=>({
        ...item,
        standard_format:item.unit?`Unit:${item.unit}`:item.reason
      }))
    } catch (error) {
      console.error('Standardization fetch error :',error)
      return []
    }
  },
  async performStandarization(productId:string,aggregatedData:any):Promise<void>{
    try {
      await api.post('/standarize/',{
        product_key:productId,
        data:aggregatedData
      })
    } catch (error) {
      console.error('Standardization run error',error)
      throw new Error("Failed to run standarization engine.")
    }
  }
}
// import { supabase } from '../lib/supabase';
// import type { AggregatedAttribute, AttributeValue, Product } from '../types/database.types';

import { AggregatedAttribute, Product } from "../types/database.types.ts";
import { Product } from '../types/database.types';
import api from "../lib/api.ts";

// const SOURCE_TRUST_ORDER = {
//   excel: 4,
//   pdf: 3,
//   web: 2,
//   image: 1,
//   csv: 4
// };

// export class AggregationService {
//   async createOrGetProduct(sku: string, mpn?: string, brand?: string): Promise<Product> {
//     const { data: existing } = await supabase
//       .from('products')
//       .select('*')
//       .eq('sku', sku)
//       .maybeSingle();

//     if (existing) {
//       return existing;
//     }

//     const { data, error } = await supabase
//       .from('products')
//       .insert({ sku, mpn, brand })
//       .select()
//       .maybeSingle();

//     if (error) throw error;
//     return data!;
//   }

//   async aggregateProductData(productId: string) {
//     const { data: extractions, error: extError } = await supabase
//       .from('raw_extractions')
//       .select('*, sources!inner(*)')
//       .eq('product_keys->>sku', productId);

//     if (extError) throw extError;

//     const attributeMap = new Map<string, AttributeValue[]>();

//     for (const extraction of extractions || []) {
//       const rawAttrs = extraction.raw_attributes as Record<string, unknown>;

//       for (const [attrName, attrValue] of Object.entries(rawAttrs)) {
//         if (!attributeMap.has(attrName)) {
//           attributeMap.set(attrName, []);
//         }

//         attributeMap.get(attrName)!.push({
//           value: String(attrValue),
//           source_id: extraction.source_id,
//           confidence: extraction.confidence
//         });
//       }
//     }

//     for (const [attrName, values] of attributeMap.entries()) {
//       const uniqueValues = new Set(values.map(v => v.value));
//       const hasConflict = uniqueValues.size > 1;

//       await supabase
//         .from('aggregated_attributes')
//         .upsert({
//           product_id: productId,
//           attribute_name: attrName,
//           values,
//           has_conflict: hasConflict
//         });

//       await supabase
//         .from('audit_trail')
//         .insert({
//           product_id: productId,
//           attribute_name: attrName,
//           selected_value: values[0]?.value || '',
//           source_used: values[0]?.source_id || '',
//           reason: hasConflict ? 'Multiple values detected - conflict' : 'Single value from source',
//           stage: 'aggregation'
//         });
//     }
//   }

//   async getAggregatedAttributes(productId: string): Promise<AggregatedAttribute[]> {
//     const { data, error } = await supabase
//       .from('aggregated_attributes')
//       .select('*')
//       .eq('product_id', productId);

//     if (error) throw error;
//     return data || [];
//   }

//   async getAllProducts(): Promise<Product[]> {
//     const { data, error } = await supabase
//       .from('products')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }

//   async resolveConflict(attributeId: string, selectedValue: AttributeValue) {
//     const { data: attribute } = await supabase
//       .from('aggregated_attributes')
//       .select('*')
//       .eq('id', attributeId)
//       .maybeSingle();

//     if (!attribute) return;

//     const updatedValues = [selectedValue];

//     await supabase
//       .from('aggregated_attributes')
//       .update({
//         values: updatedValues,
//         has_conflict: false
//       })
//       .eq('id', attributeId);

//     await supabase
//       .from('audit_trail')
//       .insert({
//         product_id: attribute.product_id,
//         attribute_name: attribute.attribute_name,
//         selected_value: selectedValue.value,
//         source_used: selectedValue.source_id,
//         reason: 'Manually resolved conflict',
//         stage: 'aggregation'
//       });
//   }
// }

// export const aggregationService = new AggregationService();
export const aggregationService={
  async getAllProducts():Promise<Product[]>{
    const {data}=await api.get<Product[]>('/products')
    return data.map(p=>({...p,sku:(p as any).product_code}))
  },
  async getAggregatedAttributes(productId:string):Promise<AggregatedAttribute[]>{
    const {data}=await api.get<AggregatedAttribute[]>(`/aggregation/attributes/${productId}`)
    return data
  },
  async aggregateProductData(productId:string):Promise<AggregatedAttribute[]>{
    await api.post(`/products/${productId}/aggregate`)
  }

}
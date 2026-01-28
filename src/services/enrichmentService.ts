// import { supabase } from '../lib/supabase';
// import type { Enrichment } from '../types/database.types';

import api from "../lib/api.ts";
import { Enrichment } from '../types/database.types';

// export class EnrichmentService {
//   async enrichProduct(productId: string) {
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

//     const attributes = new Map(
//       (standardizedAttrs || []).map(attr => [attr.attribute_name, attr.standard_value])
//     );

//     const seoTitle = this.generateSEOTitle(product, attributes);
//     const bullets = this.generateBulletPoints(attributes);
//     const tags = this.generateTags(attributes);
//     const inferredAttributes = this.inferAttributes(attributes);

//     const { data, error } = await supabase
//       .from('enrichments')
//       .upsert({
//         product_id: productId,
//         seo_title: seoTitle,
//         bullets,
//         tags,
//         inferred_attributes: inferredAttributes
//       })
//       .select()
//       .maybeSingle();

//     if (error) throw error;

//     await supabase
//       .from('audit_trail')
//       .insert({
//         product_id: productId,
//         attribute_name: 'enrichment',
//         selected_value: 'completed',
//         source_used: 'enrichment_engine',
//         reason: `Generated SEO title, ${bullets.length} bullets, ${tags.length} tags`,
//         stage: 'enrichment'
//       });

//     return data;
//   }

//   private generateSEOTitle(product: any, attributes: Map<string, string>): string {
//     const brand = product.brand || attributes.get('brand') || '';
//     const model = attributes.get('model') || attributes.get('model_number') || '';
//     const type = attributes.get('type') || attributes.get('category') || 'Product';

//     return `${brand} ${model} ${type}`.trim();
//   }

//   private generateBulletPoints(attributes: Map<string, string>): string[] {
//     const bullets: string[] = [];
//     const priorityAttrs = [
//       'description',
//       'key_features',
//       'dimensions',
//       'weight',
//       'color',
//       'material',
//       'warranty'
//     ];

//     for (const attrName of priorityAttrs) {
//       const value = attributes.get(attrName);
//       if (value) {
//         const formatted = this.formatBulletPoint(attrName, value);
//         bullets.push(formatted);
//       }
//     }

//     for (const [name, value] of attributes) {
//       if (!priorityAttrs.includes(name) && bullets.length < 10) {
//         bullets.push(this.formatBulletPoint(name, value));
//       }
//     }

//     return bullets.slice(0, 8);
//   }

//   private formatBulletPoint(name: string, value: string): string {
//     const formattedName = name
//       .split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');

//     return `${formattedName}: ${value}`;
//   }

//   private generateTags(attributes: Map<string, string>): string[] {
//     const tags = new Set<string>();

//     if (attributes.has('category')) {
//       tags.add(attributes.get('category')!);
//     }

//     if (attributes.has('brand')) {
//       tags.add(attributes.get('brand')!);
//     }

//     for (const [name, value] of attributes) {
//       if (name.includes('type') || name.includes('style')) {
//         tags.add(value);
//       }

//       if (name.includes('color')) {
//         tags.add(`Color: ${value}`);
//       }

//       if (name.includes('material')) {
//         tags.add(`Material: ${value}`);
//       }
//     }

//     return Array.from(tags).slice(0, 10);
//   }

//   private inferAttributes(attributes: Map<string, string>): Record<string, any> {
//     const inferred: Record<string, any> = {};

//     const price = parseFloat(attributes.get('price') || '0');
//     if (price > 0) {
//       if (price < 50) {
//         inferred.price_range = 'budget';
//       } else if (price < 200) {
//         inferred.price_range = 'mid-range';
//       } else {
//         inferred.price_range = 'premium';
//       }
//     }

//     const dimensions = attributes.get('dimensions');
//     if (dimensions) {
//       const size = this.inferSizeCategory(dimensions);
//       if (size) {
//         inferred.size_category = size;
//       }
//     }

//     const material = attributes.get('material');
//     if (material?.toLowerCase().includes('metal')) {
//       inferred.durability = 'high';
//     } else if (material?.toLowerCase().includes('plastic')) {
//       inferred.durability = 'medium';
//     }

//     return inferred;
//   }

//   private inferSizeCategory(dimensions: string): string | null {
//     const match = dimensions.match(/(\d+\.?\d*)/g);
//     if (!match) return null;

//     const nums = match.map(n => parseFloat(n));
//     const maxDim = Math.max(...nums);

//     if (maxDim < 100) return 'compact';
//     if (maxDim < 500) return 'medium';
//     return 'large';
//   }

//   async getEnrichment(productId: string): Promise<Enrichment | null> {
//     const { data, error } = await supabase
//       .from('enrichments')
//       .select('*')
//       .eq('product_id', productId)
//       .maybeSingle();

//     if (error) throw error;
//     return data;
//   }
// }

// export const enrichmentService = new EnrichmentService();
export class EnrichmentService{
  async enrichProduct(productId:string)
  {
    try {
      if(!productId)
      {
        throw new Error("Failed to process enrichproduct")
      }
      const {data}=await api.post(`/enrichment/run/${productId}`)
      return data
    } catch (error) {
      console.error("Enrichment Service Error",error)
      throw new Error("AI encrichment failed to process")
    }
  }
  async getEnrichment(productId:string):Promise<Enrichment|null>{
    try {
      const {data}=await api.get<Enrichment>(`/enrichment/${productId}`)
      return data
    } catch (error) {
      console.error('Enrichment status failed',error)
      return null

    }
  }
}
export const enrichmentService=new EnrichmentService()
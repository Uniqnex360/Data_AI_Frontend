// import { supabase } from '../lib/supabase';
// import type { BusinessRule, RuleValidation } from '../types/database.types';
import api from '../lib/api.ts';
import { BusinessRule, RuleValidation } from '../types/database.types';

// export class BusinessRulesService {
//   async createRule(rule: Omit<BusinessRule, 'id' | 'created_at'>) {
//     const { data, error } = await supabase
//       .from('business_rules')
//       .insert(rule)
//       .select()
//       .maybeSingle();

//     if (error) throw error;
//     return data;
//   }

//   async validateProduct(productId: string) {
//     const { data: rules } = await supabase
//       .from('business_rules')
//       .select('*')
//       .eq('active', true);

//     if (!rules) return;

//     const { data: standardizedAttrs } = await supabase
//       .from('standardized_attributes')
//       .select('*')
//       .eq('product_id', productId);

//     if (!standardizedAttrs) return;

//     const attrMap = new Map(
//       standardizedAttrs.map(attr => [attr.attribute_name, attr.standard_value])
//     );

//     for (const rule of rules) {
//       const value = attrMap.get(rule.attribute_name);
//       const result = this.applyRule(rule, value);

//       await supabase
//         .from('rule_validations')
//         .insert({
//           product_id: productId,
//           rule_id: rule.rule_id,
//           status: result.status,
//           reason: result.reason
//         });

//       await supabase
//         .from('audit_trail')
//         .insert({
//           product_id: productId,
//           attribute_name: rule.attribute_name,
//           selected_value: value || '',
//           source_used: 'business_rules',
//           reason: `Rule ${rule.rule_id}: ${result.reason}`,
//           stage: 'standardization'
//         });
//     }
//   }

//   private applyRule(rule: BusinessRule, value?: string): { status: 'pass' | 'fail'; reason: string } {
//     if (!value) {
//       return { status: 'fail', reason: 'Value is missing' };
//     }

//     switch (rule.rule_type) {
//       case 'validation':
//         return this.applyValidationRule(rule, value);
//       case 'enum':
//         return this.applyEnumRule(rule, value);
//       case 'range':
//         return this.applyRangeRule(rule, value);
//       case 'format':
//         return this.applyFormatRule(rule, value);
//       default:
//         return { status: 'fail', reason: 'Unknown rule type' };
//     }
//   }

//   private applyValidationRule(rule: BusinessRule, value: string): { status: 'pass' | 'fail'; reason: string } {
//     const config = rule.rule_config as { min?: number; max?: number; required?: boolean };

//     if (config.required && (!value || value.trim() === '')) {
//       return { status: 'fail', reason: 'Required field is empty' };
//     }

//     const numValue = parseFloat(value);
//     if (!isNaN(numValue)) {
//       if (config.min !== undefined && numValue < config.min) {
//         return { status: 'fail', reason: `Value ${numValue} is less than minimum ${config.min}` };
//       }
//       if (config.max !== undefined && numValue > config.max) {
//         return { status: 'fail', reason: `Value ${numValue} exceeds maximum ${config.max}` };
//       }
//     }

//     return { status: 'pass', reason: 'Validation passed' };
//   }

//   private applyEnumRule(rule: BusinessRule, value: string): { status: 'pass' | 'fail'; reason: string } {
//     const config = rule.rule_config as { allowed_values: string[] };

//     if (!config.allowed_values || !Array.isArray(config.allowed_values)) {
//       return { status: 'fail', reason: 'Invalid enum configuration' };
//     }

//     if (config.allowed_values.includes(value)) {
//       return { status: 'pass', reason: `Value "${value}" is in allowed list` };
//     }

//     return {
//       status: 'fail',
//       reason: `Value "${value}" not in allowed list: ${config.allowed_values.join(', ')}`
//     };
//   }

//   private applyRangeRule(rule: BusinessRule, value: string): { status: 'pass' | 'fail'; reason: string } {
//     const config = rule.rule_config as { min: number; max: number };
//     const numValue = parseFloat(value);

//     if (isNaN(numValue)) {
//       return { status: 'fail', reason: 'Value is not a number' };
//     }

//     if (numValue < config.min || numValue > config.max) {
//       return {
//         status: 'fail',
//         reason: `Value ${numValue} outside range [${config.min}, ${config.max}]`
//       };
//     }

//     return { status: 'pass', reason: `Value ${numValue} within range` };
//   }

//   private applyFormatRule(rule: BusinessRule, value: string): { status: 'pass' | 'fail'; reason: string } {
//     const config = rule.rule_config as { pattern: string };

//     try {
//       const regex = new RegExp(config.pattern);
//       if (regex.test(value)) {
//         return { status: 'pass', reason: 'Format matches pattern' };
//       }
//       return { status: 'fail', reason: `Value does not match pattern: ${config.pattern}` };
//     } catch (error) {
//       return { status: 'fail', reason: 'Invalid regex pattern' };
//     }
//   }

//   async getRules(): Promise<BusinessRule[]> {
//     const { data, error } = await supabase
//       .from('business_rules')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }

//   async getValidations(productId: string): Promise<RuleValidation[]> {
//     const { data, error } = await supabase
//       .from('rule_validations')
//       .select('*')
//       .eq('product_id', productId)
//       .order('validated_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }
// }

// export const businessRulesService = new BusinessRulesService();

export const businessRulesService={
  async getRules():Promise<BusinessRule[]>{
    try {
      const {data}=await api.get<BusinessRule[]>('/rules/')
      return data||[]
    } catch (error) {
      console.error('Failed to create rule',error)
      throw new Error('Failed to load rules list!'); 
    }
  },
  async createRule(rule:Omit<BusinessRule,'id'|'created_at'>):Promise<BusinessRule|null>{
    try {
      const {data}=await api.post<BusinessRule>('/rules/',rule)
      return data

    } catch (error) {
      console.error("Failed to create rule",error)
      throw new Error("Rule creation failed!")
    }
  },
  async validateProduct(productId:string):Promise<void>{
    try {
      await api.post(`/rules/validate/${productId}`)
    } catch (error) {
      console.error('Validation trigger failed',error)
      throw new Error("Could not run validation engine")
    }
  },
  async getValidations(productId:string):Promise<RuleValidation[]>{
    try {
      const {data}=await api.get<RuleValidation[]>(`/rules/results/${productId}`)
      return data||[]
    } catch (error) {
      console.error("Failed to fetch validation results",error)
      return []
    }
  }
}
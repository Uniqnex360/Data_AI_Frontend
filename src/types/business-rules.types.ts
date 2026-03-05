
export enum RuleCategory{
    ENRICHMENT='enrichment',
    AGGREGATION='aggregation',
    EXTRACTION='extraction',
    STANDARDIZATION='standardization'

}
export type AttributeValue = string | number | boolean | {
  value: string | number;
  uom?: string;
};
export interface RuleExecuteResponse {
  status: string;
  output: RuleOutputData
  execution_time_ms: number;
  executed_at: string;
}
export interface RuleExecutionLog {
  id: string;
  product_id?: string;
  input_data?: RuleExecutionContext
  output_data?:RuleOutputData
  status: string;
  error_message?: string;
  execution_time_ms?: number;
  executed_at: string;
}
export interface RuleExecutionContext{
  product_name?:string
  brand?:string
  category?:string
  sku?:string
  mpn?:string
  description?:string
  [key: string]: AttributeValue | undefined;
}

export interface RuleOutputData{
  [key:string]:AttributeValue
}
export enum RuleStatus{
    ACTIVE='active',
    INACTIVE='inactive',
    // DRAFT='draft'
}
export interface RulePrompt{
    id:string
    rule_id:string
    prompt_name:string
    prompt_text:string
    description?:string
    variables?:string
    priority:number
    status:RuleStatus
    execution_count:number
    last_executed_at?:number
    created_at:string
    updated_at:string
}
export interface RulePromptCreate{
    prompt_name:string
    prompt_text:string
    description?:string
    variables?:string
    priority?:string
    status?:RuleStatus
}
export interface RulePromptUpdate{
    prompt_name?:string
    prompt_text?:string
    description?:string
    variables?:string
    priority?:string
    status?:RuleStatus
}
export interface BusinessRule {
  id: string;
  title: string;
  category: RuleCategory;
  description?: string;
  prompt: string;
  variables?: string[];
  status: RuleStatus;
  priority: number;
  is_system: boolean;
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
export interface BusinessRuleCreate {
  title: string;
  category: RuleCategory;
  description?: string;
  prompt: string;
  variables?: string[];
  status?: RuleStatus;
  priority?: number;
}
export interface BusinessRuleUpdate {
  title?: string;
  description?: string;
  prompt?: string;
  variables?: string[];
  status?: RuleStatus;
  priority?: number;
}

export  interface BusinessRuleResponse{
    rule:BusinessRule[]
    total:number
    category_count:Record<string,number>
}
export interface BusinessRuleListResponse {
  rules: BusinessRule[];
  total: number;
  category_counts: Record<string, number>;
}
export interface RuleExecuteRequest{
    context:RuleExecutionContext
}


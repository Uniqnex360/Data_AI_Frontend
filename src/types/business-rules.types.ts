export enum RuleCategory{
    ENRICHMENT='enrichment',
    AGGREGATION='aggregation',
    VALIDATION='validation',
    CLEANSING='cleansing',

}
export enum RuleStatus{
    ACTIVE='active',
    INACTIVE='inactive',
    DRAFT='draft'
}
export interface BusinessRule{
    id:string
    title:string
    category:RuleCategory
    description?:string
    prompt:string
    variables?:string
    status:RuleStatus
    priority:number
    is_system:boolean
    execution_count:number
    last_executed_at?:string
    created_at:string
    updated_at:string
    created_by?:string

}
export interface BusinessRuleCreate{
    title:string
    category:RuleCategory
    description?:string
    prompt:string
    variables?:string[]
    status?:RuleStatus
    priority?:number

}
export interface BusinessRuleUpdate{
    title?:string
    category?:RuleCategory
    description?:string
    prompt?:string
    variables?:string[]
    status?:RuleStatus
    priority?:number
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
    context:Record<string,any>
}
export interface RuleExecuteResponse{
    status:string
    output:Record<string,any>
    execution_time_ms:number
    executed_at:string

}
export interface RuleExecutionLog{
    id:string
    product_id?:string
    input_data?:Record<string,any>
    output_data?:Record<string,any>
    status:string
    error_message?:string
    execution_time_ms?:number
    executed_at:string
}
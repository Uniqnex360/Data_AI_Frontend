export type SourceType = 'web' | 'pdf' | 'excel' | 'csv' | 'image';
export type SourceStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type IssueType = 'invalid' | 'duplicate' | 'missing' | 'inconsistent';
export type RuleType = 'validation' | 'enum' | 'range' | 'format';
export type ValidationStatus = 'pass' | 'fail';
export type ProcessingStage = 'extraction' | 'aggregation' | 'cleansing' | 'standardization' | 'enrichment';
export type TargetType = 'shopify' | 'bigcommerce' | 'magento' | 'pim' | 'marketplace' | 'csv';

export interface PublishTarget {
  id: string;
  project_id: string;
  target_name: string;
  target_type: TargetType;
  connection_config: Record<string, string | number | boolean>;
  field_mapping: Record<string, string>;
  active: boolean;
  created_at: string;
  last_publish_at?: string;
}
export interface SourcePriority {
  id: string;
  project_id: string;
  source_id: string;
  priority_rank: number;
  reliability_score: number;
  auto_select_enabled: boolean;
  attribute_priorities: Record<string, number>;
  created_at: string;
  updated_at: string;
}
export interface Source {
  id: string;
  source_type: SourceType;
  source_url: string;
  uploaded_at: string;
  metadata: Record<string, unknown>;
  status: SourceStatus;
}
export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  projects: string[];
  created_at: string;
}
export type UserRole = 'admin' | 'catalog_manager' | 'validator' | 'viewer' | 'vendor';

export interface ValidationQueue {
  id: string;
  product_id: string; 
  product_code?:string
  attribute_name: string;
  proposed_value: any;
  confidence: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review' | 'flagged';
  notes?: string;
  created_at: string;
  reviewed_at?: string;
}
export interface RawExtraction {
  id: string;
  source_id: string;
  product_keys: {
    sku?: string;
    mpn?: string;
    brand?: string;
  };
  raw_attributes: Record<string, unknown>;
  confidence: number;
  extracted_at: string;
}
export interface ProductAttributes {
  [key: string]: JSONValue;
}
export type EnrichmentStatus='pending'|'processing'|'completed'|'failed'
export interface Product {
  id: string; 
  product_code: string; 
  product_name: string;
  brand_name?: string;
  mpn?: string;
  gtin?: string;
  upc?: string;
  description?: string;
  image_url_1?: string;
  enrichment_status: EnrichmentStatus;
  completeness_score: number;
   attributes: ProductAttributes;
  created_at: string;
  updated_at: string;
}
export interface ExtractionInput{
  sourceType:'web'|'pdf'|'excel'|'csv'|'image'
  content:string
  sourceUrl:string
  projectId?:string
}
export interface  ReviewItem{
  product_key:string
  attribute:string
  proposed_value: JSONValue;
  confidence:number 
  reason:string
  derived_from:string[]
  status:'pending'|'approved'|'rejected'
  reviewer?:string
  overridden_value: JSONValue | null;

}
export type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

export interface EnrichmentData{
  seo_title?:string
  bullets:string
  tags:string
  use_cases:string[]
  confidence:number
}
export interface AttributeValue {
  value: string;
  source_id: string;
  confidence: number;
}

export interface AggregatedAttribute {
  id: string;
  product_id: string;
  attribute_name: string;
  values: AttributeValue[];
  has_conflict: boolean;
  aggregated_at: string;
}

export interface CleansingIssue {
  id: string;
  product_id: string;
  attribute_name: string;
  issue_type: IssueType;
  details: string;
  resolved: boolean;
  detected_at: string;
}

export interface StandardizedAttribute {
  id: string;
  product_id: string;
  attribute_name: string;
  standard_value: string;
  standard_format: string;
  derived_from: string[];
  standardized_at: string;
}

export interface BusinessRule {
  id: string;
  rule_id: string;
  attribute_name: string;
  rule_type: RuleType;
  rule_config: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export interface RuleValidation {
  id: string;
  product_id: string;
  rule_id: string;
  status: ValidationStatus;
  reason: string;
  validated_at: string;
}

export interface Enrichment {
  id: string;
  product_id: string;
  seo_title?: string;
  bullets: string[];
  tags: string[];
  inferred_attributes: Record<string, unknown>;
  enriched_at: string;
}

export interface GoldenRecord {
  id: string;
  product_id: string;
  product_code?:string
  brand_name?:string
  sku: string;
  brand?: string;
  attributes: Record<string, unknown>;
  assets: Record<string, unknown>;
  enrichment: Record<string, unknown>;
  ready_for_publish: boolean;
  published_at?: string;
  completeness_score?:number
  updated_at: string;
}

export interface AuditTrail {
  id: string;
  product_id: string;
  attribute_name: string;
  selected_value: string;
  sources_used: string;
  reason: string;
  stage: ProcessingStage;
  logged_at: string;
}

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
}
export type PromptType = 
  | "extraction"
  | "pdf_extraction"
  | "unification"
  | "validation"
  | "enrichment"
  | "standardization";
export type ResponseSchema =
  | "ExtractionResponse"
  | "UnifiedStandardizedResponse"
  | "ValidationResponse"
  | "EnrichmentResponse";
export interface RulePrompt {
  id: string;
  rule_id: string;
  prompt_name: string;
  prompt_type: PromptType;        
  response_schema: ResponseSchema; 
  prompt_text: string;
  description?: string;
  priority: number;
  variables: string[];
  status: RuleStatus;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface RulePromptCreate {
  prompt_name: string;
  prompt_type?: PromptType;        
  response_schema?: ResponseSchema; 
  prompt_text: string;
  stage: string;
  description?: string;
  priority?: number;
  variables?: string[];
  status?: RuleStatus;
} 
export interface RulePromptUpdate {
  prompt_name?: string;
  prompt_type?: PromptType;        
  response_schema?: ResponseSchema; 
  prompt_text?: string;
  description?: string;
  priority?: number;
  variables?: string[];
  status?: RuleStatus;
}
export interface BusinessRule {
  id: string;
  rule_id: string;
  title: string;
  category: RuleCategory;
  description?: string;
  status: RuleStatus;
  operation_mode?: string;  
  use_case?: string;        
  prompts: RulePrompt[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
export interface BusinessRuleCreate {
  title: string;
  category: RuleCategory;
  description?: string;
  status?: RuleStatus;
  operation_mode?: string;  
  use_case?: string;        
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
export interface AggregatedAttributeValue{
  value:string
  confidence:number
  source_id:string
}
export interface AggregatedAttribute{
  id:string
  product_id:string
  attribute_name:string
  has_conflict:boolean
  values:AggregatedAttributeValue[]
}
export interface AggregationTabProps {
  projectId?: string;
  initialFilter?: string;
   onNavigate?: (tab: string, filterStatus?: string) => void;
    onNavigateToProject?: (tab: string, projectId: string) => void; 
}
export interface Project {
  id: string;
  name: string;
  client?: string;
  use_case?: string;
  completeness_score?:number
  operation_mode?:string;
  product_count?: number;
  source_status?: string;
  created_at?: string;  
   algorithm_used?: string;
  updated_at?: string; 
  processing_status?:
    | "pending"
    | "failed"
    | "completed"
    | "processing";
  aggregated_count?:number
  cleaned_count?:number
  failed_count?:number
  pending_count?:number
}
// src/types/database.types.ts

export interface Product {
  id: string;
  product_name: string;
  product_code: string;
  brand_name: string;
  brand_id?: string;
  brand_code?: string;
  category_1?: string;
  category_2?: string;
  category_3?: string;
  category_4?: string;
  category_5?: string;
  category_6?: string;
  category_7?: string;
  category_8?: string;
  category_id?: string;
  taxonomy?: string;
  
  // Identifiers
  mpn?: string;
  sku?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  unspc?: string;
  model_number?: string;
  parent_sku?: string;
  
  // Descriptions
  description?: string;
  short_description?: string;
  long_description?: string;
  features?: string[];
  
  // Attributes
  attributes?: Record<string, AttributeValue>;
  attributes_dict?: Record<string, {
    value: string;
    unit?: string;
    uom?: string;
  }>;
  attribute_names?: string[];
  attribute_count?: number;
  dynamic_attributes?: any[];
  
  // Validation
  validation_conflicts?: Record<string, string>;
  
  // Media
  image_url_1?: string;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  image_url_5?: string;
  image_url_6?: string;
  image_url_7?: string;
  image_url_8?: string;
  image_name_1?: string;
  image_name_2?: string;
  image_name_3?: string;
  image_name_4?: string;
  image_name_5?: string;
  image_name_6?: string;
  image_name_7?: string;
  image_name_8?: string;
  images?: Record<string, { name: string; url: string }>;
  
  video_url_1?: string;
  video_url_2?: string;
  video_url_3?: string;
  video_name_1?: string;
  video_name_2?: string;
  video_name_3?: string;
  videos?: Record<string, { name: string; url: string }>;
  
  document_url_1?: string;
  document_url_2?: string;
  document_url_3?: string;
  document_url_4?: string;
  document_url_5?: string;
  document_name_1?: string;
  document_name_2?: string;
  document_name_3?: string;
  document_name_4?: string;
  document_name_5?: string;
  documents?: Record<string, { name: string; url: string }>;
  
  // Sources
  source_url?: string;
  sources_consulted?: string[];
  
  // Scores & Status
  completeness_score?: number;
  data_quality_score?: number;
  enrichment_status: string;
  workflow_stage?: string;
  
  // Metadata
  meta_title?: string;
  meta_description?: string;
  search_keywords?: string;
  
  // Pricing
  currency?: string;
  base_price?: number;
  sale_price?: number;
  list_price?: number;
  
  // Physical
  weight?: string;
  weight_unit?: string;
  length?: string;
  width?: string;
  height?: string;
  dimension_unit?: string;
  country_of_origin?: string;
  warranty?: string;
  
  // Business
  vendor_id?: string;
  vendor_name?: string;
  vendor_code?: string;
  industry_id?: string;
  industry_name?: string;
  industry_code?: string;
  product_type?: string;
  lifecycle_stage?: string;
  launch_date?: string;
  discontinue_status?: string;
  
  // Other
  certification?: string;
  safety_standard?: string;
  hazardous_material?: string;
  prop65_warning?: string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  needs_enrichment?: boolean;
  ready_for_export?: boolean;
  manual_edit_count?: number;
  aggregation_index?: number;
  routed_to_enrichment_at?: string | null;
  used_llms?: string[];
  last_algorithm_used?: string | null;
}

export interface AttributeValue {
  name?: string;
  value: string;
  unit?: string | null;
  uom?: string | null;
  confidence?: number;
  sources?: string[];
  extraction_algorithm?: string;
}

export interface Source {
  id: string;
  source_type: string;
  source_url: string;
  project_id: string;
  status: string;
  content_data?: any;
  source_metadata?: Record<string, any>;
  uploaded_at?: string;
  created_at?: string;
}
export interface ManualProductData {
  brand: string;
  title: string;
  manufacturer: string;
  sku: string;
  mpn: string;
  model: string;
  upc_ean_gtin: string;
  variant_sku: string;
  variant_mpn: string;
  variant_model: string;
  taxonomy: string;
  price: string;
  stock: string;
}
export type OperationMode='aggregation'|'cleaning'|'enrichment'|'pdf_extraction'
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalProducts: number;
  publishedProducts: number;
  catalogHealth: number;
  totalBrands?: number;
totalCategories?: number;
}
export interface TimelineParams {
  projectId?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}
export interface BrandFlowParams {
  projectId?: string;
  startDate?: string;
  endDate?: string;
}
export interface CategoryParams {
  projectId?: string;
  startDate?: string;
  endDate?: string;
} 
export interface BrandAttributesParams {
  projectId?: string;
  startDate?: string;
  endDate?: string;
}
export type UserRole = "admin" | "editor" | "viewer";
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
}
export interface ProjectWithStats {
  id: string;
  name: string;
  client?: string;
  status: string;
  totalProducts: number;
  aggregatedProducts: number;
  pendingProducts: number;
  failedProducts: number;
  aggregationStatus: string;
  algorithm_used?: string;  
}
export interface AggregationJob {
  id: string;
  project_id: string;
  status: string;
  total_products: number;
  successful: number;
  failed: number;
  progress_percent?: number;
  progress_percentage?: number;
  job_id?: string;  // ← ADD THIS
  current_product?: string;
  error_message?: string;
}
export type ProjectStatus = "in_progress" | "partially_completed" | "completed" | "failed" | "yet_to_start";
export interface ProjectOverview {
  id: string;
  name: string;
  import_file_name?: string;
source_processing_status?: string;
  description?: string;
  totalProducts: number;
  aggregated: number;
  enrichment: number;
  cleaning: number;
  enrichmentFailed?: number;
  aggregationFailed?: number;
  overallPct: number;
  status: ProjectStatus;
  lastActive: string;
  operationMode?: string;
  useCase?: string;
}
export type DateRangeParams = {
  start_date?: string;
  user_id?: string; 
  end_date?: string;
  date_field?: "created_at" | "updated_at";
};
export interface ExpandedStats {
  success: number;
  failed: number;
  pending: number;
}

export interface ProjectsTableProps {
  projects: Project[];
  loading: boolean;
  selectedProjectIds: Set<string>;
  aggregatingProjects: Set<string>;
  projectEnrichmentCounts: Record<string, number>;
  onToggleSelectAll: () => void;
  onToggleProjectSelection: (projectId: string, e?: React.MouseEvent) => void;
  onSelectProject: (projectId: string) => void;
  selectedProjectId: string | null;
}

export interface ProjectProductsViewProps {
  project: Project;
  products: Product[];
  loading: boolean;
  expandedStats: ExpandedStats;
  statusFilter: Set<string>;
  selectedProductIds: Set<string>;
  isExpandedProjectSelected: boolean;
  aggregatingProjects: Set<string>;
  extractingPdf: Set<string>;
  currentPage: number;
  totalPages: number;
  paginatedProducts: Product[];
  filteredExpandedProducts: Product[];
  startIndex: number;
  onClose: () => void;
  onToggleStatusFilter: (status: "completed" | "failed" | "pending") => void;
  onSelectAllProducts: (checked: boolean) => void;
  onToggleProductSelection: (productId: string, checked: boolean) => void;
  onViewAttributes: (productId: string) => void;
  onAggregateAll: () => void;
  onExtractAll: () => void;
  onAggregate: (productId: string) => void;
  onExtractFreshMpn: (productId: string, mpn: string) => void;
  onExtractFromPdf: (productId: string, mpn: string) => void;
  onBlindExtract: (productId: string) => void;
  onPageChange: (page: number) => void;
  selectedProductId: string | null;
}

export interface ProductAttributesViewProps {
  isOpen: boolean;
  product: Product | undefined;
  attributes: AggregatedAttribute[];
  loading: boolean;
  project: Project | undefined;
  onClose: () => void;
  onAggregate: (productId: string) => void;
  onBack: () => void;
}

export interface FiltersBarProps {
  selectedLLM: string;
  llmOptions: Array<{ value: string; label: string }>;
  selectedUseCase: string;
  useCases: string[];
  selectedProjectId: string;
  filteredProjects: Project[];
  projectStatusFilter: string;
  categoryFilter: string;
  availableCategories: string[];
  brandFilter: string;
  availableBrands: string[];
  statusFilter: Set<string>;
  onLLMChange: (value: string) => void;
  onUseCaseChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onProjectStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onReset: () => void;
  showReset: boolean;
}
export interface EnrichmentTabProps {
  projectId?: string;
  initialFilter?: string;
  onNavigate?: (tab: string, filterStatus?: string) => void;
  onNavigateToProject?: (tab: string, projectId: string) => void;  
}
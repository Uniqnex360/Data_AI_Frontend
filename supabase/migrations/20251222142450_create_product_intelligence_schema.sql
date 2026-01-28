/*
  # Product Intelligence & Catalog Automation Platform Schema

  ## Overview
  Multi-layer data processing system for product catalog management with full lineage tracking.

  ## New Tables
  
  ### 1. `sources`
  Tracks all data sources (web, PDF, Excel, CSV, images)
  - `id` (uuid, primary key)
  - `source_type` (text) - web, pdf, excel, csv, image
  - `source_url` (text) - URL or filename
  - `uploaded_at` (timestamptz)
  - `metadata` (jsonb) - additional source info
  - `status` (text) - pending, processing, completed, failed
  
  ### 2. `raw_extractions`
  Unmodified extracted data preserving original values
  - `id` (uuid, primary key)
  - `source_id` (uuid, foreign key)
  - `product_keys` (jsonb) - SKU, MPN, Brand identifiers
  - `raw_attributes` (jsonb) - all extracted attributes
  - `confidence` (numeric) - extraction confidence 0-1
  - `extracted_at` (timestamptz)
  
  ### 3. `products`
  Core product registry
  - `id` (uuid, primary key)
  - `sku` (text, unique)
  - `mpn` (text)
  - `brand` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. `aggregated_attributes`
  Merged data from multiple sources with conflict tracking
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `attribute_name` (text)
  - `values` (jsonb) - array of {value, source_id, confidence}
  - `has_conflict` (boolean)
  - `aggregated_at` (timestamptz)
  
  ### 5. `cleansing_issues`
  Data quality issues identified during cleansing
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `attribute_name` (text)
  - `issue_type` (text) - invalid, duplicate, missing, inconsistent
  - `details` (text)
  - `resolved` (boolean)
  - `detected_at` (timestamptz)
  
  ### 6. `standardized_attributes`
  Normalized and standardized product attributes
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `attribute_name` (text)
  - `standard_value` (text)
  - `standard_format` (text)
  - `derived_from` (jsonb) - array of source IDs
  - `standardized_at` (timestamptz)
  
  ### 7. `business_rules`
  Configurable validation rules
  - `id` (uuid, primary key)
  - `rule_id` (text, unique)
  - `attribute_name` (text)
  - `rule_type` (text) - validation, enum, range, format
  - `rule_config` (jsonb)
  - `active` (boolean)
  - `created_at` (timestamptz)
  
  ### 8. `rule_validations`
  Results of business rule execution
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `rule_id` (text)
  - `status` (text) - pass, fail
  - `reason` (text)
  - `validated_at` (timestamptz)
  
  ### 9. `enrichments`
  Generated content and inferred attributes
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `seo_title` (text)
  - `bullets` (jsonb)
  - `tags` (jsonb)
  - `inferred_attributes` (jsonb)
  - `enriched_at` (timestamptz)
  
  ### 10. `golden_records`
  Final publishable product records
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key, unique)
  - `sku` (text)
  - `brand` (text)
  - `attributes` (jsonb)
  - `assets` (jsonb)
  - `enrichment` (jsonb)
  - `ready_for_publish` (boolean)
  - `published_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 11. `audit_trail`
  Complete lineage tracking for all decisions
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `attribute_name` (text)
  - `selected_value` (text)
  - `source_used` (text)
  - `reason` (text)
  - `stage` (text) - extraction, aggregation, cleansing, standardization, enrichment
  - `logged_at` (timestamptz)

  ## Security
  Enable RLS on all tables with authenticated user access policies
*/

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('web', 'pdf', 'excel', 'csv', 'image')),
  source_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sources"
  ON sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sources"
  ON sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sources"
  ON sources FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Raw extractions table
CREATE TABLE IF NOT EXISTS raw_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  product_keys jsonb NOT NULL,
  raw_attributes jsonb NOT NULL,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  extracted_at timestamptz DEFAULT now()
);

ALTER TABLE raw_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view raw_extractions"
  ON raw_extractions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert raw_extractions"
  ON raw_extractions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  mpn text,
  brand text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Aggregated attributes table
CREATE TABLE IF NOT EXISTS aggregated_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  attribute_name text NOT NULL,
  values jsonb NOT NULL,
  has_conflict boolean DEFAULT false,
  aggregated_at timestamptz DEFAULT now()
);

ALTER TABLE aggregated_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view aggregated_attributes"
  ON aggregated_attributes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert aggregated_attributes"
  ON aggregated_attributes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update aggregated_attributes"
  ON aggregated_attributes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Cleansing issues table
CREATE TABLE IF NOT EXISTS cleansing_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  attribute_name text NOT NULL,
  issue_type text CHECK (issue_type IN ('invalid', 'duplicate', 'missing', 'inconsistent')),
  details text,
  resolved boolean DEFAULT false,
  detected_at timestamptz DEFAULT now()
);

ALTER TABLE cleansing_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cleansing_issues"
  ON cleansing_issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cleansing_issues"
  ON cleansing_issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cleansing_issues"
  ON cleansing_issues FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Standardized attributes table
CREATE TABLE IF NOT EXISTS standardized_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  attribute_name text NOT NULL,
  standard_value text,
  standard_format text,
  derived_from jsonb DEFAULT '[]'::jsonb,
  standardized_at timestamptz DEFAULT now()
);

ALTER TABLE standardized_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view standardized_attributes"
  ON standardized_attributes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert standardized_attributes"
  ON standardized_attributes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update standardized_attributes"
  ON standardized_attributes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Business rules table
CREATE TABLE IF NOT EXISTS business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text UNIQUE NOT NULL,
  attribute_name text NOT NULL,
  rule_type text CHECK (rule_type IN ('validation', 'enum', 'range', 'format')),
  rule_config jsonb NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view business_rules"
  ON business_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert business_rules"
  ON business_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update business_rules"
  ON business_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rule validations table
CREATE TABLE IF NOT EXISTS rule_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rule_id text,
  status text CHECK (status IN ('pass', 'fail')),
  reason text,
  validated_at timestamptz DEFAULT now()
);

ALTER TABLE rule_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rule_validations"
  ON rule_validations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rule_validations"
  ON rule_validations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enrichments table
CREATE TABLE IF NOT EXISTS enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  seo_title text,
  bullets jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  inferred_attributes jsonb DEFAULT '{}'::jsonb,
  enriched_at timestamptz DEFAULT now()
);

ALTER TABLE enrichments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view enrichments"
  ON enrichments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enrichments"
  ON enrichments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update enrichments"
  ON enrichments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Golden records table
CREATE TABLE IF NOT EXISTS golden_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  brand text,
  attributes jsonb DEFAULT '{}'::jsonb,
  assets jsonb DEFAULT '{}'::jsonb,
  enrichment jsonb DEFAULT '{}'::jsonb,
  ready_for_publish boolean DEFAULT false,
  published_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE golden_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view golden_records"
  ON golden_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert golden_records"
  ON golden_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update golden_records"
  ON golden_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  attribute_name text,
  selected_value text,
  source_used text,
  reason text,
  stage text CHECK (stage IN ('extraction', 'aggregation', 'cleansing', 'standardization', 'enrichment')),
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit_trail"
  ON audit_trail FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit_trail"
  ON audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_extractions_source_id ON raw_extractions(source_id);
CREATE INDEX IF NOT EXISTS idx_aggregated_attributes_product_id ON aggregated_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_cleansing_issues_product_id ON cleansing_issues(product_id);
CREATE INDEX IF NOT EXISTS idx_standardized_attributes_product_id ON standardized_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_rule_validations_product_id ON rule_validations(product_id);
CREATE INDEX IF NOT EXISTS idx_enrichments_product_id ON enrichments(product_id);
CREATE INDEX IF NOT EXISTS idx_golden_records_product_id ON golden_records(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_product_id ON audit_trail(product_id);
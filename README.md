# Product Intelligence & Catalog Automation Platform

A comprehensive product data management system with multi-layer data processing and full lineage tracking.

## Architecture

```
Sources (Web | PDF | Excel | CSV | Images)
              ↓
Extraction Layer (LLM + Parsers)
              ↓
Raw Data Store (with lineage)
              ↓
Aggregation Engine (Rules + LLM reasoning)
              ↓
Cleansing & Standardization Engine
              ↓
Enrichment Engine
              ↓
Unified Product API
              ↓
UI (Tabs / Screens)
```

## Features

### 1. Data Extraction
- Multi-source ingestion (Web, PDF, Excel, CSV, Images)
- Preserves raw data without modification
- Tracks source metadata and confidence scores

### 2. Aggregation
- Merges data from multiple sources
- Detects conflicts between sources
- Maintains source trust hierarchy (Excel > PDF > Web > Image)

### 3. Cleansing
- Identifies data quality issues
- Detects invalid, duplicate, missing, and inconsistent values
- Provides resolution tracking

### 4. Standardization
- Unit conversion and normalization
- Controlled vocabulary mapping
- Format standardization

### 5. Business Rules
- Configurable validation rules
- Support for validation, enum, range, and format rules
- Real-time rule execution and reporting

### 6. Enrichment
- SEO title generation
- Bullet point creation
- Tag generation
- Attribute inference based on existing data

### 7. Golden Records
- Final publishable product records
- Combines standardized data with enrichments
- Publication workflow management

### 8. Audit Trail
- Complete lineage tracking
- Decision explanations at every stage
- Source attribution for all values

## Usage

### Step 1: Extract Data
Navigate to the **Sources** tab and input product data. The system supports various formats:

```
SKU: ABC123
Brand: Example Brand
Price: 99.99
Description: Sample product description
Dimensions: 10cm x 20cm x 5cm
```

### Step 2: Aggregate
Go to the **Aggregation** tab, select a product, and click "Aggregate Data" to merge data from multiple sources.

### Step 3: Review Quality Issues
Check the **Cleansing** tab for any data quality issues detected during processing.

### Step 4: Standardize
In the **Standardization** tab, normalize attributes using standard formats and units.

### Step 5: Validate
Configure and apply business rules in the **Business Rules** tab to ensure data quality.

### Step 6: Enrich
Generate marketing content and infer additional attributes in the **Enrichment** tab.

### Step 7: Publish
Review golden records in the **Golden Records** tab and publish to production.

### Step 8: Audit
Track all processing decisions and data lineage in the **Audit Trail** tab.

## Database Schema

The system uses Supabase PostgreSQL with the following main tables:
- `sources` - Data source tracking
- `raw_extractions` - Unmodified extracted data
- `products` - Core product registry
- `aggregated_attributes` - Merged multi-source data
- `cleansing_issues` - Data quality tracking
- `standardized_attributes` - Normalized data
- `business_rules` - Validation rules
- `rule_validations` - Rule execution results
- `enrichments` - Generated content
- `golden_records` - Final publishable records
- `audit_trail` - Complete lineage tracking

## Key Principles

1. **Never Invent Values** - Only use data from verified sources
2. **Preserve Lineage** - Track every decision and data transformation
3. **Never Overwrite Raw Data** - Original data remains untouched
4. **Explainable Decisions** - Every choice has a documented reason
5. **Reversible Operations** - Audit trail enables rollback

## Technology Stack

- React + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Vite

## Development

```bash
npm install
npm run dev
npm run build
```

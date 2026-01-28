import { useState, useEffect } from 'react';
import { Upload, FileText, Globe, FileSpreadsheet, Image, CheckCircle, XCircle, Clock, Download, Plus, Edit } from 'lucide-react';
import { extractionService } from '../services/extractionService';
import type { Source } from '../types/database.types';

interface ManualProductData {
  brand: string;
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

export default function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'manual' | 'bulk'>('manual');
  const [manualData, setManualData] = useState<ManualProductData>({
    brand: '',
    manufacturer: '',
    sku: '',
    mpn: '',
    model: '',
    upc_ean_gtin: '',
    variant_sku: '',
    variant_mpn: '',
    variant_model: '',
    taxonomy: '',
    price: '',
    stock: ''
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const data = await extractionService.getAllSources();
      setSources(data);
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualData.sku || !manualData.brand) {
      alert('SKU and Brand are required fields');
      return;
    }

    setLoading(true);
    try {
      const content = Object.entries(manualData)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      await extractionService.extractFromSource({
        sourceType: 'excel',
        content,
        sourceUrl: `manual-input-${manualData.sku}`
      });

      setManualData({
        brand: '',
        manufacturer: '',
        sku: '',
        mpn: '',
        model: '',
        upc_ean_gtin: '',
        variant_sku: '',
        variant_mpn: '',
        variant_model: '',
        taxonomy: '',
        price: '',
        stock: ''
      });

      await loadSources();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const text = await bulkFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      let successCount = 0;
      let failedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const rowData: Record<string, string> = {};

        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        if (rowData.sku && rowData.brand) {
          try {
            const content = Object.entries(rowData)
              .filter(([_, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n');

            await extractionService.extractFromSource({
              sourceType: 'csv',
              content,
              sourceUrl: `bulk-import-${rowData.sku}`
            });

            successCount++;
          } catch (error) {
            failedCount++;
            console.error(`Failed to import row ${i}:`, error);
          }
        } else {
          failedCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount });
      setBulkFile(null);
      await loadSources();
    } catch (error) {
      console.error('Bulk upload failed:', error);
      alert('Bulk upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Brand',
      'Manufacturer',
      'SKU',
      'MPN',
      'Model',
      'UPC_EAN_GTIN',
      'Variant_SKU',
      'Variant_MPN',
      'Variant_Model',
      'Taxonomy',
      'Price',
      'Stock'
    ];

    const sampleRow = [
      'Example Brand',
      'Example Manufacturer',
      'SKU-001',
      'MPN-001',
      'Model-X',
      '123456789012',
      'VAR-SKU-001',
      'VAR-MPN-001',
      'Variant-Model-A',
      'Electronics > Computers',
      '99.99',
      '100'
    ];

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-1">Product Input & Data Sources</h3>
        <p className="text-sm text-slate-600">Add products manually or import in bulk via CSV</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'manual'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Edit className="w-4 h-4" />
          Manual Input
        </button>
        <button
          onClick={() => setActiveMode('bulk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'bulk'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Bulk Import
        </button>
      </div>

      {activeMode === 'manual' ? (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Add Product Manually</h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brand <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={manualData.brand}
                onChange={(e) => setManualData({ ...manualData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Apple"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Manufacturer
              </label>
              <input
                type="text"
                value={manualData.manufacturer}
                onChange={(e) => setManualData({ ...manualData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Foxconn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SKU <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={manualData.sku}
                onChange={(e) => setManualData({ ...manualData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., IPHN14-BLK-128"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                MPN
              </label>
              <input
                type="text"
                value={manualData.mpn}
                onChange={(e) => setManualData({ ...manualData, mpn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., MPN123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={manualData.model}
                onChange={(e) => setManualData({ ...manualData, model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., iPhone 14"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                UPC/EAN/GTIN
              </label>
              <input
                type="text"
                value={manualData.upc_ean_gtin}
                onChange={(e) => setManualData({ ...manualData, upc_ean_gtin: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 123456789012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variant SKU
              </label>
              <input
                type="text"
                value={manualData.variant_sku}
                onChange={(e) => setManualData({ ...manualData, variant_sku: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., VAR-SKU-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variant MPN
              </label>
              <input
                type="text"
                value={manualData.variant_mpn}
                onChange={(e) => setManualData({ ...manualData, variant_mpn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., VAR-MPN-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variant Model
              </label>
              <input
                type="text"
                value={manualData.variant_model}
                onChange={(e) => setManualData({ ...manualData, variant_model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Black 128GB"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Taxonomy
              </label>
              <input
                type="text"
                value={manualData.taxonomy}
                onChange={(e) => setManualData({ ...manualData, taxonomy: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Electronics > Mobile Phones"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Price
              </label>
              <input
                type="text"
                value={manualData.price}
                onChange={(e) => setManualData({ ...manualData, price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 999.99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Stock
              </label>
              <input
                type="text"
                value={manualData.stock}
                onChange={(e) => setManualData({ ...manualData, stock: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100"
              />
            </div>
          </div>

          <button
            onClick={handleManualSubmit}
            disabled={loading || !manualData.sku || !manualData.brand}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Adding Product...' : 'Add Product'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Bulk Import via CSV</h4>

          <div className="mb-4">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Download the template, fill it with your product data, and upload it below
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {bulkFile && (
              <p className="text-sm text-green-600 mt-2">
                Selected: {bulkFile.name}
              </p>
            )}
          </div>

          <button
            onClick={handleBulkUpload}
            disabled={loading || !bulkFile}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {loading ? 'Importing...' : 'Import Products'}
          </button>

          {importResults && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-blue-900 mb-2">Import Results</h5>
              <p className="text-sm text-blue-700">
                Successfully imported: {importResults.success} products
              </p>
              {importResults.failed > 0 && (
                <p className="text-sm text-red-600">
                  Failed: {importResults.failed} products
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Import History</h3>

        <div className="space-y-2">
          {sources.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No imports yet. Add products to get started.</p>
            </div>
          ) : (
            sources.map(source => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {source.source_url}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(source.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${source.status === 'completed' ? 'bg-green-100 text-green-700' :
                      source.status === 'failed' ? 'bg-red-100 text-red-700' :
                      source.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'}
                  `}>
                    {source.status}
                  </span>
                  {getStatusIcon(source.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Globe, FileSpreadsheet, Image, CheckCircle, XCircle, Clock, Download, Plus, Edit } from 'lucide-react';
import { extractionService } from '../services/extractionService';
import type { Source } from '../types/database.types';
import { notify } from '../lib/notifications.ts';
import { getStatusIcon } from '../utils/statusIcon';
interface ManualProductData {
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
export default function SourcesTab({ projectId }: { projectId?: string }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMode, setActiveMode] = useState<'manual' | 'bulk'>('bulk');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualData, setManualData] = useState<ManualProductData>({
    brand: '',
    title: "",
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
const [importResults, setImportResults] = useState<{ success: number; failed: number; status: string } | null>(null);
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
 const pollBatchStatus = async (batchId: string) => {
  const maxAttempts = 60; 
  let attempts = 0;

  const poll = async () => {
    try {
      const response = await extractionService.getBatchStatus(batchId);
      const { status, metadata } = response;

      if (status === 'completed') {
        // Notification for Success
        notify.success(
          'Import Finished', 
          `Successfully processed ${metadata?.successful || 0} products.`
        );
        
        setImportResults({
          success: metadata?.successful || 0,
          failed: metadata?.failed || 0,
          status: status
        });
        await loadSources(); 
        return;
      }

      if (status === 'failed') {
        // Notification for Failure
        notify.error(
          'Import Failed', 
          metadata?.error_message || 'An error occurred during processing.'
        );
        
        setImportResults({
          success: metadata?.successful || 0,
          failed: metadata?.failed || 0,
          status: status
        });
        await loadSources();
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); 
      } else {
        notify.error('Polling Timeout', 'The import is taking longer than expected. Please check back later.');
      }
    } catch (error) {
      console.error('Failed to poll batch status:', error);
      notify.error('Connection Error', 'Lost connection while checking import status.');
    }
  };

  poll();
};
  const handleManualSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!manualData.mpn) newErrors.mpn = "MPN is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      notify.error('Missing required fields', 'Please fill MPN')
    }
    setErrors({})
    setLoading(true);
    try {
      const content = Object.entries(manualData)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      await extractionService.extractFromSource({
        sourceType: 'excel',
        content,
        sourceUrl: `manual-input-${manualData.sku}`,
        projectId: projectId
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
      notify.success('Product added successfully!');
    } catch (error) {
      console.error('Failed to add product:', error);
      notify.error('Failed to add product');
    } finally {
      setLoading(false);
    }
  };
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      notify.info('Please select a file');
      return;
    }
     const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  
  const fileExtension = bulkFile.name.substring(bulkFile.name.lastIndexOf('.')).toLowerCase();
  if (!validTypes.includes(bulkFile.type) && !validExtensions.includes(fileExtension)) {
    notify.error('Invalid file type', 'Please upload CSV or Excel files only');
    return;
  }
    if (!projectId) {
    notify.error('Please select a project first before uploading');
    return;
  }
    setLoading(true);
    try {
      const result = await extractionService.batchAggregate(bulkFile, projectId);
      setBulkFile(null);
       if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        notify.success('Upload Successful', 'File accepted. Processing in background...');

      setImportResults({
        success: 0,
        failed: 0
      });
      setBulkFile(null);
      pollBatchStatus(result.batch_id);
      await loadSources();

    } catch (error) {
      console.error('Bulk upload failed:', error);
      notify.error('Bulk upload failed');
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
        <p className="text-sm text-slate-600">Import in bulk via CSV or add products manually</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setActiveMode('bulk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeMode === 'bulk'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Bulk Import
        </button>
        <button
          onClick={() => setActiveMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeMode === 'manual'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
        >
          <Edit className="w-4 h-4" />
          Manual Input
        </button>

      </div>
      {activeMode === 'manual' ? (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Add Product Manually</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={manualData.title}
                onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., iPhone 16 pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brand
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
                SKU
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
                MPN<span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={manualData.mpn}
                onChange={(e) => setManualData({ ...manualData, mpn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., MPN123456"
              />
              {errors.mpn && (
                <p className="text-red-500 text-sm mt-1">{errors.mpn}</p>
              )}
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
            {/* <div>
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
              </div> */}
            {/* <div>
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
              </div> */}
            {/* <div>
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
              </div> */}
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
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Adding Product...' : 'Add Product'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Bulk Import via CSV or Excel</h4>
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
              Upload CSV or Excel File
            </label>
            <input
              type="file"
              ref={fileInputRef} 
              accept=".csv, .xlsx, .xls"
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
          {/* {importResults && (
  <div className={`mt-4 p-4 rounded-lg border ${
    importResults.status === 'completed' ? 'bg-green-50 border-green-200' :
    importResults.status === 'processing' ? 'bg-blue-50 border-blue-200' :
    'bg-red-50 border-red-200'
  }`}>
    <h5 className={`font-semibold mb-2 ${
      importResults.status === 'completed' ? 'text-green-900' :
      importResults.status === 'processing' ? 'text-blue-900' :
      'text-red-900'
    }`}>
      {importResults.status === 'processing' ? 'Processing...' : 'Import Results'}
    </h5>
    {importResults.status === 'completed' && (
      <>
        <p className="text-sm text-green-700">
          Successfully imported: {importResults.success} products
        </p>
        {importResults.failed > 0 && (
          <p className="text-sm text-red-600">
            Failed: {importResults.failed} products
          </p>
        )}
      </>
    )}
    {importResults.status === 'processing' && (
      <p className="text-sm text-blue-700">
        <Clock className="inline w-3 h-3 animate-spin mr-1" />
        Processing products in background...
      </p>
    )}
  </div>
)} */}
        </div>
      )}
      {/* <div>
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
        </div> */}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, GitMerge } from 'lucide-react';
import { aggregationService } from '../services/aggregationService';
import type { Product, AggregatedAttribute } from '../types/database.types';

export default function AggregationTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<AggregatedAttribute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadAttributes(selectedProduct);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const data = await aggregationService.getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadAttributes = async (productId: string) => {
    try {
      const data = await aggregationService.getAggregatedAttributes(productId);
      setAttributes(data);
    } catch (error) {
      console.error('Failed to load attributes:', error);
    }
  };

  const handleAggregate = async (productId: string) => {
    setLoading(true);
    try {
      await aggregationService.aggregateProductData(productId);
      await loadAttributes(productId);
    } catch (error) {
      console.error('Aggregation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Products</h3>
          <div className="space-y-2">
            {products.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">No products found</p>
              </div>
            ) : (
              products.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${selectedProduct === product.id
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <p className="font-medium text-sm">{product.sku}</p>
                  {product.brand && (
                    <p className="text-xs text-slate-600 mt-1">{product.brand}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="col-span-2">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Aggregated Attributes</h3>
                <button
                  onClick={() => handleAggregate(selectedProduct)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <GitMerge className="w-4 h-4" />
                  {loading ? 'Aggregating...' : 'Aggregate Data'}
                </button>
              </div>

              <div className="space-y-3">
                {attributes.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <GitMerge className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">No aggregated data yet</p>
                    <p className="text-sm text-slate-500 mt-1">Click Aggregate Data to merge sources</p>
                  </div>
                ) : (
                  attributes.map(attr => (
                    <div
                      key={attr.id}
                      className={`
                        p-4 rounded-lg border
                        ${attr.has_conflict
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-white border-slate-200'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900">{attr.attribute_name}</h4>
                          {attr.has_conflict ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        {attr.has_conflict && (
                          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            Conflict Detected
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {attr.values.map((val, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-sm"
                          >
                            <span className="text-slate-900">{val.value}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Confidence: {(val.confidence * 100).toFixed(0)}%
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                                {val.source_id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200">
              <GitMerge className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select a product to view aggregated data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

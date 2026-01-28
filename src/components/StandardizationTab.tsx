import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { aggregationService } from '../services/aggregationService';
import { standardizationService } from '../services/standardizationService';
import type { Product, StandardizedAttribute } from '../types/database.types';

export default function StandardizationTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<StandardizedAttribute[]>([]);
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
      const data = await standardizationService.getStandardizedAttributes(productId);
      setAttributes(data);
    } catch (error) {
      console.error('Failed to load attributes:', error);
    }
  };

  const handleStandardize = async (productId: string) => {
    setLoading(true);
    try {
      await standardizationService.performStandardization(productId);
      await loadAttributes(productId);
    } catch (error) {
      console.error('Standardization failed:', error);
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
            {products.map(product => (
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
            ))}
          </div>
        </div>

        <div className="col-span-2">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Standardized Attributes</h3>
                <button
                  onClick={() => handleStandardize(selectedProduct)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Standardizing...' : 'Standardize Data'}
                </button>
              </div>

              <div className="space-y-3">
                {attributes.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">No standardized data yet</p>
                    <p className="text-sm text-slate-500 mt-1">Click Standardize Data to normalize attributes</p>
                  </div>
                ) : (
                  attributes.map(attr => (
                    <div key={attr.id} className="p-4 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-slate-900">{attr.attribute_name}</h4>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Standardized
                        </span>
                      </div>

                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Standard Value</p>
                          <p className="font-medium text-slate-900">{attr.standard_value}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Format</p>
                          <p className="font-mono text-sm text-blue-600">{attr.standard_format}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          Derived from {attr.derived_from.length} source(s)
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200">
              <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select a product to view standardized data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

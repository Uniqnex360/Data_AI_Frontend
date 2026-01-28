import { useState, useEffect } from 'react';
import { Target, Sparkles } from 'lucide-react';
import { aggregationService } from '../services/aggregationService';
import { enrichmentService } from '../services/enrichmentService';
import type { Product, Enrichment } from '../types/database.types';

export default function EnrichmentTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadEnrichment(selectedProduct);
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

  const loadEnrichment = async (productId: string) => {
    try {
      const data = await enrichmentService.getEnrichment(productId);
      setEnrichment(data);
    } catch (error) {
      console.error('Failed to load enrichment:', error);
    }
  };

  const handleEnrich = async (productId: string) => {
    setLoading(true);
    try {
      await enrichmentService.enrichProduct(productId);
      await loadEnrichment(productId);
    } catch (error) {
      console.error('Enrichment failed:', error);
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
                <h3 className="text-lg font-semibold text-slate-900">Enrichment Data</h3>
                <button
                  onClick={() => handleEnrich(selectedProduct)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Enriching...' : 'Enrich Product'}
                </button>
              </div>

              {!enrichment ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                  <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">No enrichment data yet</p>
                  <p className="text-sm text-slate-500 mt-1">Click Enrich Product to generate content</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">SEO Title</h4>
                    <p className="text-slate-700">{enrichment.seo_title}</p>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-3">Bullet Points</h4>
                    <ul className="space-y-2">
                      {enrichment.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></span>
                          <span className="text-sm text-slate-700">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {enrichment.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-3">Inferred Attributes</h4>
                    <div className="space-y-2">
                      {Object.entries(enrichment.inferred_attributes).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm font-medium text-slate-700">{key}</span>
                          <span className="text-sm text-slate-600">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200">
              <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select a product to view enrichment data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

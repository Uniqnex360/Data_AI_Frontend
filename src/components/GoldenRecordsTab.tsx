import { useState, useEffect } from 'react';
import { Database, Send, CheckCircle, XCircle } from 'lucide-react';
import { goldenRecordService } from '../services/goldenRecordService';
import type { GoldenRecord } from '../types/database.types';

export default function GoldenRecordsTab() {
  const [records, setRecords] = useState<GoldenRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GoldenRecord | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await goldenRecordService.getAllGoldenRecords();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load golden records:', error);
    }
  };

  const handlePublish = async (productId: string) => {
    try {
      await goldenRecordService.publishGoldenRecord(productId);
      await loadRecords();
    } catch (error) {
      console.error('Failed to publish record:', error);
    }
  };

  const publishableCount = records.filter(r => r.ready_for_publish && !r.published_at).length;
  const publishedCount = records.filter(r => r.published_at).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Total Records</p>
          <p className="text-2xl font-bold text-blue-900">{records.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Ready to Publish</p>
          <p className="text-2xl font-bold text-green-900">{publishableCount}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium mb-1">Published</p>
          <p className="text-2xl font-bold text-purple-900">{publishedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Golden Records</h3>
          <div className="space-y-2">
            {records.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">No records found</p>
              </div>
            ) : (
              records.map(record => (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${selectedRecord?.id === record.id
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{record.sku}</p>
                    {record.ready_for_publish ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {record.brand && (
                    <p className="text-xs text-slate-600">{record.brand}</p>
                  )}
                  {record.published_at && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                      Published
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="col-span-2">
          {selectedRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedRecord.sku}</h3>
                  <p className="text-sm text-slate-600">{selectedRecord.brand}</p>
                </div>
                {selectedRecord.ready_for_publish && !selectedRecord.published_at && (
                  <button
                    onClick={() => handlePublish(selectedRecord.product_id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Publish to Production
                  </button>
                )}
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">Attributes</h4>
                <div className="space-y-2">
                  {Object.entries(selectedRecord.attributes).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-start justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm font-medium text-slate-700">{key}</span>
                      <span className="text-sm text-slate-600 text-right max-w-md">
                        {typeof value === 'object' ? value.value : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">Enrichment</h4>
                {selectedRecord.enrichment && typeof selectedRecord.enrichment === 'object' && (
                  <div className="space-y-3">
                    {(selectedRecord.enrichment as any).seo_title && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">SEO Title</p>
                        <p className="text-sm text-slate-900">{(selectedRecord.enrichment as any).seo_title}</p>
                      </div>
                    )}
                    {(selectedRecord.enrichment as any).bullets && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Bullets</p>
                        <ul className="space-y-1">
                          {(selectedRecord.enrichment as any).bullets.map((bullet: string, idx: number) => (
                            <li key={idx} className="text-sm text-slate-700">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Publication Status</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedRecord.published_at
                        ? `Published on ${new Date(selectedRecord.published_at).toLocaleString()}`
                        : selectedRecord.ready_for_publish
                        ? 'Ready for publication'
                        : 'Not ready for publication'
                      }
                    </p>
                  </div>
                  {selectedRecord.ready_for_publish ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-amber-600" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200">
              <Database className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select a golden record to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

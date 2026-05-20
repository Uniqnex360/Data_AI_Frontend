import { useState, useEffect, useMemo } from "react";
import { X, ExternalLink, Link2, ChevronDown, ChevronRight, Database, Globe, Clock } from "lucide-react";
import { aggregationService } from "../services/aggregationService";

interface ExtractedAttribute {
  name: string;
  value: string;
  unit: string | null;
  raw_text: string;
  confidence: number;
}

interface SourceLog {
  url: string;
  attributes: ExtractedAttribute[];
  extracted_at: string | null;
}

interface FinalAttribute {
  value: string;
  unit: string | null;
  confidence: number;
  sources: string[];
}

interface LogData {
  product_name: string;
  product_code: string;
  image_url: string | null;
  sources_consulted: string[];
  source_logs: SourceLog[];
  final_attributes: Record<string, FinalAttribute>;
}

interface ProductLogDrawerProps {
  productId: string;
  productName: string;
  productCode: string;
  productImage?: string;
  onClose: () => void;
}

const SOURCE_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500", header: "bg-blue-50/80" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", header: "bg-amber-50/80" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", header: "bg-emerald-50/80" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500", header: "bg-rose-50/80" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500", header: "bg-purple-50/80" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500", header: "bg-cyan-50/80" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", header: "bg-orange-50/80" },
  { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500", header: "bg-pink-50/80" },
];

function getSourceColor(index: number) {
  return SOURCE_COLORS[index % SOURCE_COLORS.length];
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getShortName(url: string): string {
  const hostnames: Record<string, string> = {
    "graco.com": "Product Page",
    "fastoolnow.com": "Fastoolnow",
    "autotoolworld.com": "AutoTool World",
    "applied.com": "Applied.com",
    "innoflo.com": "Innoflo",
    "amazon.com": "Amazon Listing",
    "homedepot.com": "Home Depot",
    "lowes.com": "Lowes",
    "northerntool.com": "Northern Tool",
    "dewalt.com": "DeWalt Official",
    "raptorsupplies.com": "Raptor Supplies",
    "mrostop.com": "MRO Stop",
    "bestbuy.com": "Best Buy Listing",
    "rtings.com": "RTINGS.com Review",
    "techradar.com": "TechRadar Editorial",
    "sprayersandparts.com": "Sprayers & Parts",
    "hydrotechnologysystems.supply": "Hydro Technology",
    "dyson.com": "Product Page",
  };
  const hostname = getHostname(url);
  const known = Object.entries(hostnames).find(([key]) => hostname.includes(key));
  return known ? known[1] : hostname;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}
export function ProductLogDrawer({
  productId,
  productName,
  productCode,
  productImage,
  onClose,
}: ProductLogDrawerProps) {
  const [activeTab, setActiveTab] = useState<"source" | "attribute">("source");
  const [expandedSource, setExpandedSource] = useState<number | null>(0);
  const [data, setData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aggregationService.getProductExtractionLogs(productId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId]);

  // Derive source logs from final_attributes if source_logs is empty
  const sourceLogs = useMemo(() => {
    if (data?.source_logs && data.source_logs.length > 0) {
      return data.source_logs;
    }
    
    if (!data?.final_attributes) return [];
    
    const sourceMap = new Map<string, any>();
    
    Object.entries(data.final_attributes).forEach(([attrName, attrData]: [string, any]) => {
      if (attrData.sources && Array.isArray(attrData.sources)) {
        attrData.sources.forEach((sourceUrl: string) => {
          if (!sourceMap.has(sourceUrl)) {
            sourceMap.set(sourceUrl, {
              url: sourceUrl,
              attributes: [],
              extracted_at: null
            });
          }
          sourceMap.get(sourceUrl).attributes.push({
            name: attrName,
            value: attrData.value,
            unit: attrData.unit,
            raw_text: attrData.value,
            confidence: attrData.confidence
          });
        });
      }
    });
    
    return Array.from(sourceMap.values());
  }, [data]);

  const finalAttrs = data?.final_attributes || {};
  const sourcesConsulted = data?.sources_consulted || sourceLogs.map(s => s.url);
  
  const totalDataPoints = sourceLogs.reduce((sum, s) => sum + s.attributes.length, 0);
  const allAttrNames = [...new Set(sourceLogs.flatMap((s) => s.attributes.map((a) => a.name)))];
  
  // If no source_logs, build from final_attributes
  const hasSourceLogs = sourceLogs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {(productImage || data?.image_url) ? (
              <img 
                src={productImage || data?.image_url || ""} 
                alt="" 
                className="w-12 h-12 rounded-lg object-contain bg-white p-1" 
                onError={(e) => (e.currentTarget.style.display = "none")} 
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                <Database className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{productName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                  {productCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {sourcesConsulted[0] || getHostname(sourcesConsulted[0] || "")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300 flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              {totalDataPoints} data points
            </span>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("source")}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === "source"
                  ? "bg-white text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              By Source URL
            </button>
            <button
              onClick={() => setActiveTab("attribute")}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === "attribute"
                  ? "bg-white text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              By Attribute
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {sourceLogs.map((s, i) => (
              <div key={s.url} className={`w-3 h-3 rounded-full ${getSourceColor(i).dot}`} title={getHostname(s.url)} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : sourceLogs.length === 0 && Object.keys(finalAttrs).length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-semibold text-lg">No extraction data</p>
              <p className="text-sm mt-1">This product has not been aggregated yet</p>
            </div>
          ) : activeTab === "source" ? (
            <div className="space-y-3">
              {sourceLogs.map((source, idx) => {
                const color = getSourceColor(idx);
                const isExpanded = expandedSource === idx;
                return (
                  <div
                    key={source.url}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isExpanded ? color.border + " shadow-sm" : "border-slate-200"
                    }`}
                  >
                    <button
                      onClick={() => setExpandedSource(isExpanded ? null : idx)}
                      className={`w-full px-5 py-4 flex items-center gap-4 ${
                        isExpanded ? color.header : "bg-white hover:bg-slate-50"
                      } transition-colors`}
                    >
                      <div className={`w-8 h-8 rounded-full ${color.dot} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{getShortName(source.url)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${color.badge}`}>
                            {source.attributes.length} attributes
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                          <Link2 className="w-3 h-3 shrink-0" />
                          {source.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {source.extracted_at && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(source.extracted_at)}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && source.attributes.length > 0 && (
                      <div className="border-t border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-800 text-white">
                            <tr className="text-[11px] uppercase tracking-wider font-semibold">
                              <th className="px-5 py-3 text-left">Attribute</th>
                              <th className="px-5 py-3 text-left">Value</th>
                              <th className="px-5 py-3 text-left">Unit</th>
                              <th className="px-5 py-3 text-left">Raw Extracted Text</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {source.attributes.map((attr, aIdx) => (
                              <tr key={aIdx} className="hover:bg-slate-50/50">
                                <td className="px-5 py-3 font-medium text-slate-800 text-sm">{attr.name}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${color.badge}`}>
                                    {attr.value || "—"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-slate-500 text-sm">{attr.unit || "—"}</td>
                                <td className="px-5 py-3">
                                  <code className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 font-mono">
                                    {attr.raw_text || attr.value}
                                  </code>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Showing how each attribute appears across all source URLs. Empty cells mean the attribute was not found on that source.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider font-semibold sticky left-0 bg-slate-800 z-10 min-w-[160px]">
                        Attribute
                      </th>
                      {sourceLogs.map((s, i) => (
                        <th key={s.url} className="px-4 py-3 text-center text-[11px] font-semibold min-w-[140px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${getSourceColor(i).dot}`} />
                            <span className="truncate text-xs" title={s.url}>{getShortName(s.url)}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAttrNames.map((attrName) => (
                      <tr key={attrName} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100">
                          {attrName}
                        </td>
                        {sourceLogs.map((s, i) => {
                          const attr = s.attributes.find((a) => a.name === attrName);
                          const color = getSourceColor(i);
                          return (
                            <td key={s.url} className="px-4 py-3 text-center">
                              {attr ? (
                                <div>
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${color.badge}`}>
                                    {attr.value}
                                  </span>
                                  {attr.unit && (
                                    <span className="block text-[10px] text-slate-400 mt-0.5">{attr.unit}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            {sourcesConsulted.length} source URL{sourcesConsulted.length !== 1 ? "s" : ""} • 
            Last scraped {new Date().toLocaleString("en-US", { 
              year: "numeric", 
              month: "2-digit", 
              day: "2-digit", 
              hour: "2-digit", 
              minute: "2-digit",
              hour12: false
            })} UTC
          </span>
          <button onClick={onClose} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
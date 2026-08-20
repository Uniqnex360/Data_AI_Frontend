import { useEffect, useState } from "react";
import {
  X,
  Box,
  ImageIcon,
  Film,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
} from "lucide-react";
import { downloadService } from "../services/downloadService.ts";
import { PendingValidation, Product } from "../types/business-rules.types.ts";
import { pdfService } from "../services/pdfService.ts";
import { notify } from "../lib/notifications.ts";

type TabKey = "description" | "attributes" | "media" | "documents";

interface Props {
  product: Product;
  onClose: () => void;
  loading?: boolean;
}

export function ProductDetailDrawer({ product, onClose, loading }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [pendingValidations, setPendingValidations] = useState<
    PendingValidation[]
  >([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  useEffect(() => {
    if (!product?.product_code) return;
    pdfService
      .getPending({ productCode: product.product_code })
      .then(setPendingValidations)
      .catch((e) => console.error("Failed to fetch pending validations", e));
  }, [product?.product_code]);
  useEffect(() => {
    setCarouselIndex(0);
  }, [product.id]);
  if (loading || !product) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }
  
  const getSafeHostname = (urlString: string | undefined): string => {
    if (!urlString) return "Unknown Source";
    try {
      if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
        return new URL(urlString).hostname.replace(/^www\./, "");
      }
      return urlString;
    } catch {
      return "Invalid URL";
    }
  };
  const handleResolve = async (
    validationId: string,
    decision: "approved" | "rejected",
  ) => {
    setResolvingId(validationId);
    try {
      await pdfService.resolve(validationId, decision);
      setPendingValidations((prev) =>
        prev.filter((v) => v.id !== validationId),
      );
    } catch (e) {
      console.error("Failed to resolve validation", e);
      notify.error("Failed to submit decision. Try again.");
    } finally {
      setResolvingId(null);
    }
  };
  const findPendingValidation = (docUrl: string) =>
    pendingValidations.find(
      (v) => v.pdf_url === docUrl && v.status === "pending",
    );

  const tabs: { id: TabKey; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "attributes", label: "Attributes" },
    { id: "media", label: "Images/Videos" },
    { id: "documents", label: "Documents" },
  ];

  const getImages = (): { url: string; sourcePageUrl?: string; sourceType?: string }[] => {
    const images: { url: string; sourcePageUrl?: string; sourceType?: string }[] = [];
   if (product.image_assets && Array.isArray(product.image_assets)) {
      product.image_assets.forEach((asset) => {
        if (asset?.image_url) {
          images.push({
            url: asset.image_url,
            sourcePageUrl: asset.source_page_url,
            sourceType: asset.source_type,
          });
        }
      });
    }
    return images;
  };

  const getVideos = (): { name: string; url: string }[] => {
    const videos: { name: string; url: string }[] = [];

    if (product.videos && typeof product.videos === "object") {
      Object.values(product.videos).forEach((v) => {
        if (v?.url) {
          videos.push({ name: v.name || "Video", url: v.url });
        }
      });
    }

    for (let i = 1; i <= 3; i++) {
      const urlKey = `video_url_${i}` as keyof Product;
      const nameKey = `video_name_${i}` as keyof Product;
      const url = product[urlKey];
      const name = product[nameKey];
      if (
        typeof url === "string" &&
        url &&
        !videos.find((v) => v.url === url)
      ) {
        videos.push({
          name: typeof name === "string" ? name : `Video ${i}`,
          url,
        });
      }
    }

    return videos;
  };
  const handleDownload = async (url: string, filename?: string) => {
    try {
      await downloadService.downloadFile(url, filename);
    } catch (error) {
      console.error("Download failed", error);
      window.open(url, "_blank");
    }
  };

  const getDocuments = (): { name: string; url: string }[] => {
    const docs: { name: string; url: string }[] = [];

    if (product.documents && typeof product.documents === "object") {
      Object.values(product.documents).forEach((d) => {
        if (d?.url && d.url.toLowerCase().endsWith(".pdf")) {
          docs.push({ name: d.name || "Document", url: d.url });
        }
      });
    }

    for (let i = 1; i <= 5; i++) {
      const urlKey = `document_url_${i}` as keyof Product;
      const nameKey = `document_name_${i}` as keyof Product;
      const url = product[urlKey];
      const name = product[nameKey];
      if (
        typeof url === "string" &&
        url.toLowerCase().endsWith(".pdf") &&
        !docs.find((d) => d.url === url)
      ) {
        docs.push({
          name: typeof name === "string" ? name : `Document ${i}`,
          url,
        });
      }
    }

    if (product.sources_consulted) {
      product.sources_consulted.forEach((url: string) => {
        if (
          url.toLowerCase().endsWith(".pdf") &&
          !docs.find((d) => d.url === url)
        ) {
          docs.push({ name: url.split("/").pop() || "PDF Document", url });
        }
      });
    }

    return docs;
  };

  const images = getImages();
  const videos = getVideos();
  const documents = getDocuments();
  const features = product.features || [];
const pendingOnlyDocs = pendingValidations
  .filter((v) => v.status === "pending" && !documents.find((d) => d.url === v.pdf_url))
  .map((v) => ({ name: v.pdf_url.split("/").pop() || "PDF (pending validation)", url: v.pdf_url }));

const allDocs = [...documents, ...pendingOnlyDocs];
  const hasDescription = !!product.long_description || features.length > 0;
  const hasAttributes =
    !!product.attributes && Object.keys(product.attributes).length > 0;
  const hasMedia = images.length > 0 || videos.length > 0;
  const hasDocuments = allDocs.length > 0 || (product.sources_consulted?.length ?? 0) > 0;

  const parseAttrValue = (attr: unknown): string => {
    if (!attr) return "—";
    if (typeof attr === "object" && attr !== null && "value" in attr) {
      return String((attr as Record<string, unknown>).value || "—");
    }
    return String(attr);
  };
  const normKey = (s: string) => (s || "").toLowerCase().replace(/[\s_-]/g, "");

  const attrs = product.attributes ?? {};
  const order = product.attribute_order ?? []; // export order from backend
  const category = product.category_attribute_names ?? []; // optional

  const orderNorm = new Set(order.map(normKey));
  const categoryNorm = new Set(category.map(normKey));

  const used = new Set<string>();
  const orderedKeys: string[] = [];

  // 1) First follow attribute_order (Excel-like order)
  for (const t of order) {
    const match = Object.keys(attrs).find((k) => normKey(k) === normKey(t));
    if (match && !used.has(match)) {
      // Hide category attributes in drawer (since you said drawer shouldn't show category attrs)
      if (!categoryNorm.has(normKey(match))) {
        orderedKeys.push(match);
      }
      used.add(match);
    }
  }

  // 2) OPTIONAL: add remaining keys, but ONLY if they are part of order (prevents Brand/MPN/etc showing up)
  for (const k of Object.keys(attrs)) {
    if (
      !used.has(k) &&
      orderNorm.has(normKey(k)) &&
      !categoryNorm.has(normKey(k))
    ) {
      orderedKeys.push(k);
      used.add(k);
    }
  }

  // 3) Fallback if backend didn’t send attribute_order
  const finalKeys = orderedKeys.length ? orderedKeys : Object.keys(attrs);

  const parseAttrUnit = (attr: unknown): string | null => {
    if (typeof attr === "object" && attr !== null) {
      const obj = attr as Record<string, unknown>;
      if (obj.unit) return String(obj.unit);
      if (obj.uom) return String(obj.uom);
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between shrink-0 bg-white sticky top-0 z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2">
              {product.product_name}
            </h2>
            {product.title_recommendation && (
              <div className="mt-1 text-xs">
                <span className="font-medium text-slate-500">
                  Recommended Title:
                </span>{" "}
                <span className="text-indigo-600">
                  {product.title_recommendation}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                {product.product_code}
              </span>
              {product.brand_name && (
                <span className="text-xs text-slate-500 font-medium">
                  {product.brand_name}
                </span>
              )}
              {product.category_3 && (
                <span className="text-xs text-slate-400">
                  • {product.category_3}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {images.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="relative aspect-video rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center group">
              <img
                src={images[carouselIndex].url}
                alt={`${product.product_name} ${carouselIndex + 1}`}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCarouselIndex((i) =>
                        i === 0 ? images.length - 1 : i - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-600 rotate-90" />
                  </button>
                  <button
                    onClick={() =>
                      setCarouselIndex((i) =>
                        i === images.length - 1 ? 0 : i + 1,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-600 -rotate-90" />
                  </button>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === carouselIndex
                            ? "bg-indigo-600"
                            : "bg-white/70 border border-slate-300"
                        }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>

                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full">
                    {carouselIndex + 1}/{images.length}
                  </div>
                </>
              )}
                 {images[carouselIndex]?.sourcePageUrl && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">
                  Source:{" "}
                  <a
                    href={images[carouselIndex].sourcePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                  >
{getSafeHostname(images[carouselIndex].sourcePageUrl)}                  </a>
                  {images[carouselIndex].sourceType && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-medium">
                      {images[carouselIndex].sourceType}
                    </span>
                  )}
                </span>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 px-6">
          {tabs.map((tab) => {
            const hasContent =
              tab.id === "description" || // Always show
              (tab.id === "attributes" && hasAttributes) ||
              tab.id === "media" || // Always show - change this
              tab.id === "documents"; // Always show - change this

            if (!hasContent) return null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Description Tab */}
          {activeTab === "description" && (
            <div className="space-y-6">
              {product.long_description && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Description
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {product.long_description}
                  </p>
                </div>
              )}

              {product.short_description && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Short Description
                  </h3>
                  <p className="text-sm text-slate-600">
                    {product.short_description}
                  </p>
                </div>
              )}

              {features.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Features ({features.length})
                  </h3>
                  <ul className="space-y-2">
                    {features
                      .slice(0, expandedFeatures ? features.length : 5)
                      .map((feature: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed"
                        >
                          <span className="text-indigo-400 mt-1 shrink-0">
                            •
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                  </ul>
                  {features.length > 5 && (
                    <button
                      onClick={() => setExpandedFeatures(!expandedFeatures)}
                      className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {expandedFeatures ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Show All (
                          {features.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {!hasDescription && (
                <div className="text-center py-12 text-slate-400">
                  <Box className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No description available</p>
                </div>
              )}
            </div>
          )}

          {/* Attributes Tab */}
          {activeTab === "attributes" && (
            <div>
              {hasAttributes && product.attributes ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {/* {Object.entries(product.attributes).map(([key, attr], idx) => (
              <tr
                key={key}
                className={
                  idx % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50"
                }
              >
                <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200 w-1/2 align-top">
                  {key}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900 w-1/2 align-top">
                  <span className="font-semibold">
                    {parseAttrValue(attr)}
                  </span>
                  {parseAttrUnit(attr) && (
                    <span className="text-xs text-slate-500 font-normal ml-1">
                      {parseAttrUnit(attr)}
                    </span>
                  )}
                </td>
              </tr>
            ))} */}
                      {finalKeys.map((key, idx) => {
                        const attr = (attrs as any)[key];
                        return (
                          <tr
                            key={key}
                            className={
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }
                          >
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200 w-1/2 align-top">
                              {key}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 w-1/2 align-top">
                              <span className="font-semibold">
                                {parseAttrValue(attr)}
                              </span>
                              {parseAttrUnit(attr) && (
                                <span className="text-xs text-slate-500 font-normal ml-1">
                                  {parseAttrUnit(attr)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Box className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No attributes available</p>
                </div>
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="space-y-8">
                      {images.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="relative aspect-video rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center group">
              <img
                src={images[carouselIndex].url}
                alt={`${product.product_name} ${carouselIndex + 1}`}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCarouselIndex((i) =>
                        i === 0 ? images.length - 1 : i - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-600 rotate-90" />
                  </button>
                  <button
                    onClick={() =>
                      setCarouselIndex((i) =>
                        i === images.length - 1 ? 0 : i + 1,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-600 -rotate-90" />
                  </button>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === carouselIndex
                            ? "bg-indigo-600"
                            : "bg-white/70 border border-slate-300"
                        }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>

                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full">
                    {carouselIndex + 1}/{images.length}
                  </div>
                </>
              )}
            </div>
            
            {images[carouselIndex]?.sourcePageUrl && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">
                  Source:{" "}
                  <a
                    href={images[carouselIndex].sourcePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                  >
{getSafeHostname(images[carouselIndex].sourcePageUrl)}                  </a>
                  {images[carouselIndex].sourceType && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-medium">
                      {images[carouselIndex].sourceType}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

              {videos.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Videos ({videos.length})
                  </h3>
                  <div className="space-y-2">
                    {videos.map((video, idx) => (
                      <a
                        key={idx}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                          <Film className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {video.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {video.url}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!hasMedia && (
                <div className="text-center py-12 text-slate-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No media available</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div>
              {allDocs.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Documents ({allDocs.length})
                  </h3>
                  <div className="space-y-2">
                    {allDocs.map((doc, idx) => {
                      const pending = findPendingValidation(doc.url);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {doc.url}
                            </p>
                            {pending && (
                              <p className="text-xs text-amber-600 font-medium mt-0.5">
                                ⏸ Awaiting validation before data extraction
                              </p>
                            )}
                          </div>

                         {pending ? (
  <div className="flex items-center gap-1.5 shrink-0">
    <button
      onClick={() => window.open(doc.url, "_blank")}
      className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
      title="View PDF"
    >
      <ExternalLink className="w-4 h-4" />
    </button>
    <button
      onClick={() => handleResolve(pending.id, "approved")}
      disabled={resolvingId === pending.id}
      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
    >
      {resolvingId === pending.id ? "..." : "Approve"}
    </button>
    <button
      onClick={() => handleResolve(pending.id, "rejected")}
      disabled={resolvingId === pending.id}
      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
    >
      {resolvingId === pending.id ? "..." : "Reject"}
    </button>
  </div>
) : (
  <button
    onClick={() => handleDownload(doc.url, doc.name)}
    className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
    title="Download"
  >
    <Download className="w-4 h-4" />
  </button>
)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No documents available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

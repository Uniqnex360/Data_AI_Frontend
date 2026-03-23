import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Plus,
  Edit,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Search,
  Clock,
  XCircle,
} from "lucide-react";
import { extractionService } from "../services/extractionService";
import { projectService } from "../services/projectService";
import type { Source, Project } from "../types/database.types";
import { notify } from "../lib/notifications.ts";
import { getStatusIcon } from "../utils/statusIcon";
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
export default function SourcesTab({ projectId,onProjectSelect }: { projectId?: string,onProjectSelect?: (projectId: string) => void}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMode, setActiveMode] = useState<"manual" | "bulk">("bulk");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualData, setManualData] = useState<ManualProductData>({
    brand: "",
    title: "",
    manufacturer: "",
    sku: "",
    mpn: "",
    model: "",
    upc_ean_gtin: "",
    variant_sku: "",
    variant_mpn: "",
    variant_model: "",
    taxonomy: "",
    price: "",
    stock: "",
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [selectedUseCase, setSelectedUseCase] = useState<string>('');
  const [showUseCaseDropdown, setShowUseCaseDropdown] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    status: string;
  } | null>(null);
  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [projectSources, setProjectSources] = useState<Record<string, Source[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    loadSources();
    loadProjects();
  }, []);
  const loadSources = async () => {
    try {
      const data = await extractionService.getAllSources();
      setSources(data);
    } catch (error) {
      console.error("Failed to load sources:", error);
    }
  };
  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };
  const loadSourcesForProject = async (id: string) => {
    if (!id) return;
    try {
      const sourcesData = await extractionService.getSourcesByProject(id);
      setProjectSources((prev) => ({ ...prev, [id]: sourcesData }));
    } catch (error) {
      console.error("Failed to load sources:", error);
    }
  };
  const toggleProject = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      await loadSourcesForProject(projectId);
    }
    setExpandedProjects(newExpanded);
  };
  useEffect(() => {
    if ( bulkFile  && !projectId) {
      notify.error(
        "No Project Selected",
        "Please select a project from the Projects section"
      );
    }
  }, [projectId,bulkFile]);
  useEffect(() => {
    const handleClickOutSide = (e: MouseEvent) => {
      if (showUseCaseDropdown) {
        setShowUseCaseDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutSide);
    return () => document.removeEventListener("click", handleClickOutSide);
  }, [showUseCaseDropdown]);
  const pollBatchStatus = async (batchId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await extractionService.getBatchStatus(batchId);
        const { status, metadata } = response;
        if (status === "completed") {
          notify.success(
            "Import Finished",
            `Successfully processed ${metadata?.total || 0} products.`
          );
          setImportResults({
            success: metadata?.successful || 0,
            failed: metadata?.failed || 0,
            status: status,
          });
          await loadSources();
          await loadProjects();
          return;
        }
        if (status === "failed") {
          notify.error(
            "Import Failed",
            metadata?.error_message || "An error occurred during processing."
          );
          setImportResults({
            success: metadata?.successful || 0,
            failed: metadata?.failed || 0,
            status: status,
          });
          await loadSources();
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          notify.error(
            "Polling Timeout",
            "The import is taking longer than expected. Please check back later."
          );
        }
      } catch (error) {
        console.error("Failed to poll batch status:", error);
        notify.error(
          "Connection Error",
          "Lost connection while checking import status."
        );
      }
    };  
    poll();
  };
  
  const useCaseOptions = [
    "With categories",
    "Without categories",
    "With Categories with attribute (back filling)", 
    "With Categories with attribute (back filling) and existing attribute validation"
  ];
  const handleSelectUseCase = (useCase: string) => {
    setSelectedUseCase(useCase)
    setShowUseCaseDropdown(false)
  };
  const handleManualSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!manualData.mpn) newErrors.mpn = "MPN is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notify.error("Missing required fields", "Please fill MPN");
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const content = Object.entries(manualData)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
      await extractionService.extractFromSource({
        sourceType: "excel",
        content,
        sourceUrl: `manual-input-${manualData.sku}`,
        projectId: projectId,
      });
      setManualData({
        brand: "",
        title: "",
        manufacturer: "",
        sku: "",
        mpn: "",
        model: "",
        upc_ean_gtin: "",
        variant_sku: "",
        variant_mpn: "",
        variant_model: "",
        taxonomy: "",
        price: "",
        stock: "",
      });
      await loadSources();
      notify.success("Product added successfully!");
    } catch (error) {
      console.error("Failed to add product:", error);
      notify.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      notify.info("Please select a file");
      return;
    }
    if (!projectId) {
      notify.info("Please select a project first");
      return;
    }
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = bulkFile.name
      .substring(bulkFile.name.lastIndexOf("."))
      .toLowerCase();
    if (
      !validTypes.includes(bulkFile.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      notify.error("Invalid file type", "Please upload CSV or Excel files only");
      return;
    }
    setLoading(true);
    try {
      const result = await extractionService.batchAggregate(bulkFile, projectId);
      setBulkFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      notify.success(
        "Upload Successful"
      );
      setImportResults({
        success: 0,
        failed: 0,
      });
      setBulkFile(null);
      pollBatchStatus(result.batch_id);
      await loadSources();
    } catch (error) {
      console.error("Bulk upload failed:", error);
      const detail = error.response?.data?.detail;
      const errorMessage =
  (detail && typeof detail === "object" && "message" in detail && detail.message)
    ? detail.message
    : (detail && typeof detail === "string" ? detail : null)
    || error.message
    || "Aggregation failed";
      notify.error("Bulk upload failed",errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const downloadTemplate = () => {
    const coreHeaders = [
      "Prod ID",
      "SKU",
      "Product_Type",
      "Parent_SKU",
      "Product_Name",
      "Brand",
      "GTIN",
      "ean",
      "upc",
      "unspc",
      "MPN",
      "Discontinue_Status",
    ];
    const catHeaders = [
      "industry_name",
      "category 1",
      "category 2",
      "category 3",
      "category 4",
      "category 5",
      "category 6",
      "category 7",
      "category 8",
      "Taxonomy",
    ];
    const physHeaders = [
      "Country_of_Origin",
      "Warranty",
      "Weight",
      "Weight_Unit",
      "Length",
      "Width",
      "Height",
      "Dimension_Unit",
      "Variant_Status",
    ];
    const priceHeaders = [
      "Currency",
      "Base Price",
      "Sale Price",
      "Selling_Price",
      "Special_Price",
      "Stock_Qty",
      "Stock_Status",
      "Vendor_Name",
      "Vendor_SKU",
    ];
    
    const imageHeaders: string[] = [];
    for (let i = 1; i <= 8; i++) {
      imageHeaders.push(`image_name_${i}`, `image_url_${i}`);
    }
    const videoHeaders: string[] = [];
    for (let i = 1; i <= 3; i++) {
      videoHeaders.push(`video_name_${i}`, `video_url_${i}`);
    }
    const docHeaders: string[] = [];
    for (let i = 1; i <= 5; i++) {
      docHeaders.push(`document_name_${i}`, `document_url_${i}`);
    }
    const contentHeaders = [
      "3D_Model_URL",
      "Short_Description",
      "Long_Description",
      "features_1",
      "features_2",
      "features_3",
      "features_4",
      "features_5",
      "features_6",
      "features_7",
      "features_8",
      "features_9",
      "features_10",
      "Meta_Title",
      "Meta_Description",
      "Search_Keywords",
      "Certification",
      "Safety_Standard",
      "Hazardous_Material",
      "Prop65_Warning",
    ];
    const attrHeaders: string[] = [];
    for (let i = 1; i <= 40; i++) {
      attrHeaders.push(
        `attribute_name${i}`,
        `attribute_value${i}`,
        `attribute_uom${i}`,
        `validation_value${i}`,
        `validation_uom${i}`
      );
    }
    const headers = [
      ...coreHeaders,
      ...catHeaders,
      ...physHeaders,
      ...priceHeaders,
      ...imageHeaders,
      ...videoHeaders,
      ...docHeaders,
      ...contentHeaders,
      ...attrHeaders,
    ];
    const sampleRow = new Array(headers.length).fill("");
    const setVal = (headerName: string, val: string) => {
      const idx = headers.indexOf(headerName);
      if (idx !== -1) sampleRow[idx] = val;
    };
    setVal("SKU", "DEMO-1001");
    setVal("Product_Name", "High Performance LED Light");
    setVal("Brand", "DemoBrand");
    setVal("MPN", "LED-HP-100");
    setVal("Taxonomy", "Lighting > Indoor > High Bay");
    setVal("Base Price", "150.00");
    setVal("attribute_name1", "Lumens");
    setVal("attribute_value1", "15000");
    setVal("attribute_uom1", "lm");
    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PIM_Import_Template_Full.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const handleCancel = () => {
    setProjectName("");
    setSelectedUseCase('');
  };
  const handleCreate = async () => {
    if (!projectName.trim()) {
      notify.error("Project name is required");
      return;
    }
    if(!selectedUseCase)
    {
      notify.error("Usecase is  required");
      return;
    }
    setLoading(true);
    try {
      await projectService.createProject({
        name: projectName,
        use_case: selectedUseCase,
        status: "draft",
      });
      notify.success("Project created successfully!");
      setProjectName("");
      setSelectedUseCase('');
      setShowUseCaseDropdown(false);
      setShowProjectModal(false);
      await loadProjects();
    } catch (error) {
      console.error("Failed to create project", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.detail ||
        error.message ||
        "Unknown error occurred";
      notify.error("Failed to create project", errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.client?.toLowerCase().includes(query)
    );
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1">
            Product Input Data Sources
          </h3>
          <p className="text-sm text-slate-600">
            Import in bulk via CSV or add products manually
          </p>
          {projectId && (
      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
        <FolderOpen className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          Active Project: {projects.find(p => p.id === projectId)?.name || 'Unknown'}
        </span>
      </div>
    )}
        </div>
        <button
          onClick={() => setShowProjectModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>
      {showProjectModal && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            Create New Project
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Use Cases
              </label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUseCaseDropdown(!showUseCaseDropdown);
                  }}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-700 flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-slate-500">
                    {selectedUseCase||"Select Use Case"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${showUseCaseDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showUseCaseDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {useCaseOptions.map((useCase) => (
                      <label
                        key={useCase}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name='useCaseSelection'
                          checked={selectedUseCase === useCase}
                          onChange={() => handleSelectUseCase(useCase)}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">{useCase}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={!projectName.trim() || loading ||!selectedUseCase}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
            <button
              onClick={() => {
                setShowProjectModal(false);
                handleCancel();
              }}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900">
              {activeMode === "bulk"
                ? "Bulk Import via CSV or Excel"
                : "Manual Input"}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveMode("bulk")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeMode === "bulk"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Bulk Import
              </button>
              <button
                onClick={() => setActiveMode("manual")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeMode === "manual"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Edit className="w-4 h-4" />
                Manual Input
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {activeMode === "bulk" ? (
            <div>
              <div className="mb-4">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
                <p className="text-xs text-slate-500 mt-2">
                  Download the template, fill it with your product data, and upload
                  it below
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV or Excel File
                </label>
                <input
                  type="file"
                  disabled={!projectId}
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
              {projectId ? (
                <button
                  onClick={handleBulkUpload}
                  disabled={loading || !bulkFile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {loading ? "Importing..." : "Import Products"}
                </button>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Select a project to enable file imports
                </div>
              )}
            </div>
          ) : (
            <div>
              <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={manualData.title}
                    onChange={(e) =>
                      setManualData({ ...manualData, title: e.target.value })
                    }
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
                    onChange={(e) =>
                      setManualData({ ...manualData, brand: e.target.value })
                    }
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
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        manufacturer: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setManualData({ ...manualData, sku: e.target.value })
                    }
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
                    onChange={(e) =>
                      setManualData({ ...manualData, mpn: e.target.value })
                    }
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
                    onChange={(e) =>
                      setManualData({ ...manualData, model: e.target.value })
                    }
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
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        upc_ean_gtin: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 123456789012"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Taxonomy
                  </label>
                  <input
                    type="text"
                    value={manualData.taxonomy}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        taxonomy: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setManualData({ ...manualData, price: e.target.value })
                    }
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
                    onChange={(e) =>
                      setManualData({ ...manualData, stock: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            </div>
              {projectId ? (
                <button
                  onClick={handleManualSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? "Adding Product..." : "Add Product"}
                </button>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Select a project to enable adding products
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-900">Projects</h4>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">
                    No projects found matching "{searchQuery}"
                  </p>
                </>
              ) : (
                <>
                  <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">No projects yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Click "Add Project" to create your first project
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                      Project {index + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <h5 className="text-base font-semibold text-slate-900">
                        {project.name}
                      </h5>
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        {expandedProjects.has(project.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {project.use_case && (
                      <div className="mt-2 inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md">
                        <p className="text-xs text-slate-600 font-medium">
                          <span className="text-slate-400 mr-1">Workflow:</span>
                          {project.use_case}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      loadSourcesForProject(project.id);
                       onProjectSelect?.(project.id);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Select
                  </button>
                </div>
                {expandedProjects.has(project.id) && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h6 className="text-sm font-medium text-slate-700 mb-3">
                      Import History
                    </h6>
                    <div className="space-y-2">
                      {projectSources[project.id]?.length === 0 ? (
                        <div className="text-center py-4 bg-slate-50 rounded-md text-sm text-slate-500">
                          No imports for this project yet
                        </div>
                      ) : (
                        projectSources[project.id]?.map((source) => {
                          const aggStatus = source.metadata?.aggregation_status;
                          const isEnriched = aggStatus === "completed";
                          const isAggregating = aggStatus === "processing";
                          const isFailed = aggStatus === "failed";
                          return (
                            <div
                              key={source.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-md text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                <span className="text-slate-700">
                                  {source.source_url}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() =>
                                    extractionService.download(source.id, "input")
                                  }
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                >
                                  <Download className="w-3.5 h-3.5" /> Input
                                </button>
                                {isEnriched ? (
                                  <button
                                    onClick={() =>
                                      extractionService.download(
                                        source.id,
                                        "output"
                                      )
                                    }
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Output
                                  </button>
                                ) : isAggregating ? (
                                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-600 italic">
                                    <Clock className="w-3.5 h-3.5 animate-spin" />{" "}
                                    Aggregating...
                                  </div>
                                ) : isFailed ? (
                                  <div
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg border border-red-100 cursor-help"
                                    title="Some products failed to process."
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Failed
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-600 italic">
                                    <AlertCircle className="w-3.5 h-3.5" /> Needs
                                    Aggregation
                                  </div>
                                )}
                                {getStatusIcon(source.status)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
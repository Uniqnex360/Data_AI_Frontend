import { useEffect, useRef, useState, useMemo } from "react";
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
  Globe,
  FileText,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import { extractionService } from "../services/extractionService";
import { projectService } from "../services/projectService";
import type { Source, Project } from "../types/database.types";
import { notify } from "../lib/notifications.ts";
import { getStatusIcon } from "../utils/statusIcon";
import { cleansingService } from "../services/cleansingService";
import { pollBatchStatus } from "../../utils/polling";
import {
  ManualProductData,
  OperationMode,
} from "../types/business-rules.types.ts";
import ProjectsOverviewTab from "./ProjectsOverviewTab.tsx";
import { dashboardService } from "../services/dashboardService.ts";
type DateFilterMode = "all" | "day" | "week" | "month";
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) =>
  endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
const startOfWeek = (d: Date, weekStartsOn: 0 | 1 = 1) => {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - diff);
  return date;
};
const endOfWeek = (d: Date, weekStartsOn: 0 | 1 = 1) => {
  const s = startOfWeek(d, weekStartsOn);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return endOfDay(e);
};
const fmt = (d: Date) =>
  d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const formatRange = (start: Date, end: Date) => `${fmt(start)} – ${fmt(end)}`;
const toDateInputValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
export default function SourcesTab({
  projectId,
  onProjectSelect,
}: {
  projectId?: string;
  onProjectSelect?: (projectId: string) => void;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [showMpnExcelModal, setShowMpnExcelModal] = useState(false);
  const [projectsOverview, setProjectsOverview] = useState<ProjectOverview[]>(
    [],
  );
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [mpnExcelFile, setMpnExcelFile] = useState<File | null>(null);
  const [mpnExcelUploading, setMpnExcelUploading] = useState(false);
  const mpnExcelInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [importPdfFiles, setImportPdfFiles] = useState<File[]>([]);
  const importPdfInputRef = useRef<HTMLInputElement>(null);
  const [importExtracting, setImportExtracting] = useState(false);
  const [productDetails, setProductDetails] = useState("");
  const [viewMode, setViewMode] = useState<"overview" | "sources">("sources");

  const [importIdentifiers, setImportIdentifiers] = useState<string[]>([]);
  const [currentImportIdentifier, setCurrentImportIdentifier] = useState("");
  const [operationMode, setOperationMode] =
    useState<OperationMode>("aggregation");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMode, setActiveMode] = useState<"manual" | "bulk">("bulk");
  const [uiTab, setUiTab] = useState<"bulk" | "importPdf" | "manual">("bulk");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [freshMpns, setFreshMpns] = useState<string[]>([]);
  const [currentFreshMpn, setCurrentFreshMpn] = useState("");
  const [freshAggregating, setFreshAggregating] = useState(false);
  const [multiPdFs, setMultiPdFs] = useState<File[]>([]);
  const [multiMpns, setMultiMpns] = useState<string[]>([]);
  const [currentMultiMpn, setCurrentMultiMpn] = useState("");
  const [multiExtracting, setMultiExtracting] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");
  const [showUseCaseDropdown, setShowUseCaseDropdown] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
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
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [dateAnchor, setDateAnchor] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [structuredMpn, setStructuredMpn] = useState("");
  const [structuredPdfFile, setStructuredPdfFile] = useState<File | null>(null);
  const [unstructuredMpn, setUnstructuredMpn] = useState("");
  const [unstructuredPdfFile, setUnstructuredPdfFile] = useState<File | null>(
    null,
  );
  const [unstructuredExtracting, setUnstructuredExtracting] = useState(false);
  const [structuredExtracting, setStructuredExtracting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [projectSources, setProjectSources] = useState<
    Record<string, Source[]>
  >({});
  const [loadingSources, setLoadingSources] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [projectName, setProjectName] = useState<string>("");
  const loadProjectsOverview = async () => {
    setOverviewLoading(true);
    try {
      const data = await dashboardService.getProjectsOverview();
      setProjectsOverview(data);
    } catch (error) {
      console.error("Failed to load projects overview:", error);
    } finally {
      setOverviewLoading(false);
    }
  };
  useEffect(() => {
    if (!projectId) {
      loadProjectsOverview();
    }
  }, [projectId]);
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
  const MpnExcelModal = () => (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => setShowMpnExcelModal(false)}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Upload MPNs from Excel
            </h3>
            <button onClick={() => setShowMpnExcelModal(false)} className="p-1">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-2">
              Select Excel/CSV file with MPNs
            </p>
            <p className="text-xs text-slate-400 mb-3">
              File should have an MPN column
            </p>
            <input
              ref={mpnExcelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setMpnExcelFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            {mpnExcelFile && (
              <p className="text-sm text-green-600 mt-2">{mpnExcelFile.name}</p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            MPNs will be added to your existing list. Duplicates will be
            skipped.
          </p>
        </div>
        <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={() => setShowMpnExcelModal(false)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleMpnExcelUpload}
            disabled={!mpnExcelFile || mpnExcelUploading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {mpnExcelUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import MPNs"
            )}
          </button>
        </div>
      </div>
    </div>
  );
  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };
  useEffect(() => {
    if (selectedProject) {
      setOperationMode(selectedProject.operation_mode as OperationMode);
      setSelectedUseCase(selectedProject.use_case || "");
    }
  }, [selectedProject]);
  const handleMpnExcelUpload = async () => {
    if (!mpnExcelFile) {
      notify.error("Please select an Excel file");
      return;
    }
    setMpnExcelUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", mpnExcelFile);
      const response = await extractionService.parseMpnsFromExcel(formData);
      if (response.valid_mpns > 0) {
        const newMpns = response.mpns.filter(
          (mpn: string) => !multiMpns.includes(mpn),
        );
        setMultiMpns([...multiMpns, ...newMpns]);
        notify.success(
          "MPNs imported",
          `${newMpns.length} MPNs added (${response.duplicates_removed} duplicates skipped)`,
        );
      }
      setShowMpnExcelModal(false);
      setMpnExcelFile(null);
      if (mpnExcelInputRef.current) mpnExcelInputRef.current.value = "";
    } catch (error: any) {
      notify.error("Failed to parse Excel", error.message);
    } finally {
      setMpnExcelUploading(false);
    }
  };
  useEffect(() => {
    if (activeMode === "manual") {
      setUiTab("manual");
      return;
    }
    if (
      operationMode === "pdf_extraction" &&
      selectedUseCase?.includes("Title & Description Based PDF Extraction")
    ) {
      setUiTab("importPdf");
      return;
    }
    setUiTab("bulk");
  }, [activeMode, operationMode, selectedUseCase]);
  useEffect(() => {
    const handleClickOutSide = () => {
      if (showUseCaseDropdown) setShowUseCaseDropdown(false);
    };
    document.addEventListener("click", handleClickOutSide);
    return () => document.removeEventListener("click", handleClickOutSide);
  }, [showUseCaseDropdown]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!calendarRef.current) return;
      if (!calendarRef.current.contains(e.target as Node))
        setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const dateRange = useMemo(() => {
    if (dateFilterMode === "all") return null;
    if (dateFilterMode === "day") {
      return { start: startOfDay(dateAnchor), end: endOfDay(dateAnchor) };
    }
    if (dateFilterMode === "week") {
      return {
        start: startOfWeek(dateAnchor, 1),
        end: endOfWeek(dateAnchor, 1),
      };
    }
    return { start: startOfMonth(dateAnchor), end: endOfMonth(dateAnchor) };
  }, [dateFilterMode, dateAnchor]);
  const useCaseMap: Record<OperationMode, string[]> = {
    aggregation: [
      "Products with Category Assignments",
      "Products without Category Assignments",
    ],
    enrichment: [
      "With Categories with attribute (back filling)",
      "With Categories with attribute (back filling) and existing attribute validation",
    ],
    cleaning: ["Data cleaning and Standardization"],
    pdf_extraction: [
      "MPN/UPC based PDF Extraction",
      "Structured PDF Extraction (Given MPNs)",
      "Unstructured PDF Extraction (Given MPNs)",
      "Multi-PDF & Multi-MPN Data Extraction.",
      "Title & Description Based PDF Extraction",
    ],
  };
  const useCaseOptions = useCaseMap[operationMode];
  useEffect(() => {
    setSelectedUseCase((prev) =>
      prev && useCaseMap[operationMode].includes(prev) ? prev : "",
    );
  }, [operationMode]);
  const handleSelectUseCase = (useCase: string) => {
    setSelectedUseCase(useCase);
    setShowUseCaseDropdown(false);
  };
  const loadSourcesForProject = async (id: string) => {
    if (!id) return;
    setLoadingSources((prev) => new Set(prev).add(id));
    try {
      const sourcesData = await extractionService.getSourcesByProject(id);
      setProjectSources((prev) => ({ ...prev, [id]: sourcesData }));
    } catch (error) {
      console.error("Failed to load sources:", error);
      notify.error("Failed to load import history");
    } finally {
      setLoadingSources((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };
  const toggleProject = async (pid: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(pid)) {
      newExpanded.delete(pid);
    } else {
      newExpanded.add(pid);
      await loadSourcesForProject(pid);
    }
    setExpandedProjects(newExpanded);
  };
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(q) ||
        project.client?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (!dateRange) return true;
      const createdAt = new Date((project as any).created_at);
      if (isNaN(createdAt.getTime())) return false;
      const t = createdAt.getTime();
      return t >= dateRange.start.getTime() && t <= dateRange.end.getTime();
    });
  }, [projects, searchQuery, dateRange]);
  const handleCancel = () => {
    setProjectName("");
    setSelectedUseCase("");
  };
  const handleCreate = async () => {
    if (!projectName.trim()) {
      notify.error("Project name is required");
      return;
    }
    if (!selectedUseCase) {
      notify.error("Usecase is  required");
      return;
    }
    setLoading(true);
    try {
      const createdProject = await projectService.createProject({
        name: projectName,
        use_case: selectedUseCase,
        operation_mode: operationMode,
        status: "draft",
      });
      notify.success("Project created successfully!");
      setProjectName("");
      setSelectedUseCase("");
      setShowUseCaseDropdown(false);
      setShowProjectModal(false);
      await loadProjects();
      if (!projectId) {
        await loadProjectsOverview();
      }
      if (createdProject?.id) {
        setSelectedProject(createdProject);
        onProjectSelect?.(createdProject.id);
        await loadSourcesForProject(createdProject.id);
      }
    } catch (error: any) {
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
      notify.error("Invalid file type", "Please upload Excel/CSV files only");
      return;
    }
    setLoading(true);
    try {
      const result = await extractionService.batchAggregate(
        bulkFile,
        projectId,
      );
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      notify.success(
        "Upload Successful",
        result?.summary
          ? `${result.summary.valid_rows} valid rows • ${result.summary.with_mpn_count} with MPN • ${result.summary.without_mpn_count} without MPN`
          : "File uploaded successfully",
      );
      pollBatchStatus(result.batch_id, async () => {
        await loadSources();
        await loadProjects();
      });
      await loadSources();
    } catch (error: any) {
      console.error("Bulk upload failed:", error);
      const detail = error.response?.data?.detail;
      const errorMessage =
        detail &&
        typeof detail === "object" &&
        "message" in detail &&
        detail.message
          ? detail.message
          : (detail && typeof detail === "string" ? detail : null) ||
            error.message ||
            "Aggregation failed";
      notify.error("Bulk upload failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleAddImportIdentifier = () => {
    const trimmed = currentImportIdentifier.trim();
    if (!trimmed) return;
    const items = trimmed
      .split(/[,|\n]/g)
      .map((x) => x.trim())
      .filter(Boolean);
    const next = [...importIdentifiers];
    const duplicates: string[] = [];
    for (const it of items) {
      if (next.includes(it)) duplicates.push(it);
      else next.push(it);
    }
    setImportIdentifiers(next);
    setCurrentImportIdentifier("");
    if (duplicates.length) {
      notify.info("Duplicate skipped", `${duplicates.length} already added`);
    }
  };
  const handleRemoveImportIdentifier = (value: string) => {
    setImportIdentifiers((prev) => prev.filter((x) => x !== value));
  };
  const handleAddImportPdfs = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (newFiles.length !== files.length) {
      notify.warning?.("Some files were skipped", "Only PDF files are allowed");
    }
    setImportPdfFiles((prev) => [...prev, ...newFiles]);
  };
  const handleRemoveImportPdf = (index: number) => {
    setImportPdfFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handleImportPdfExtraction = async () => {
    if (importPdfFiles.length === 0) {
      notify.error("Please upload at least one PDF file");
      return;
    }
    if (!projectId) {
      notify.error("Please select a project first");
      return;
    }
    setImportExtracting(true);
    try {
      const identifiers =
        importIdentifiers.length > 0 ? importIdentifiers : [""];
      let jobs = 0;
      for (const pdf of importPdfFiles) {
        for (const identifier of identifiers) {
          const hint = identifier.trim();
          const details = productDetails.trim();
          const product_hint =
            hint && details ? `${hint} | ${details}` : hint || details || "";
          const formData = new FormData();
          formData.append("files", pdf);
          formData.append("project_id", projectId);
          formData.append("use_case", selectedUseCase);
          formData.append("product_hint", product_hint);
          await extractionService.blindPdfExtraction(formData);
          jobs += 1;
        }
      }
      notify.success(
        "Import Started",
        `Queued ${jobs} extraction job(s). Products will appear in the Aggregation tab shortly.`,
      );
      setImportPdfFiles([]);
      setImportIdentifiers([]);
      setCurrentImportIdentifier("");
      setProductDetails("");
      if (importPdfInputRef.current) importPdfInputRef.current.value = "";
      await loadSources();
      await loadProjects();
    } catch (error: any) {
      console.error("Failed to import PDFs:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to process PDF";
      notify.error("Import Failed", errorMessage);
    } finally {
      setImportExtracting(false);
    }
  };
  const handleAddFreshMpn = () => {
    const trimmed = currentFreshMpn.trim();
    if (!trimmed) return;
    if (freshMpns.includes(trimmed)) {
      notify.info("Duplicate MPN", `${trimmed} is already in the list`);
      return;
    }
    setFreshMpns([...freshMpns, trimmed]);
    setCurrentFreshMpn("");
  };
  const handleRemoveFreshMpn = (mpn: string) => {
    setFreshMpns(freshMpns.filter((m) => m !== mpn));
  };
  const handleFreshAggregation = async () => {
    if (freshMpns.length === 0) {
      notify.error("Please add at least one MPN/Model/UPC");
      return;
    }
    if (!projectId) {
      notify.error("Please select a project first");
      return;
    }
    setFreshAggregating(true);
    try {
      const response = await extractionService.savePendingMpns({
        mpns: freshMpns,
        project_id: projectId,
        use_case: selectedUseCase,
      });
      notify.success(
        "MPNs Saved",
        `${response.saved_count || freshMpns.length} MPN(s) saved. Go to Aggregation tab to extract.`,
      );
      setFreshMpns([]);
      setCurrentFreshMpn("");
      await loadSources();
      await loadProjects();
    } catch (error: any) {
      console.error("Failed to save MPNs:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to save MPNs";
      notify.error("Save Failed", errorMessage);
    } finally {
      setFreshAggregating(false);
    }
  };
  const handleStructuredExtraction = async () => {
    if (!structuredPdfFile || !structuredMpn.trim()) {
      notify.error("Please provide an MPN and a PDF file");
      return;
    }
    const fileType = structuredPdfFile.type;
    const fileExtension = structuredPdfFile.name
      .split(".")
      .pop()
      ?.toLowerCase();
    if (fileType !== "application/pdf" && fileExtension !== "pdf") {
      notify.error("Invalid file type", "Please upload a valid PDF file");
      return;
    }
    if (!projectId) {
      notify.error("Please select a project first");
      return;
    }
    setStructuredExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", structuredPdfFile);
      formData.append("mpn", structuredMpn.trim());
      formData.append("project_id", projectId);
      formData.append("use_case", selectedUseCase);
      await extractionService.savePdfSource(formData);
      notify.success(
        "PDF Saved",
        `PDF for MPN ${structuredMpn} has been saved. Go to Aggregation tab to extract.`,
      );
      setStructuredMpn("");
      setStructuredPdfFile(null);
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadSources();
      await loadProjects();
    } catch (error: any) {
      notify.error("Failed to save PDF", error.message);
    } finally {
      setStructuredExtracting(false);
    }
  };
  const handleUnstructuredExtraction = async () => {
    if (!unstructuredPdfFile || !unstructuredMpn.trim()) {
      notify.error("Please provide an MPN and a PDF file");
      return;
    }
    const fileType = unstructuredPdfFile.type;
    const fileExtension = unstructuredPdfFile.name
      .split(".")
      .pop()
      ?.toLowerCase();
    if (fileType !== "application/pdf" && fileExtension !== "pdf") {
      notify.error("Invalid file type", "Please upload a valid PDF file");
      return;
    }
    if (!projectId) {
      notify.error("Please select a project first");
      return;
    }
    setUnstructuredExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", unstructuredPdfFile);
      formData.append("mpn", unstructuredMpn.trim());
      formData.append("project_id", projectId);
      formData.append("use_case", selectedUseCase);
      await extractionService.savePdfSource(formData);
      notify.success(
        "PDF Saved",
        `Unstructured PDF for MPN ${unstructuredMpn} has been saved. Go to Aggregation tab to extract.`,
      );
      setUnstructuredMpn("");
      setUnstructuredPdfFile(null);
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadSources();
      await loadProjects();
    } catch (error: any) {
      notify.error("Failed to save PDF", error.message);
    } finally {
      setUnstructuredExtracting(false);
    }
  };
  const handleAddMultiMpn = () => {
    const trimmed = currentMultiMpn.trim();
    if (!trimmed) return;
    const mpnsToAdd = trimmed
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    const newMpns: string[] = [];
    const duplicates: string[] = [];
    for (const mpn of mpnsToAdd) {
      if (multiMpns.includes(mpn)) duplicates.push(mpn);
      else newMpns.push(mpn);
    }
    if (newMpns.length > 0) setMultiMpns([...multiMpns, ...newMpns]);
    if (duplicates.length > 0) {
      notify.info(
        "Duplicate MPNs skipped",
        `${duplicates.length} MPN(s) already in the list`,
      );
    }
    setCurrentMultiMpn("");
  };
  const handleRemoveMultiMpn = (mpn: string) => {
    setMultiMpns(multiMpns.filter((m) => m !== mpn));
  };
  const handleAddMultiPdFs = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf"),
    );
    if (newFiles.length !== files.length) {
      notify.warning?.("Some files were skipped", "Only PDF files are allowed");
    }
    setMultiPdFs((prev) => [...prev, ...newFiles]);
  };
  const handleRemoveMultiPdf = (index: number) => {
    setMultiPdFs((prev) => prev.filter((_, i) => i !== index));
  };
  const handleMultiExtraction = async () => {
    if (multiPdFs.length === 0) {
      notify.error("Please upload at least one PDF file");
      return;
    }
    if (multiMpns.length === 0) {
      notify.error("Please add at least one MPN");
      return;
    }
    if (multiMpns.length > 50) {
      notify.error(
        "Too many MPNs",
        "Maximum 50 MPNs allowed. Please reduce the list.",
      );
      return;
    }
    if (multiPdFs.length > 20) {
      notify.error(
        "Too many PDFs",
        "Maximum 20 PDF files allowed. Please reduce the selection.",
      );
      return;
    }
    if (!projectId) {
      notify.error("Please select a project first");
      return;
    }
    setMultiExtracting(true);
    try {
      const formData = new FormData();
      multiPdFs.forEach((file) => formData.append("files", file));
      formData.append("mpns", multiMpns.join(","));
      formData.append("project_id", projectId);
      formData.append("use_case", selectedUseCase);
      await extractionService.multiPdfExtraction(formData);
      notify.success(
        "PDFs & MPNs Saved",
        `Saved ${multiMpns.length} MPN(s) and ${multiPdFs.length} PDF(s). Go to Aggregation tab to extract.`,
      );
      setMultiMpns([]);
      setMultiPdFs([]);
      setCurrentMultiMpn("");
      const fileInput = document.querySelector(
        'input[type="file"][accept=".pdf"][multiple]',
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadSources();
      await loadProjects();
    } catch (error: any) {
      notify.error("Extraction failed", error.message);
    } finally {
      setMultiExtracting(false);
    }
  };
  const handleManualSubmit = async () => {
    const newErrors: Record<string, string> = {};
    const hasUniqueId =
      !!manualData.mpn?.trim() ||
      !!manualData.sku?.trim() ||
      !!manualData.upc_ean_gtin?.trim() ||
      !!manualData.model?.trim();
    if (!hasUniqueId) {
      newErrors.unique_identifier =
        "Provide at least one: MPN, SKU, UPC/EAN/GTIN, or Model";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notify.error("Missing required field", "Add a unique identifier");
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
        sourceUrl: `manual-input-${manualData.sku || manualData.mpn || ""}`,
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
  const handleDownloadCleanedProject = async (pid: string) => {
    try {
      const blob = await cleansingService.downloadCleanedProject(pid);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleaned_project_${pid}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify.success("Download started");
    } catch (error) {
      console.error("Failed to download cleaned project:", error);
      notify.error("Failed to download cleaned project");
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
    for (let i = 1; i <= 8; i++)
      imageHeaders.push(`image_name_${i}`, `image_url_${i}`);
    const videoHeaders: string[] = [];
    for (let i = 1; i <= 3; i++)
      videoHeaders.push(`video_name_${i}`, `video_url_${i}`);
    const docHeaders: string[] = [];
    for (let i = 1; i <= 5; i++)
      docHeaders.push(`document_name_${i}`, `document_url_${i}`);
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
        `validation_uom${i}`,
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
  const activeProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );
  const activeProjectCreatedAt = useMemo(() => {
    if (!activeProject) return "";
    const dt = new Date((activeProject as any).created_at);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [activeProject]);
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Product Input Data Sources
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Import in bulk via Excel/PDF or add products manually
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode("sources")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                viewMode === "sources"
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Sources
            </button>
            <button
              onClick={() => setViewMode("overview")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                viewMode === "overview"
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Projects Overview
            </button>
          </div>

          <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>
      </div>
      {projectId && (
        <div className="bg-white border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-700" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-blue-600">
                Active Project
              </div>
              <div className="text-sm font-semibold text-slate-900 truncate">
                {activeProject?.name || "Unknown"}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap">
            {activeProjectCreatedAt ? `Created: ${activeProjectCreatedAt}` : ""}
          </div>
        </div>
      )}
      {showProjectModal && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            Create New Project
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-start">
            <div className="w-full">
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
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Operation Mode
              </label>
              <select
                value={operationMode}
                onChange={(e) => {
                  setOperationMode(e.target.value as OperationMode);
                  setShowUseCaseDropdown(false);
                }}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md text-slate-700 flex items-center justify-between hover:bg-slate-50"
              >
                <option value="aggregation"> Aggregation</option>
                <option value="cleaning"> Cleaning</option>
                <option value="enrichment"> Enrichment</option>
                <option value="pdf_extraction">PDF Extraction</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {operationMode === "aggregation"
                  ? "Discover, extract, and enrich from external sources"
                  : operationMode === "enrichment"
                    ? "Backfill missing attributes and validate existing data"
                    : operationMode === "cleaning"
                      ? "Clean and standardize existing product data"
                      : "Extract product data from PDFs and web sources"}{" "}
              </p>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Use Cases
              </label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUseCaseDropdown(!showUseCaseDropdown);
                  }}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-700 flex items-center justify-between hover:bg-slate-50 truncate"
                >
                  <span
                    className={
                      selectedUseCase ? "text-slate-700" : "text-slate-500"
                    }
                  >
                    {selectedUseCase ||
                      `Select ${
                        operationMode === "aggregation"
                          ? "Aggregation"
                          : operationMode === "enrichment"
                            ? "Enrichment"
                            : operationMode === "pdf_extraction"
                              ? "PDF Extraction"
                              : "Cleaning"
                      } Use Case`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      showUseCaseDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showUseCaseDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {useCaseOptions.map((useCase) => (
                      <button
                        key={useCase}
                        type="button"
                        onClick={() => handleSelectUseCase(useCase)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          selectedUseCase === useCase
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {useCase}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={!projectName.trim() || loading || !selectedUseCase}
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
      {viewMode === "overview" &&
        !projectId &&
        (overviewLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <ProjectsOverviewTab
            projects={projectsOverview}
            onOpenProject={(id) => {
              const project = projects.find((p) => p.id === id);
              if (project) {
                setSelectedProject(project);
                setOperationMode(project.operation_mode as OperationMode);
                setSelectedUseCase(project.use_case || "");
                loadSourcesForProject(id);
                onProjectSelect?.(id);
                setViewMode("sources");
              }
            }}
          />
        ))}
      {viewMode === "sources" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-6">
              <div className="px-6 pt-5 border-b border-slate-200">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      setUiTab("bulk");
                      setActiveMode("bulk");
                    }}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      uiTab === "bulk"
                        ? "text-blue-600 border-blue-600"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Import
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUiTab("importPdf");
                      setActiveMode("bulk");
                    }}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      uiTab === "importPdf"
                        ? "text-blue-600 border-blue-600"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Import PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUiTab("manual");
                      setActiveMode("manual");
                    }}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      uiTab === "manual"
                        ? "text-blue-600 border-blue-600"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                    Manual Input
                  </button>
                </div>
              </div>
              <div className="p-6">
                {uiTab === "importPdf" && (
                  <>
                    {operationMode === "pdf_extraction" &&
                    selectedUseCase?.includes(
                      "Title & Description Based PDF Extraction",
                    ) &&
                    projectId &&
                    !showProjectModal ? (
                      <div className="space-y-5">
                        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-teal-600" />
                            <h4 className="font-semibold text-teal-900">
                              Import PDF
                            </h4>
                          </div>
                          <p className="text-sm text-teal-700">
                            Upload one or more PDFs and optionally provide
                            product details and/or multiple identifiers (MPNs or
                            product titles). The system will extract matching
                            products.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            MPNs / Product Titles (optional)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={currentImportIdentifier}
                              onChange={(e) =>
                                setCurrentImportIdentifier(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddImportIdentifier();
                                }
                              }}
                              placeholder="e.g., 203-602, ThinkPad X1 (comma/newline supported)"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button
                              onClick={handleAddImportIdentifier}
                              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                              type="button"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          {importIdentifiers.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {importIdentifiers.map((id) => (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-sm"
                                >
                                  {id}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveImportIdentifier(id)
                                    }
                                  >
                                    <X className="w-3 h-3 text-slate-500" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Product Details (optional)
                          </label>
                          <input
                            type="text"
                            value={productDetails}
                            onChange={(e) => setProductDetails(e.target.value)}
                            placeholder="e.g., 'locking pliers', '14-inch laptop, gen 11', 'wireless access point'"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <p className="text-xs text-slate-500 mt-2">
                            Optional context to help extraction. If you add
                            MPNs/titles, details will be combined with each
                            item.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            PDF File(s) <span className="text-red-500">*</span>
                          </label>
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50 text-center">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                              <Upload className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                              Drop PDF(s) here or click to browse
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Only PDF files are supported
                            </div>
                            <input
                              ref={importPdfInputRef}
                              type="file"
                              accept=".pdf"
                              multiple
                              onChange={(e) =>
                                handleAddImportPdfs(e.target.files)
                              }
                              className="mt-4 block w-full text-sm"
                            />
                          </div>
                          {importPdfFiles.length > 0 && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-44 overflow-auto">
                              <p className="text-xs font-semibold text-slate-600 mb-2">
                                {importPdfFiles.length} PDF(s) selected:
                              </p>
                              {importPdfFiles.map((f, idx) => (
                                <div
                                  key={`${f.name}-${idx}`}
                                  className="flex items-center justify-between gap-2 py-1 text-xs"
                                >
                                  <span className="truncate flex-1">
                                    {f.name}
                                  </span>
                                  <span className="text-slate-400">
                                    {(f.size / 1024).toFixed(1)} KB
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImportPdf(idx)}
                                    className="p-1 hover:bg-slate-200 rounded"
                                    title="Remove"
                                  >
                                    <X className="w-3.5 h-3.5 text-slate-600" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleImportPdfExtraction}
                          disabled={
                            importExtracting || importPdfFiles.length === 0
                          }
                          className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 font-semibold"
                        >
                          {importExtracting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Import & Extract
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Select a project configured with{" "}
                        <strong>
                          Title & Description Based PDF Extraction
                        </strong>
                        .
                      </div>
                    )}
                  </>
                )}
                {uiTab === "bulk" && (
                  <>
                    {activeMode === "bulk" &&
                    operationMode === "pdf_extraction" &&
                    selectedUseCase?.includes("Fresh PDF Aggregation") &&
                    projectId &&
                    !showProjectModal ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-blue-900">
                              Fresh PDF Aggregation
                            </h4>
                          </div>
                          <p className="text-sm text-blue-700">
                            Enter MPN, Model Number, or UPC. The system will
                            search manufacturer websites and automatically
                            extract product data. Products will be created and
                            ready for aggregation.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            MPN / Model Number / UPC
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={currentFreshMpn}
                              onChange={(e) =>
                                setCurrentFreshMpn(e.target.value)
                              }
                              onKeyPress={(e) =>
                                e.key === "Enter" && handleAddFreshMpn()
                              }
                              placeholder="e.g., 203-602, iPhone 14, 123456789012"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={handleAddFreshMpn}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {freshMpns.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Items to Process ({freshMpns.length})
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {freshMpns.map((mpn) => (
                                <span
                                  key={mpn}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-sm"
                                >
                                  {mpn}
                                  <button
                                    onClick={() => handleRemoveFreshMpn(mpn)}
                                  >
                                    <X className="w-3 h-3 text-slate-500" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleFreshAggregation}
                          disabled={freshAggregating || freshMpns.length === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {freshAggregating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving MPNs...
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4" />
                              Save MPNs for Extraction
                            </>
                          )}
                        </button>
                      </div>
                    ) : operationMode === "pdf_extraction" &&
                      selectedUseCase?.includes("Structured PDF Extraction") &&
                      projectId &&
                      !showProjectModal ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            <h4 className="font-semibold text-green-900">
                              Structured PDF Extraction
                            </h4>
                          </div>
                          <p className="text-sm text-green-700">
                            Upload a structured PDF and provide the MPN. The
                            system will extract product data only for that MPN
                            from the PDF.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            MPN
                          </label>
                          <input
                            type="text"
                            value={structuredMpn}
                            onChange={(e) => setStructuredMpn(e.target.value)}
                            placeholder="e.g., 203-602"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            PDF File
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (
                                file &&
                                file.type !== "application/pdf" &&
                                !file.name.toLowerCase().endsWith(".pdf")
                              ) {
                                notify.error(
                                  "Invalid file",
                                  "Please select a valid PDF file",
                                );
                                e.target.value = "";
                                return;
                              }
                              setStructuredPdfFile(file || null);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          />
                          {structuredPdfFile && (
                            <p className="text-sm text-green-600 mt-2">
                              Selected: {structuredPdfFile.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handleStructuredExtraction}
                          disabled={
                            structuredExtracting ||
                            !structuredPdfFile ||
                            !structuredMpn
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md"
                        >
                          {structuredExtracting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          {structuredExtracting
                            ? "Saving..."
                            : "Save for Extraction"}
                        </button>
                      </div>
                    ) : operationMode === "pdf_extraction" &&
                      selectedUseCase?.includes(
                        "Multi-PDF & Multi-MPN Data Extraction.",
                      ) &&
                      projectId &&
                      !showProjectModal ? (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <h4 className="font-semibold text-purple-900">
                              Multi-PDF & Multi-MPN Data Extraction.
                            </h4>
                          </div>
                          <p className="text-sm text-purple-700">
                            Upload multiple PDFs and an Excel file with MPNs.
                            The system will match each MPN to the correct PDF
                            and extract product data.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            PDF Files (Select multiple){" "}
                            <span className="text-red-500">*</span>
                            {multiPdFs.length > 0 && (
                              <span
                                className={`ml-2 text-xs ${multiPdFs.length >= 20 ? "text-red-500" : "text-slate-500"}`}
                              >
                                ({multiPdFs.length}/20)
                              </span>
                            )}
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            multiple
                            disabled={multiPdFs.length >= 20}
                            onChange={(e) => handleAddMultiPdFs(e.target.files)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {multiPdFs.length > 0 && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-200 max-h-40 overflow-y-auto">
                              {multiPdFs.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-xs py-1"
                                >
                                  <span className="truncate flex-1">
                                    {file.name}
                                  </span>
                                  <span className="text-slate-400 ml-2">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                  <button
                                    onClick={() => handleRemoveMultiPdf(index)}
                                    className="ml-2"
                                  >
                                    <X className="w-3 h-3 text-slate-500 hover:text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Excel File with MPNs{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                              <div className="flex-1">
                                <input
                                  ref={mpnExcelInputRef}
                                  type="file"
                                  accept=".xlsx,.xls,.csv"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    setMpnExcelFile(file);
                                    setMpnExcelUploading(true);

                                    try {
                                      const formData = new FormData();
                                      formData.append("file", file);
                                      const response =
                                        await extractionService.parseMpnsFromExcel(
                                          formData,
                                        );

                                      if (response.valid_mpns > 0) {
                                        const newMpns = response.mpns.filter(
                                          (mpn: string) =>
                                            !multiMpns.includes(mpn),
                                        );
                                        setMultiMpns([
                                          ...multiMpns,
                                          ...newMpns,
                                        ]);
                                        notify.success(
                                          "MPNs loaded from Excel",
                                          `${newMpns.length} MPNs found (${response.duplicates_removed} duplicates skipped)`,
                                        );
                                      } else {
                                        notify.warning(
                                          "No valid MPNs found in Excel file",
                                        );
                                      }
                                    } catch (error: any) {
                                      notify.error(
                                        "Failed to parse Excel",
                                        error.message,
                                      );
                                      setMpnExcelFile(null);
                                      if (mpnExcelInputRef.current)
                                        mpnExcelInputRef.current.value = "";
                                    } finally {
                                      setMpnExcelUploading(false);
                                    }
                                  }}
                                  className="block w-full text-sm"
                                />
                              </div>
                            </div>
                            {mpnExcelFile && (
                              <div className="mt-3 flex items-center justify-between bg-white p-2 rounded-md">
                                <div className="flex items-center gap-2">
                                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-slate-700">
                                    {mpnExcelFile.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    setMpnExcelFile(null);
                                    setMultiMpns([]);
                                    if (mpnExcelInputRef.current)
                                      mpnExcelInputRef.current.value = "";
                                  }}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              File should have an MPN column. Duplicates will be
                              skipped.
                            </p>
                          </div>
                        </div>

                        {multiMpns.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              MPNs to Process ({multiMpns.length}/50)
                            </label>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-200 max-h-32 overflow-y-auto">
                              {multiMpns.map((mpn) => (
                                <span
                                  key={mpn}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs border border-slate-200"
                                >
                                  {mpn}
                                  <button
                                    onClick={() => handleRemoveMultiMpn(mpn)}
                                  >
                                    <X className="w-3 h-3 text-slate-500 hover:text-red-500" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Add Individual MPN (Optional)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={currentMultiMpn}
                              onChange={(e) =>
                                setCurrentMultiMpn(e.target.value)
                              }
                              onKeyPress={(e) =>
                                e.key === "Enter" && handleAddMultiMpn()
                              }
                              placeholder="e.g., T19T"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                              disabled={multiMpns.length >= 50}
                            />
                            <button
                              onClick={handleAddMultiMpn}
                              disabled={multiMpns.length >= 50}
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={handleMultiExtraction}
                          disabled={
                            multiExtracting ||
                            multiPdFs.length === 0 ||
                            multiMpns.length === 0 ||
                            mpnExcelUploading
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 w-full justify-center"
                        >
                          {multiExtracting || mpnExcelUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {mpnExcelUploading
                                ? "Processing Excel..."
                                : "Saving..."}
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Save for Extraction ({multiPdFs.length} PDFs,{" "}
                              {multiMpns.length} MPNs)
                            </>
                          )}
                        </button>
                      </div>
                    ) : operationMode === "pdf_extraction" &&
                      selectedUseCase?.includes(
                        "Unstructured PDF Extraction",
                      ) &&
                      projectId &&
                      !showProjectModal ? (
                      <div className="space-y-4">
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-orange-600" />
                            <h4 className="font-semibold text-orange-900">
                              Unstructured PDF Extraction
                            </h4>
                          </div>
                          <p className="text-sm text-orange-700">
                            Upload an unstructured PDF and provide the MPN. The
                            system will extract product data using AI analysis
                            of the text.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            MPN
                          </label>
                          <input
                            type="text"
                            value={unstructuredMpn}
                            onChange={(e) => setUnstructuredMpn(e.target.value)}
                            placeholder="e.g., 203-602"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            PDF File
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (
                                file &&
                                file.type !== "application/pdf" &&
                                !file.name.toLowerCase().endsWith(".pdf")
                              ) {
                                notify.error(
                                  "Invalid file",
                                  "Please select a valid PDF file",
                                );
                                e.target.value = "";
                                return;
                              }
                              setUnstructuredPdfFile(file || null);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          />
                          {unstructuredPdfFile && (
                            <p className="text-sm text-orange-600 mt-2">
                              Selected: {unstructuredPdfFile.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handleUnstructuredExtraction}
                          disabled={
                            unstructuredExtracting ||
                            !unstructuredPdfFile ||
                            !unstructuredMpn
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                        >
                          {unstructuredExtracting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          {unstructuredExtracting
                            ? "Saving..."
                            : "Save for Extraction"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download Template
                          </button>
                          <p className="text-xs text-slate-500 mt-2">
                            Download the template, fill it with your product
                            data, and upload it below
                          </p>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Upload Excel file
                          </label>
                          <input
                            type="file"
                            disabled={!projectId}
                            ref={fileInputRef}
                            accept=".xlsx, .xls, .csv"
                            onChange={(e) =>
                              setBulkFile(e.target.files?.[0] || null)
                            }
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
                    )}
                  </>
                )}
                {uiTab === "manual" && (
                  <div>
                    {errors.unique_identifier && (
                      <p className="text-red-600 text-sm mb-3">
                        {errors.unique_identifier}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={manualData.title}
                          onChange={(e) =>
                            setManualData({
                              ...manualData,
                              title: e.target.value,
                            })
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
                            setManualData({
                              ...manualData,
                              brand: e.target.value,
                            })
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
                          SKU (unique identifier)
                        </label>
                        <input
                          type="text"
                          value={manualData.sku}
                          onChange={(e) =>
                            setManualData({
                              ...manualData,
                              sku: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., IPHN14-BLK-128"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          MPN (unique identifier)
                        </label>
                        <input
                          type="text"
                          value={manualData.mpn}
                          onChange={(e) =>
                            setManualData({
                              ...manualData,
                              mpn: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., MPN123456"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Model (unique identifier)
                        </label>
                        <input
                          type="text"
                          value={manualData.model}
                          onChange={(e) =>
                            setManualData({
                              ...manualData,
                              model: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., iPhone 14"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          UPC/EAN/GTIN (unique identifier)
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
                            setManualData({
                              ...manualData,
                              price: e.target.value,
                            })
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
                            setManualData({
                              ...manualData,
                              stock: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 100"
                        />
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
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold text-slate-900">
                  Projects
                </h4>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredProjects.length}
                </span>
              </div>
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((v) => !v)}
                  className={`h-9 px-3 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 ${
                    dateRange
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  {dateFilterMode === "all"
                    ? "All time"
                    : dateFilterMode === "day"
                      ? "Day"
                      : dateFilterMode === "week"
                        ? "Week"
                        : "Month"}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {calendarOpen && (
                  <div className="absolute right-0 mt-2 w-[320px] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        Filter by created date
                      </div>
                      <button
                        type="button"
                        onClick={() => setCalendarOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-100"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          Mode
                        </label>
                        <select
                          value={dateFilterMode}
                          onChange={(e) => {
                            const mode = e.target.value as DateFilterMode;
                            setDateFilterMode(mode);
                          }}
                          className="w-full h-9 px-3 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="all">All time</option>
                          <option value="day">Day</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          Pick date
                        </label>
                        <input
                          type="date"
                          max={toDateInputValue(new Date())}
                          value={toDateInputValue(dateAnchor)}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            const [yy, mm, dd] = v.split("-").map(Number);
                            const picked = new Date(yy, mm - 1, dd);
                            const today = new Date();
                            const todayOnly = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate(),
                            );
                            setDateAnchor(
                              picked > todayOnly ? todayOnly : picked,
                            );
                          }}
                          disabled={dateFilterMode === "all"}
                          className="w-full h-9 px-3 border border-slate-200 rounded-xl text-sm disabled:opacity-50"
                        />
                      </div>
                    </div>
                    {dateRange && (
                      <div className="mt-3 text-xs text-slate-600">
                        Showing projects created:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatRange(dateRange.start, dateRange.end)}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilterMode("all");
                          setCalendarOpen(false);
                        }}
                        className="flex-1 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarOpen(false)}
                        className="flex-1 h-9 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 text-sm">
                    {searchQuery
                      ? `No projects found matching "${searchQuery}"`
                      : "No projects yet"}
                  </p>
                </div>
              ) : (
                filteredProjects.map((project, index) => {
                  const selected = project.id === projectId;
                  const expanded = expandedProjects.has(project.id);
                  return (
                    <div
                      key={project.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        selected
                          ? "border-blue-500 bg-blue-50/40"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              selected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
                              Project {index + 1}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {project.name}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                                {project.operation_mode}
                              </span>
                              {project.use_case && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  {project.use_case}
                                </span>
                              )}
                              {selected && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                  Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setOperationMode(
                                project.operation_mode as OperationMode,
                              );
                              setSelectedUseCase(project.use_case || "");
                              loadSourcesForProject(project.id);
                              onProjectSelect?.(project.id);
                            }}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                              selected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {selected ? "Selected" : "Select"}
                          </button>
                          <button
                            onClick={() => toggleProject(project.id)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            type="button"
                            aria-label="Toggle project details"
                          >
                            {expanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="mt-4 border-t border-slate-200/70 pt-4">
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
                                const isCleaningProject =
                                  project.operation_mode === "cleaning";
                                const isEnrichmentProject =
                                  project.operation_mode === "enrichment";
                                const isPdfExtractionProject =
                                  project.operation_mode == "pdf_extraction";
                                const processStatus = isCleaningProject
                                  ? source.metadata?.cleaning_status ||
                                    source.metadata?.processing_status
                                  : isPdfExtractionProject
                                    ? source.status === "completed"
                                      ? "completed"
                                      : source.metadata?.processing_status
                                    : source.metadata?.processing_status;
                                const isCompleted =
                                  processStatus === "completed";
                                const isProcessing =
                                  processStatus === "processing";
                                const isFailed = processStatus === "failed";
                                const pendingLabel = isCleaningProject
                                  ? "Needs Cleaning"
                                  : isEnrichmentProject
                                    ? "Needs Enrichment"
                                    : isPdfExtractionProject
                                      ? "Needs extraction"
                                      : "Needs Aggregation";
                                const processingLabel = isCleaningProject
                                  ? "Cleaning..."
                                  : isEnrichmentProject
                                    ? "Enriching..."
                                    : "Aggregating...";
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
                                          extractionService.download(
                                            source.id,
                                            "input",
                                          )
                                        }
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                      >
                                        <Download className="w-3.5 h-3.5" />{" "}
                                        Input
                                      </button>
                                      {isCompleted ? (
                                        <button
                                          onClick={() =>
                                            isCleaningProject
                                              ? handleDownloadCleanedProject(
                                                  project.id,
                                                )
                                              : extractionService.download(
                                                  source.id,
                                                  "output",
                                                )
                                          }
                                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                                        >
                                          <Download className="w-3.5 h-3.5" />{" "}
                                          Output
                                        </button>
                                      ) : isProcessing ? (
                                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-600 italic">
                                          <Clock className="w-3.5 h-3.5 animate-spin" />{" "}
                                          {processingLabel}
                                        </div>
                                      ) : isFailed ? (
                                        <div
                                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg border border-red-100 cursor-help"
                                          title="Some products failed to process."
                                        >
                                          <XCircle className="w-3.5 h-3.5" />{" "}
                                          Failed
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-600 italic">
                                          <AlertCircle className="w-3.5 h-3.5" />{" "}
                                          {pendingLabel}
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
                  );
                })
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowProjectModal(true)}
              className="mt-6 w-full py-3 rounded-2xl border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      )}

      {showMpnExcelModal && <MpnExcelModal />}
    </div>
  );
}

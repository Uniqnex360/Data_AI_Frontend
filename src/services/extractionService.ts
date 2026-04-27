import api from "../lib/api.ts";
import { Source } from "../types/database.types.ts";
import { RawExtraction, ExtractionInput } from "../types/database.types";
export const extractionService = {
  async extractFromSource(input: ExtractionInput): Promise<any> {
    try {
      const { data } = await api.post("/sources/", input);
      return data;
    } catch (error) {
      console.error("Extraction failed", error);
      throw new Error("AI extraction failed to process source");
    }
  },
  async parseMpnsFromExcel(formData: FormData): Promise<any> {
  const { data } = await api.post('/extraction/pdf/parse-mpns-excel', formData);
  return data;
},
  async blindPdfExtraction(formData: FormData): Promise<{ status: string; batch_id: string; message: string; pdfs_count: number, products_created?: number; }> {
  try {
    const response = await api.post('/extraction/pdf/blind-pdf-extraction', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to upload blind PDF extraction:", error);
    const errorMessage = 
      error.response?.data?.detail || 
      error.message || 
      "Failed to upload PDFs for blind extraction";
    throw new Error(errorMessage);
  }
},
  async multiPdfExtraction(formData: FormData) {
    try {
      const response = await api.post(
        "/extraction/pdf/multi-pdf-extraction",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
           timeout: 120000,
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("Multi PDF Extraction failed", error);

      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Multi-PDF & Multi-MPN Data Extraction.";

      throw new Error(errorMessage);
    }
  },
  savePdfSource: async (formData: FormData) => {
    const response = await api.post(
      "/extraction/pdf/save-pdf-source",
      formData,
    );
    return response.data;
  },
  async savePendingMpns(data: {
    mpns: string[];
    project_id: string;
    use_case: string;
  }) {
    try {
      const response = await api.post(
        "/extraction/pdf/save-pending-mpns",
        data,
      );
      return response.data;
    } catch (error) {
      console.error(error);

      throw new Error("Failed to save mpn");
    }
  },
  async structuredExtraction(formData: FormData) {
    const response = await api.post(
      "/extraction/pdf/structured-extraction",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  async extractPdfForProduct(mpn: string, projectId: string) {
    try {
      const response = await api.post("/extraction/pdf/extract-pending", {
        mpn,
        project_id: projectId,
      });
      return response.data;
    } catch (error: any) {
      console.log("Error occured while extracting pdf from product", error);
      throw new Error(error);
    }
  },
  async freshAggregation(data: {
    mpns: string[];
    project_id: string;
    use_case: string;
  }) {
    const response = await api.post("/extraction/pdf/fresh-aggregation", data);
    return response.data;
  },
  async getBatchStatus(batchId: string) {
    try {
      const response = await api.get(`/extraction/pdf/batch-status/${batchId}`);
      return response.data;
    } catch (error: any) {
      console.log("Failed to get batch status", error);
      throw new Error(error);
    }
  },
  async batchAggregate(file: File, projectId?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (projectId) {
        formData.append("projectId", projectId);
      }
      const { data } = await api.post("/sources/batch-aggregate", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data;
    } catch (error) {
      console.error("Batch upload failed", error);
      throw error;
    }
  },
  async download(sourceId: string, type: "input" | "output") {
    try {
      const response = await api.get(`/sources/${sourceId}/download`, {
        params: { type },
        responseType: "blob",
      });
      if (!response.data || response.data.size === 0) {
        throw new Error("No data received from server");
      }
           const contentDisposition = response.headers["content-disposition"];
      let filename = "";
      if (contentDisposition) {
        const encodedMatch = contentDisposition.match(
          /filename\*=UTF-8''(.+?)(?:;|$)/,
        );
        if (encodedMatch) {
          filename = decodeURIComponent(encodedMatch[1]);
        } else {
          const fallbackMatch = contentDisposition.match(
            /filename[^;=\n]*=["']?([^"';\n]+)["']?/,
          );
          if (fallbackMatch) {
            let raw = fallbackMatch[1].trim();
            if ((raw.startsWith('"') && raw.endsWith('"')) || 
                (raw.startsWith("'") && raw.endsWith("'"))) {
              raw = raw.slice(1, -1);
            }
            filename = decodeURIComponent(raw);
          }
        }
      }
      console.log("📥 Download filename:", filename);
      if (!filename) {
        const contentType =
          response.headers["content-type"]?.toLowerCase() || "";
        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, "-");
        if (contentType.includes("pdf")) {
          filename = `input_${sourceId}_${timestamp}.pdf`;
        } else if (
          contentType.includes("csv") ||
          contentType.includes("text/csv")
        ) {
          filename = `input_${sourceId}_${timestamp}.csv`;
        } else if (
          contentType.includes("spreadsheet") ||
          contentType.includes("excel")
        ) {
          filename = `output_${sourceId}_${timestamp}.xlsx`;
        } else if (type === "input") {
          filename = `input_${sourceId}_${timestamp}.csv`;
        } else {
          filename = `output_${sourceId}_${timestamp}.xlsx`;
        }
      }
      filename = filename
        .replace(/\.\./g, "")
        .replace(/[\/\\:*?"<>|]/g, "_")
        .trim();
      if (!filename.includes(".")) {
        filename += type === "input" ? ".csv" : ".xlsx";
      }
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error: any) {
      console.error("Download Error:", error);
      if (error.response?.status === 404) {
        throw error("Download Failed", "The requested file was not found");
      } else if (error.response?.status === 403) {
        throw error(
          "Download Failed",
          "You do not have permission to download this file",
        );
      } else if (error.response?.status === 500) {
        throw error(
          "Download Failed",
          "Server error occurred while generating the file",
        );
      } else if (error.message === "No data received from server") {
        throw error("Download Failed", "The file appears to be empty");
      } else {
        throw error(
          "Download Failed",
          error.message || "An unexpected error occurred",
        );
      }
    }
  },
  async getSourcesByProject(projectId: string): Promise<Source[]> {
    try {
      const { data } = await api.get(`/sources/project/${projectId}`);
      return data || [];
    } catch (error) {
      console.error("Failed to load project sources", error);
      return [];
    }
  },
  async getAllSources(): Promise<Source[]> {
    try {
      const { data } = await api.get<Source[]>("/sources/");
      return data || [];
    } catch (error) {
      console.error("Failed to fetch sources", error);
      return [];
    }
  },
  async getRawExtractions(sourceId?: string): Promise<RawExtraction[]> {
    try {
      const { data } = await api.get<RawExtraction[]>("/extraction/", {
        params: { source_id: sourceId },
      });
      return data || [];
    } catch (error) {
      console.error("Failed to fetch extractions", error);
      return [];
    }
  },
 
  async triggerAggregation(sourceId: string) {
    try {
      if (!sourceId) throw new Error("Source Id is missing");
      const response = await api.post(`/sources/aggregate/${sourceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch extractions", error);
      return [];
    }
  },
};

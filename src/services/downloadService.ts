

const API_BASE = import.meta.env.VITE_API_URL || "";

export const downloadService = {
  
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
    const proxyUrl = `${API_BASE}/api/v1/sources/proxy-download?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      console.log("download response",response)
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || this.getFilenameFromUrl(url);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      
      window.open(url, "_blank");
    }
  },

  async downloadFiles(files: { url: string; filename: string }[]): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const { url, filename } = files[i];
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.downloadFile(url, filename);
    }
  },

  
  getFilenameFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const filename = pathname.split("/").pop() || "download";
      return decodeURIComponent(filename);
    } catch {
      return "download";
    }
  }
};
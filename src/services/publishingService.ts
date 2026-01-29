import type { PublishTarget } from '../types/database.types';
import api from '../lib/api';

export const publishingService = {
  
  async exportCatalog(): Promise<string> {
    const { data } = await api.post<{ excel_file: string }>('/batch-aggregate/');
    
    return data.excel_file.startsWith('http') 
      ? data.excel_file 
      : `${BASE_URL}${data.excel_file}`;
  },

  downloadFile(url: string, filename: string = 'export.xlsx') {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async getTargets(projectId: string): Promise<PublishTarget[]> {
    try {
      const { data } = await api.get<PublishTarget[]>(`/publishing/targets/${projectId}`);
      return data || [];
    } catch (error) {
      console.error('Failed to load targets:', error);
      return [];
    }
  },

  async createTarget(target: any) {
    const { data } = await api.post('/publishing/targets', target);
    return data;
  },

  async exportToCSV(projectId: string): Promise<void> {
    try {
      const response = await api.get(`/publishing/export/${projectId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      this.downloadFile(url, `catalog_export_${projectId}.csv`);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV Export Error:", error);
      throw new Error("Failed to generate CSV export");
    }
  }
};
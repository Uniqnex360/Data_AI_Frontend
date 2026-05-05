import api from "../lib/api";
import { RuleCategory, RuleStatus, BusinessRuleCreate, BusinessRule, BusinessRuleListResponse, BusinessRuleUpdate, RulePrompt, RulePromptCreate, RulePromptUpdate, RuleExecuteRequest, RuleExecuteResponse, RuleExecutionLog } from '../types/business-rules.types';
export const businessRulesService = {
  async createRule(rule: BusinessRuleCreate): Promise<BusinessRule> {
    try {
      const { data } = await api.post<BusinessRule>("/business-rules/", rule);
      return data;
    } catch (error: any) {
      console.error("Failed to create rule:", error);
       throw error;
    }
  },
  async getCategoryPrompts(): Promise<any[]> {
  try {
    const { data } = await api.get("/business-rules/category-prompts");
    return data;
  } catch (error: any) {
    console.error("Error fetching category prompts:", error);
    throw error?.response?.data || error;
  }
},

async createCategoryPrompt(payload: any): Promise<any> {
  try {
    const { data } = await api.post("/business-rules/category-prompts", payload);
    return data;
  } catch (error: any) {
    console.error("Error creating category prompt:", error);
    throw error?.response?.data || error;
  }
},

async updateCategoryPrompt(id: string, payload: any): Promise<any> {
  try {
    const { data } = await api.put(`/business-rules/category-prompts/${id}`, payload);
    return data;
  } catch (error: any) {
    console.error("Error updating category prompt:", error);
    throw error?.response?.data || error;
  }
},

async deleteCategoryPrompt(id: string): Promise<void> {
  try {
    await api.delete(`/business-rules/category-prompts/${id}`);
  } catch (error: any) {
    console.error("Error deleting category prompt:", error);
    throw error?.response?.data || error;
  }
},

async getBrandPrompts(): Promise<any[]> {
  try {
    const { data } = await api.get("/business-rules/brand-prompts");
    return data;
  } catch (error: any) {
    console.error("Error fetching brand prompts:", error);
    throw error?.response?.data || error;
  }
},

async createBrandPrompt(payload: any): Promise<any> {
  try {
    const { data } = await api.post("/business-rules/brand-prompts", payload);
    return data;
  } catch (error: any) {
    console.error("Error creating brand prompt:", error);
    throw error?.response?.data || error;
  }
},

async updateBrandPrompt(id: string, payload: any): Promise<any> {
  try {
    const { data } = await api.put(`/business-rules/brand-prompts/${id}`, payload);
    return data;
  } catch (error: any) {
    console.error("Error updating brand prompt:", error);
    throw error?.response?.data || error;
  }
},

async deleteBrandPrompt(id: string): Promise<void> {
  try {
    await api.delete(`/business-rules/brand-prompts/${id}`);
  } catch (error: any) {
    console.error("Error deleting brand prompt:", error);
    throw error?.response?.data || error;
  }
},
  async getAllRules(params?: {
    category?: RuleCategory;
    status?: RuleStatus;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<BusinessRuleListResponse> {
    try {
      const { data } = await api.get<BusinessRuleListResponse>(
        "/business-rules/",
        { params }
      );
      return data;
    } catch (error) {
      console.error("Failed to fetch rules:", error);
      return { rules: [], total: 0, category_counts: {} };
    }
  },
  async getRule(ruleId: string): Promise<BusinessRule> {
    try {
      const { data } = await api.get<BusinessRule>(
        `/business-rules/${ruleId}`
      );
      return data;
    } catch (error: any) {
      console.error("Failed to fetch rule:", error);
      throw new Error(error.response?.data?.detail || "Rule not found");
    }
  },
  async updateRule(
    ruleId: string,
    updates: BusinessRuleUpdate
  ): Promise<BusinessRule> {
    try {
      const { data } = await api.put<BusinessRule>(
        `/business-rules/${ruleId}`,
        updates
      );
      return data;
    } catch (error: any) {
      console.error("Failed to update rule:", error);
      throw new Error(
        error.response?.data?.detail || "Failed to update rule"
      );
    }
  },
  async updateRuleStatus(ruleIdentifier: string, status: RuleStatus): Promise<BusinessRule> {
  try {
    const { data } = await api.patch<BusinessRule>(
      `/business-rules/${ruleIdentifier}/status`,
      null, 
      { params: { new_status: status } }
    );
    return data;
  } catch (error: any) {
    console.error("Failed to update rule status:", error);  
    throw new Error(
      error.response?.data?.detail || "Failed to update rule status"  
    );
  }
},
async updatePromptStatus(promptId: string, status: RuleStatus): Promise<RulePrompt> {
  try {
    const { data } = await api.patch<RulePrompt>(
      `/business-rules/prompts/${promptId}/status`,
      null,
      { params: { new_status: status } }
    );
    return data;
  } catch (error: any) {
    console.error("Failed to update prompt status:", error);  
    throw new Error(
      error.response?.data?.detail || "Failed to update prompt status"  
    );
  }
},
  async createPrompt(ruleIdentifier:string,prompt:RulePromptCreate):Promise<RulePrompt>{
    try {
      const {data}=await api.post<RulePrompt>(`/business-rules/${ruleIdentifier}/prompts`,prompt)
      return data
    } catch (error) {
      console.error('Failed to create prompt',error)
      throw new Error(
        error.response?.data?.detail || "Failed to create prompt"
      );
    }
  },
  async getPromptsForRule(ruleIdentifier:string):Promise<RulePrompt[]>{
    try {
      const {data}=await api.get<RulePrompt[]>(`/business-rules/${ruleIdentifier}/prompts`)
      return data
    } catch (error) {
      console.error("Failed to get prompts",error)
      throw new Error(
        error.response?.data?.detail || "Failed to get prompts"
      );
    }
  },
  async updatePrompt(promptId:string,updates:RulePromptUpdate):Promise<RulePrompt>{
    try {
      const {data}=await api.put<RulePrompt>(`/business-rules/prompts/${promptId}`,updates)
      return data
    } catch (error) {
      console.error("Failed to update prompt:", error);
       throw new Error(
        error.response?.data?.detail || "Failed to get prompts"
      );
    }
  },
  async executeRule(
    ruleId: string,
    request: RuleExecuteRequest
  ): Promise<RuleExecuteResponse> {
    try {
      const { data } = await api.post<RuleExecuteResponse>(
        `/business-rules/${ruleId}/execute`,
        request
      );
      return data;
    } catch (error: any) {
      console.error("Failed to execute rule:", error);
      throw new Error(
        error.response?.data?.detail || "Failed to get prompts"
      );
    }
  },
  async getRuleLogs(
    ruleId: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<{
    logs: RuleExecutionLog[];
    total: number;
    skip: number;
    limit: number;
  }> {
    try {
      const { data } = await api.get(`/business-rules/${ruleId}/logs`, {
        params: { skip, limit },
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      return { logs: [], total: 0, skip, limit };
    }
  },
};
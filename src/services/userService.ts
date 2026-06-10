import api from "../lib/api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

export interface CreateUserPayload {
  email: string;
  full_name: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export const userService = {
  // GET all users (Admin only)
  getAll: async (): Promise<User[]> => {
    try {
      const res = await api.get("/users/");
      return res.data;
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to fetch users";
      throw new Error(message);
    }
  },

  // CREATE a new user
  create: async (payload: CreateUserPayload): Promise<User> => {
    try {
      const res = await api.post("/users/", payload);
      return res.data;
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to create user";
      throw new Error(message);
    }
  },

  // UPDATE a user
  update: async (userId: string, payload: UpdateUserPayload): Promise<User> => {
    try {
      const res = await api.patch(`/users/${userId}`, payload);
      return res.data;
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to update user";
      throw new Error(message);
    }
  },

  // DELETE a user (Soft delete - sets is_active = false)
  delete: async (userId: string): Promise<void> => {
    try {
      await api.delete(`/users/${userId}`);
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to deactivate user";
      throw new Error(message);
    }
  },

  // RESET PASSWORD
  resetPassword: async (userId: string, newPassword: string): Promise<void> => {
    try {
      await api.patch(`/users/${userId}/reset-password`, { password: newPassword });
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to reset password";
      throw new Error(message);
    }
  },
};
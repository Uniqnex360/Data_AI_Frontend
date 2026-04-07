import { AuthUser, UserRole } from '../types/business-rules.types';

export function getStoredToken() {
  return localStorage.getItem("token");
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function hasRole(...roles: UserRole[]) {
  const user = getStoredUser();
  return !!user && roles.includes(user.role);
}
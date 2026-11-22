import { api } from "./client";

export type User = {
  id: string;
  name: string;
  email: string;
  target_role: string | null;
  avatar_url: string | null;
};

export function register(name: string, email: string, password: string) {
  return api<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return api<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return api<void>("/api/auth/logout", { method: "POST" });
}

export function getProfile() {
  return api<User>("/api/profile");
}

export function updateProfile(fields: { name?: string; target_role?: string | null }) {
  return api<User>("/api/profile", { method: "PATCH", body: JSON.stringify(fields) });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return api<void>("/api/profile/password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<User>("/api/profile/avatar", { method: "PUT", body: form });
}

import { api } from "./client";

export type RoleOption = {
  position: number;
  name: string;
  reason: string;
};

export type RoleRecommendations = {
  roles: RoleOption[];
  /** The role the candidate chose, or null when none is chosen yet. */
  selected_role: string | null;
};

/** Returns the five suggested roles for the current resume, generating them the first time. */
export function getRoleRecommendations() {
  return api<RoleRecommendations>("/api/role-recommendations");
}

/** Saves the candidate's choice by its position (1 to 5) in the list. */
export function selectRole(position: number) {
  return api<RoleRecommendations>("/api/role-recommendations/selection", {
    method: "POST",
    body: JSON.stringify({ position }),
  });
}


export const ROLES = [
  "ADMIN",
  "ENSEIGNANT",
  "ETUDIANT",
] as const;

export type Role = (typeof ROLES)[number];

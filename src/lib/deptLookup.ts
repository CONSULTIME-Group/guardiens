import { DEPT_NAMES } from "@/lib/departments";
import { DEPT_ADJACENCY } from "@/data/departmentAdjacency";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const NAME_TO_CODE: Record<string, string> = Object.entries(DEPT_NAMES).reduce(
  (acc, [code, name]) => {
    acc[norm(name)] = code;
    return acc;
  },
  {} as Record<string, string>,
);

/** Code département à partir d'un nom ou d'un slug (« Haute-Savoie », « haute-savoie »). */
export const deptCodeFromName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  return NAME_TO_CODE[norm(name)] ?? null;
};

/** Noms des départements limitrophes d'un département donné par son nom. */
export const neighborDeptNames = (name: string | null | undefined): string[] => {
  const code = deptCodeFromName(name);
  if (!code) return [];
  return (DEPT_ADJACENCY[code] || []).map((c) => DEPT_NAMES[c]).filter(Boolean);
};

export const deptSlug = (name: string) => norm(name);

export interface DepartmentCityRow {
  department?: string | null;
  slug?: string | null;
  published?: boolean | null;
}

export declare function isPublishedCityRow(row: DepartmentCityRow | null | undefined): boolean;
export declare function departmentsWithPublishedCity(cityRows: DepartmentCityRow[] | null | undefined): Set<string>;
export declare function isDepartmentIndexable(
  page: { noindex?: boolean | null } | null | undefined,
  publishedCityCount: number,
): boolean;

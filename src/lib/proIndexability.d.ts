export interface ProIndexabilityInput {
  slug?: string | null;
  raison_sociale?: string | null;
  is_demo?: boolean | null;
  status?: string | null;
}

export declare const DEMO_SLUG_PREFIX: string;
export declare function isDemoPro(pro: ProIndexabilityInput | null | undefined): boolean;
export declare function isProIndexable(pro: ProIndexabilityInput | null | undefined): boolean;

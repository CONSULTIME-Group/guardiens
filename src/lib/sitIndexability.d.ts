export declare const MIN_TITLE_LENGTH: number;
export declare const MIN_RICH_TEXT_LENGTH: number;
export declare const RICH_TEXT_FIELDS: string[];
export declare const NON_INDEXABLE_STATUSES: string[];

export interface SitRichnessInput {
  title?: string | null;
  owner_message?: string | null;
  daily_routine?: string | null;
  specific_expectations?: string | null;
  [key: string]: unknown;
}

export declare function sitRichTextLength(sit: SitRichnessInput | null | undefined): number;
export declare function sitRichnessRejectionReason(
  sit: SitRichnessInput | null | undefined,
): "titre_trop_court" | "contenu_insuffisant" | null;
export declare function isSitRichEnough(sit: SitRichnessInput | null | undefined): boolean;
export declare function isClosedSitStatus(status: string | null | undefined): boolean;

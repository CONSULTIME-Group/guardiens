export interface SitterIndexabilityInput {
  bio?: string | null;
  motivation?: string | null;
  identityVerified?: boolean | null;
  galleryCount?: number | null;
}

export declare const MIN_SITTER_BIO_LENGTH: number;
export declare function hasSubstantialSitterBio(input: SitterIndexabilityInput | null | undefined): boolean;
export declare function hasSitterTrustSignal(input: SitterIndexabilityInput | null | undefined): boolean;
export declare function isSitterProfileIndexable(input: SitterIndexabilityInput | null | undefined): boolean;

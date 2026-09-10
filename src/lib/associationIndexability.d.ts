export interface AssociationIndexabilityInput {
  description?: string | null;
}

export declare const ASSOCIATION_MIN_DESCRIPTION_LENGTH: number;
export declare function isAssociationIndexable(
  association: AssociationIndexabilityInput | null | undefined,
): boolean;

/**
 * Type de données minimal d'une annonce, partagé par les vues Owner/Sitter.
 */
export interface SitData {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  flexible_dates: boolean | null;
  specific_expectations: string | null;
  open_to: string[] | null;
  status: string;
  user_id: string;
  property_id: string;
  max_applications: number | null;
  accepting_applications: boolean;
}

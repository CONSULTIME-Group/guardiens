/**
 * Capitalize a first name for display purposes only.
 * Never modify the database value.
 */
export const capitalizeName = (name?: string | null): string => {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

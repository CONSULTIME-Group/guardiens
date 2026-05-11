/**
 * Shared password strength validator (used by Register & Settings).
 * Aligned with the strict rules enforced server-side (Supabase HIBP + min length).
 */

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

export const getPasswordStrength = (pw: string): PasswordStrength => {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: "", color: "" },
    1: { label: "Faible", color: "bg-strength-weak" },
    2: { label: "Moyen", color: "bg-strength-medium" },
    3: { label: "Bon", color: "bg-strength-good" },
    4: { label: "Fort", color: "bg-strength-strong" },
  };
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
};

const COMMON_WEAK_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "azertyui", "azerty123",
  "password", "password1", "password123", "motdepasse", "motdepasse1",
  "qwertyui", "qwerty123", "iloveyou", "iloveyou1", "guardiens",
  "guardiens1", "guardiens123", "bonjour1", "bonjour12", "soleil123",
  "abcdefgh", "abc12345", "111111111", "00000000",
]);

export const isObviouslyWeak = (pw: string): boolean => {
  const lower = pw.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lower)) return true;
  if (/^(.)\1+$/.test(pw)) return true;
  if (/^(?:0123456789|1234567890|9876543210|0987654321)$/.test(pw)) return true;
  return false;
};

/** Returns an error message if invalid, null otherwise. */
export const validateStrongPassword = (pw: string): string | null => {
  if (pw.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  const strength = getPasswordStrength(pw);
  if (strength.score < 3) return "Mot de passe trop simple. Mélangez majuscules, minuscules, chiffres ou symboles.";
  if (isObviouslyWeak(pw)) return "Ce mot de passe est trop courant. Choisissez-en un autre.";
  return null;
};

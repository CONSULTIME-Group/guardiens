import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Plain email — never rendered into the DOM until the user clicks reveal. */
  email: string;
  label?: string;
}

/**
 * F-08 anti-scraping email reveal.
 * The address is kept in component state and only injected into the DOM
 * (as a clickable mailto link) after a user interaction, which defeats
 * most static HTML scrapers.
 */
export default function ObfuscatedEmail({ email, label = "Email" }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!email) return null;

  if (!revealed) {
    return (
      <p className="flex items-center gap-2 flex-wrap">
        <span>{label} :</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRevealed(true)}
        >
          Afficher l'email
        </Button>
      </p>
    );
  }

  return (
    <p>
      {label} :{" "}
      <a href={`mailto:${email}`} className="underline">
        {email}
      </a>
    </p>
  );
}

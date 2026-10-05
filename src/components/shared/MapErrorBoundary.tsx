import { Component, type ReactNode } from "react";

/**
 * Lot F2 : une carte Leaflet qui échoue (couche ajoutée ou retirée sur une
 * carte déjà détruite, "_leaflet_id in null", "_removePath") ne fait jamais
 * tomber la page. La carte disparaît, le reste s'affiche. Rien n'est
 * journalisé en erreur bloquante : c'est un repli silencieux.
 */
export class MapErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.warn("[MapErrorBoundary] carte retirée :", error?.message);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

export default MapErrorBoundary;

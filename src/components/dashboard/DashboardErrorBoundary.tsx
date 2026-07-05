import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/errorLogger";
import { trackEvent } from "@/lib/analytics";

interface Props {
  /** Identifiant de la section (ex: "OwnerDashboard", "SitterDashboard", "NearbyHelpers"). */
  section: string;
  /** Libellé affiché à l'utilisateur. */
  label?: string;
  children: ReactNode;
  /** Si true, fallback compact (pour blocs internes). Sinon, fallback pleine zone. */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  reportSent: boolean;
}

/**
 * Error boundary dédiée aux dashboards : affiche un fallback visible,
 * remonte l'erreur via reportError + analytics (dashboard_error), et
 * permet à l'utilisateur de retenter ou signaler.
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorId: null, reportSent: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const errorId = Math.random().toString(36).slice(2, 10).toUpperCase();
    this.setState({ errorId });

    const componentName = (() => {
      const stack = info.componentStack ?? "";
      const match = stack.match(/^\s*(?:in\s+|at\s+)?([A-Z][A-Za-z0-9_]+)/m);
      return match?.[1] ?? null;
    })();

    if (typeof console.groupCollapsed === "function") {
      console.groupCollapsed(
        `%c🛑 [Dashboard:${this.props.section}] ${error.name}: ${error.message}`,
        "color:#dc2626;font-weight:bold;",
      );
      console.error("Référence :", errorId);
      console.error("Section   :", this.props.section);
      if (error.stack) console.error("Stack     :\n" + error.stack);
      if (info.componentStack) console.error("Component stack :" + info.componentStack);
      console.groupEnd();
    }

    reportError(error, {
      source: "DashboardErrorBoundary",
      section: this.props.section,
      component: componentName,
      componentStack: info.componentStack?.slice(0, 1500),
      errorId,
    });

    try {
      trackEvent("dashboard_error", {
        source: "/dashboard",
        metadata: {
          section: this.props.section,
          error_id: errorId,
          error_name: error.name,
          error_message: error.message?.slice(0, 200),
          component: componentName,
        },
      });
    } catch {
      // silencieux
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null, reportSent: false });
  };

  handleReport = () => {
    if (!this.state.error) return;
    reportError(this.state.error, {
      source: "DashboardErrorBoundary:user_signal",
      section: this.props.section,
      errorId: this.state.errorId,
      userInitiated: true,
    });
    this.setState({ reportSent: true });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? "Cette section";
    const message = this.state.error?.message ?? "Erreur inconnue";

    if (this.props.compact) {
      return (
        <div
          role="alert"
          aria-live="polite"
          className="w-full rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-foreground">
                {label} n'a pas pu s'afficher
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2">{message}</div>
              {this.state.errorId && (
                <div className="text-[10px] font-mono text-muted-foreground/70">
                  Réf. {this.state.errorId}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="h-6 px-2 text-[11px] gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Réessayer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleReport}
                  disabled={this.state.reportSent}
                  className="h-6 px-2 text-[11px] gap-1"
                >
                  <Send className="h-3 w-3" />
                  {this.state.reportSent ? "Signalé" : "Signaler"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="my-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 rounded-full bg-destructive/10 p-2.5">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
                {label} n'a pas pu s'afficher
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Une erreur est survenue lors du chargement de ce bloc. Le reste du dashboard reste
                accessible.
              </p>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Détails techniques
              </summary>
              <pre className="mt-2 p-2 bg-muted/60 rounded text-[11px] overflow-auto max-h-40 whitespace-pre-wrap break-words">
                {message}
              </pre>
            </details>
            {this.state.errorId && (
              <div className="text-[11px] font-mono text-muted-foreground/70">
                Référence : {this.state.errorId} · section : {this.props.section}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Réessayer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleReport}
                disabled={this.state.reportSent}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {this.state.reportSent ? "Signalement envoyé" : "Signaler le problème"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default DashboardErrorBoundary;

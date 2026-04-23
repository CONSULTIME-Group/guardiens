import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Send, Home, PuzzleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/errorLogger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reportSent: boolean;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, reportSent: false, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Generate a short ID the user can quote in support
    const errorId = Math.random().toString(36).slice(2, 10).toUpperCase();
    this.setState({ errorId });
    reportError(error, {
      source: "ErrorBoundary",
      componentStack: info.componentStack?.slice(0, 1500),
      errorId,
    });
  }

  handleReset = () => {
    const isDynamicImportFailure = this.state.error?.message?.includes(
      "Failed to fetch dynamically imported module",
    );

    if (isDynamicImportFailure) {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null, reportSent: false, errorId: null });
  };

  handleReport = () => {
    if (this.state.error) {
      reportError(this.state.error, {
        source: "ErrorBoundary:user_signal",
        errorId: this.state.errorId,
        userInitiated: true,
      });
      this.setState({ reportSent: true });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const message = this.state.error?.message ?? "";
      const isBadComponent =
        message.includes("Component is not a function") ||
        message.includes("Element type is invalid") ||
        message.includes("is not a function") && message.includes("Component");

      if (isBadComponent) {
        return (
          <div
            className="min-h-[40vh] flex flex-col items-center justify-center gap-4 p-6 text-center bg-background"
            role="alert"
            aria-live="polite"
          >
            <div className="rounded-full bg-muted p-3">
              <PuzzleIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Cette section n'a pas pu s'afficher
              </h2>
              <p className="text-sm text-muted-foreground">
                Un composant n'a pas été chargé correctement. Le reste de la page reste accessible.
              </p>
              {this.state.errorId && (
                <p className="text-xs text-muted-foreground/60 font-mono pt-1">
                  Référence : {this.state.errorId}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Réessayer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleReport}
                disabled={this.state.reportSent}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {this.state.reportSent ? "Signalé" : "Signaler"}
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div
          className="min-h-[60vh] flex flex-col items-center justify-center gap-5 p-8 text-center bg-background"
          role="alert"
          aria-live="assertive"
        >
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>

          <div className="space-y-2 max-w-md">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Une erreur inattendue est survenue
            </h1>
            <p className="text-sm text-muted-foreground">
              Désolés pour la gêne. Notre équipe a été automatiquement prévenue
              et travaille à corriger ce problème.
            </p>
            {this.state.errorId && (
              <p className="text-xs text-muted-foreground/70 font-mono pt-1">
                Référence : {this.state.errorId}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Réessayer
            </Button>
            <Button onClick={() => window.location.assign("/")} className="gap-2">
              <Home className="h-4 w-4" /> Retour à l'accueil
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleReport}
              disabled={this.state.reportSent}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {this.state.reportSent ? "Signalement envoyé" : "Signaler le problème"}
            </Button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="mt-6 max-w-2xl w-full text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Détails techniques (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

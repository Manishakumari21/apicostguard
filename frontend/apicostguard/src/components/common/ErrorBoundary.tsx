import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Root + per-route error boundary: one crashing widget never blanks the desktop app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  componentDidCatch(err: unknown) {
    console.error("[app-error]", err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-md text-sm opacity-70">
          {this.state.message || "An unexpected error occurred."} Try reloading this view.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Try again
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

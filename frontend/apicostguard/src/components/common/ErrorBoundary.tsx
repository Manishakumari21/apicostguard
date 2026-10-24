import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected rendering error.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application render error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-screen">
          <div className="fatal-card" role="alert">
            <span className="fatal-mark">
              <Icon name="alert" size={22} />
            </span>
            <div>
              <h1>Something broke in the control plane.</h1>
              <p>{this.state.message}</p>
              <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
                Reload application
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
